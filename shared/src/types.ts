import type { Priority, Role } from './constants.js';

/** Public shape of a user. Never includes passwordHash. */
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export interface MemberDTO {
  user: UserDTO;
  role: Role;
  joinedAt: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  owner: string;
  members: MemberDTO[];
  createdAt: string;
  updatedAt: string;
}

/** Dashboard card: project plus cheap rollup counts. */
export interface ProjectSummaryDTO extends ProjectDTO {
  listCount: number;
  taskCount: number;
  myTaskCount: number;
}

export interface ListDTO {
  id: string;
  project: string;
  title: string;
  position: number;
}

export interface TaskDTO {
  id: string;
  project: string;
  list: string;
  title: string;
  description: string;
  assignees: UserDTO[];
  dueDate: string | null;
  priority: Priority;
  labels: string[];
  position: number;
  createdBy: string;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDTO {
  id: string;
  task: string;
  project: string;
  author: UserDTO;
  body: string;
  editedAt: string | null;
  createdAt: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_comment'
  | 'project_member_added'
  | 'project_role_changed';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  actor: UserDTO;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
  read: boolean;
  createdAt: string;
}

/** Everything the board screen needs, in one round trip. */
export interface BoardDTO {
  project: ProjectDTO;
  lists: ListDTO[];
  tasks: TaskDTO[];
}

export interface NotificationsResponse {
  notifications: NotificationDTO[];
  unreadCount: number;
}

/** Uniform error body from the API. */
export interface ApiError {
  error: string;
  details?: Array<{ path: string; message: string }>;
}
