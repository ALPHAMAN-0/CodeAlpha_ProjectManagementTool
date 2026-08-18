import { SOCKET_ID_HEADER } from '@pm/shared';
import type { ApiError as ApiErrorBody } from '@pm/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: ApiErrorBody['details'],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-keyed messages, for surfacing server validation next to inputs. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.details ?? []).map((d) => [d.path, d.message]));
  }
}

/**
 * The live socket id, sent on mutations so the server can broadcast to everyone
 * *except* this tab - otherwise the actor applies its own change twice.
 */
let socketId: string | null = null;
export const setSocketId = (id: string | null) => {
  socketId = id;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (socketId && method !== 'GET') headers[SOCKET_ID_HEADER] = socketId;

  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as (ApiErrorBody & T) | null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};
