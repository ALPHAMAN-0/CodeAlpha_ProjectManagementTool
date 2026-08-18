import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@pm/shared';
import { setSocketId } from './api';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * One socket for the whole tab.
 *
 * It authenticates with the same httpOnly auth cookie as the REST API - nothing
 * is passed in a query string - so there is no second credential to manage or
 * leak into logs.
 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({
      withCredentials: true,
      // Long-poll first, then upgrade: works even where a proxy blocks the
      // upgrade outright, instead of failing to connect at all.
      transports: ['polling', 'websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
    });

    // Mutations carry this id so the server can skip echoing back to us.
    socket.on('connect', () => setSocketId(socket?.id ?? null));
    socket.on('disconnect', () => setSocketId(null));
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  setSocketId(null);
}
