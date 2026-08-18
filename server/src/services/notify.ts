import { Types } from 'mongoose';
import type { CommentDTO, NotificationType, Role, TaskDTO } from '@pm/shared';
import { Notification } from '../models/Notification.js';
import { Task } from '../models/Task.js';
import { emitToUser } from '../realtime/emit.js';
import { populated, toNotificationDTO, type NotificationShape } from '../utils/serialize.js';

const actorFields = 'name email avatarColor createdAt';

interface NotificationSeed {
  actorId: string;
  type: NotificationType;
  projectId: string | null;
  taskId?: string | null;
  commentId?: string | null;
}

/**
 * Inserts one notification per recipient and pushes each to that user's socket
 * room with their own fresh unread count.
 *
 * The actor is always filtered out: being told about something you just did
 * yourself makes the bell useless. Recipients are also de-duplicated, so being
 * both creator and assignee of a task yields one notification, not two.
 */
async function notifyMany(recipientIds: string[], seed: NotificationSeed): Promise<void> {
  const recipients = [...new Set(recipientIds)].filter((id) => id && id !== seed.actorId);
  if (recipients.length === 0) return;

  const created = await Notification.insertMany(
    recipients.map((recipient) => ({
      recipient,
      actor: seed.actorId,
      type: seed.type,
      project: seed.projectId,
      task: seed.taskId ?? null,
      comment: seed.commentId ?? null,
    })),
  );

  const hydrated = await Notification.find({ _id: { $in: created.map((c) => c._id) } })
    .populate('actor', actorFields)
    .populate('project', 'name')
    .populate('task', 'title');

  for (const doc of hydrated) {
    const unreadCount = await Notification.countDocuments({
      recipient: doc.recipient,
      read: false,
    });
    emitToUser(String(doc.recipient), 'notification:new', {
      notification: toNotificationDTO(populated<NotificationShape>(doc)),
      unreadCount,
    });
  }
}

/** Someone was added to a task's assignee list. */
export async function notifyTaskAssigned(args: {
  actorId: string;
  task: TaskDTO;
  recipientIds: string[];
}): Promise<void> {
  await notifyMany(args.recipientIds, {
    actorId: args.actorId,
    type: 'task_assigned',
    projectId: args.task.project,
    taskId: args.task.id,
  });
}

/**
 * A comment landed on a task. Everyone with a stake in that task hears about it:
 * its assignees and whoever created it.
 */
export async function notifyTaskComment(args: {
  actorId: string;
  comment: CommentDTO;
}): Promise<void> {
  const task = await Task.findById(args.comment.task).select('assignees createdBy project');
  if (!task) return;

  const stakeholders = [...task.assignees.map(String), String(task.createdBy)];

  await notifyMany(stakeholders, {
    actorId: args.actorId,
    type: 'task_comment',
    projectId: String(task.project),
    taskId: String(task._id),
    commentId: args.comment.id,
  });
}

/** You were added to a project. */
export async function notifyMemberAdded(args: {
  actorId: string;
  projectId: string;
  recipientId: string;
}): Promise<void> {
  await notifyMany([args.recipientId], {
    actorId: args.actorId,
    type: 'project_member_added',
    projectId: args.projectId,
  });
}

/** Your role in a project changed. */
export async function notifyRoleChanged(args: {
  actorId: string;
  projectId: string;
  recipientId: string;
  role: Role;
}): Promise<void> {
  await notifyMany([args.recipientId], {
    actorId: args.actorId,
    type: 'project_role_changed',
    projectId: args.projectId,
  });
}

/** Unread count for the bell badge on first load. */
export async function unreadCountFor(userId: string): Promise<number> {
  return Notification.countDocuments({ recipient: new Types.ObjectId(userId), read: false });
}
