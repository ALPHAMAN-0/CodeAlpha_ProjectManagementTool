import type {
  CommentDTO,
  ListDTO,
  MemberDTO,
  NotificationDTO,
  ProjectDTO,
  TaskDTO,
  UserDTO,
} from './types.js';
import type { Role } from './constants.js';

export interface PositionPatch {
  id: string;
  position: number;
}

/**
 * Broadcast-only: the server emits these, the client never does. Every mutation
 * is a REST call, so authorization lives in exactly one place.
 */
export interface ServerToClientEvents {
  'list:created': (p: { list: ListDTO }) => void;
  'list:updated': (p: { list: ListDTO }) => void;
  'list:deleted': (p: { listId: string }) => void;
  'lists:renormalized': (p: { projectId: string; positions: PositionPatch[] }) => void;

  'task:created': (p: { task: TaskDTO }) => void;
  'task:updated': (p: { task: TaskDTO }) => void;
  'task:moved': (p: { task: TaskDTO; fromList: string }) => void;
  'task:deleted': (p: { taskId: string; listId: string }) => void;
  'tasks:renormalized': (p: { listId: string; positions: PositionPatch[] }) => void;

  'comment:created': (p: { comment: CommentDTO; commentCount: number }) => void;
  'comment:updated': (p: { comment: CommentDTO }) => void;
  'comment:deleted': (p: { commentId: string; taskId: string; commentCount: number }) => void;

  'project:updated': (p: { project: ProjectDTO }) => void;
  'project:deleted': (p: { projectId: string }) => void;
  'member:added': (p: { projectId: string; member: MemberDTO }) => void;
  'member:removed': (p: { projectId: string; userId: string }) => void;
  'member:roleChanged': (p: { projectId: string; userId: string; role: Role }) => void;

  'notification:new': (p: { notification: NotificationDTO; unreadCount: number }) => void;
  'presence:update': (p: { projectId: string; users: UserDTO[] }) => void;
}

export interface ClientToServerEvents {
  'project:join': (projectId: string) => void;
  'project:leave': (projectId: string) => void;
}

export interface SocketData {
  userId: string;
}

export const roomForUser = (userId: string) => `user:${userId}`;
export const roomForProject = (projectId: string) => `project:${projectId}`;
