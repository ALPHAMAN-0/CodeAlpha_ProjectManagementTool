import type {
  CommentDTO,
  ListDTO,
  MemberDTO,
  NotificationDTO,
  ProjectDTO,
  TaskDTO,
  UserDTO,
} from '@pm/shared';
import type { Priority, Role } from '@pm/shared';

type Id = { toString(): string };
const id = (value: Id | string): string => String(value);
const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/* --------------------------------------------------------------- shapes --- */
/* What each serializer needs to have been loaded/populated. Exported so call
   sites can state the shape they are asserting rather than casting to `any`. */

export interface UserShape {
  _id: Id;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: Date;
}

export interface MemberShape {
  user: UserShape;
  role: Role;
  joinedAt: Date;
}

export interface ProjectShape {
  _id: Id;
  name: string;
  description: string;
  owner: Id;
  members: MemberShape[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListShape {
  _id: Id;
  project: Id;
  title: string;
  position: number;
}

export interface TaskShape {
  _id: Id;
  project: Id;
  list: Id;
  title: string;
  description: string;
  assignees: UserShape[];
  dueDate: Date | null;
  priority: Priority;
  labels: string[];
  position: number;
  createdBy: Id;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentShape {
  _id: Id;
  task: Id;
  project: Id;
  author: UserShape;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
}

/* ---------------------------------------------------------- serializers --- */

export const toUserDTO = (user: UserShape): UserDTO => ({
  id: id(user._id),
  name: user.name,
  email: user.email,
  avatarColor: user.avatarColor,
  createdAt: iso(user.createdAt),
});

export const toMemberDTO = (member: MemberShape): MemberDTO => ({
  user: toUserDTO(member.user),
  role: member.role,
  joinedAt: iso(member.joinedAt),
});

export const toProjectDTO = (project: ProjectShape): ProjectDTO => ({
  id: id(project._id),
  name: project.name,
  description: project.description,
  owner: id(project.owner),
  members: project.members.map(toMemberDTO),
  createdAt: iso(project.createdAt),
  updatedAt: iso(project.updatedAt),
});

export const toListDTO = (list: ListShape): ListDTO => ({
  id: id(list._id),
  project: id(list.project),
  title: list.title,
  position: list.position,
});

export const toTaskDTO = (task: TaskShape): TaskDTO => ({
  id: id(task._id),
  project: id(task.project),
  list: id(task.list),
  title: task.title,
  description: task.description,
  assignees: task.assignees.map(toUserDTO),
  dueDate: task.dueDate ? iso(task.dueDate) : null,
  priority: task.priority,
  labels: task.labels,
  position: task.position,
  createdBy: id(task.createdBy),
  commentCount: task.commentCount,
  createdAt: iso(task.createdAt),
  updatedAt: iso(task.updatedAt),
});

export const toCommentDTO = (comment: CommentShape): CommentDTO => ({
  id: id(comment._id),
  task: id(comment.task),
  project: id(comment.project),
  author: toUserDTO(comment.author),
  body: comment.body,
  editedAt: comment.editedAt ? iso(comment.editedAt) : null,
  createdAt: iso(comment.createdAt),
});

/**
 * Mongoose types a populated path as its unpopulated ref type, so a document
 * that has actually been `.populate()`d does not match the shapes above. This
 * narrows at that boundary - one named cast instead of a scattering of inline
 * ones. Callers must have populated whatever paths the DTO reads.
 */
export const populated = <T>(doc: unknown): T => doc as T;

/* ------------------------------------------------------- notifications --- */

export interface NotificationShape {
  _id: Id;
  type: NotificationDTO['type'];
  actor: UserShape;
  project: { _id: Id; name: string } | null;
  task: { _id: Id; title: string } | null;
  read: boolean;
  createdAt: Date;
}

export const toNotificationDTO = (n: NotificationShape): NotificationDTO => ({
  id: id(n._id),
  type: n.type,
  actor: toUserDTO(n.actor),
  project: n.project ? { id: id(n.project._id), name: n.project.name } : null,
  task: n.task ? { id: id(n.task._id), title: n.task.title } : null,
  read: n.read,
  createdAt: iso(n.createdAt),
});
