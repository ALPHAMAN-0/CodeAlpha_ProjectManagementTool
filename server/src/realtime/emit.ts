import type { Request } from 'express';
import type { Server } from 'socket.io';
import {
  SOCKET_ID_HEADER,
  roomForProject,
  roomForUser,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@pm/shared';

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

let io: AppServer | null = null;

/** Called by realtime/io.ts once the Socket.IO server exists. */
export const setIo = (server: AppServer | null): void => {
  io = server;
};

/**
 * The socket id of the tab that made this request, if any.
 *
 * Mutating clients apply their change optimistically, so echoing the broadcast
 * back to the originator would apply it twice - a card visibly jumping back and
 * forth. Every emit therefore excludes this socket.
 */
export function originSocketId(req: Request): string | null {
  const header = req.header(SOCKET_ID_HEADER);
  return header && header.length > 0 ? header : null;
}

/** Broadcast to everyone viewing a project, except the tab that caused it. */
export function emitToProject<E extends keyof ServerToClientEvents>(
  projectId: string,
  exceptSocketId: string | null,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  if (!io) return;
  const room = io.to(roomForProject(projectId));
  const target = exceptSocketId ? room.except(exceptSocketId) : room;
  target.emit(event, ...args);
}

/** Broadcast to every tab a given user has open (notifications). */
export function emitToUser<E extends keyof ServerToClientEvents>(
  userId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void {
  if (!io) return;
  io.to(roomForUser(userId)).emit(event, ...args);
}
