import type http from 'node:http';
import { parse as parseCookie } from 'cookie';
import { Server } from 'socket.io';
import {
  roomForProject,
  roomForUser,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@pm/shared';
import { env } from '../config/env.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { toUserDTO, type UserShape } from '../utils/serialize.js';
import { setIo, type AppServer } from './emit.js';

let io: AppServer | null = null;

export function initRealtime(httpServer: http.Server): AppServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(httpServer, {
    // Same origin in every environment, so no CORS configuration is needed.
    serveClient: false,
    pingTimeout: 20_000,
  });

  /**
   * Authentication happens once, at the handshake, from the same httpOnly cookie
   * the REST API uses. An unauthenticated socket is rejected outright rather than
   * connected and filtered later.
   */
  io.use((socket, next) => {
    const header = socket.handshake.headers.cookie;
    if (!header) return next(new Error('unauthenticated'));

    const token = parseCookie(header)[env.COOKIE_NAME];
    if (!token) return next(new Error('unauthenticated'));

    // Imported lazily to keep this module free of a cycle through utils/token.
    void import('../utils/token.js').then(({ verifyToken }) => {
      const userId = verifyToken(token);
      if (!userId) return next(new Error('unauthenticated'));
      socket.data.userId = userId;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    // Personal room: notifications follow the user across every open tab.
    void socket.join(roomForUser(userId));

    socket.on('project:join', async (projectId: string) => {
      // A socket id is not authorization: membership is re-checked here, because
      // a client could ask to join any room id it likes.
      const project = await Project.findById(projectId).select('members').catch(() => null);
      const isMember = project?.members.some((m) => String(m.user) === userId);
      if (!isMember) return;

      await socket.join(roomForProject(projectId));
      await broadcastPresence(projectId);
    });

    socket.on('project:leave', async (projectId: string) => {
      await socket.leave(roomForProject(projectId));
      await broadcastPresence(projectId);
    });

    socket.on('disconnecting', () => {
      // socket.rooms still includes the project rooms at this point.
      for (const room of socket.rooms) {
        if (room.startsWith('project:')) {
          const projectId = room.slice('project:'.length);
          // Deferred so the socket has actually left before we count the room.
          setTimeout(() => void broadcastPresence(projectId), 0);
        }
      }
    });
  });

  setIo(io);
  return io;
}

/** Tells a board who is currently looking at it. */
async function broadcastPresence(projectId: string): Promise<void> {
  if (!io) return;

  const sockets = await io.in(roomForProject(projectId)).fetchSockets();
  const userIds = [...new Set(sockets.map((s) => s.data.userId).filter(Boolean))];

  const users = userIds.length > 0 ? await User.find({ _id: { $in: userIds } }) : [];
  io.to(roomForProject(projectId)).emit('presence:update', {
    projectId,
    users: users.map((u) => toUserDTO(u as unknown as UserShape)),
  });
}

export async function shutdownRealtime(): Promise<void> {
  if (!io) return;
  await io.close();
  setIo(null);
  io = null;
}
