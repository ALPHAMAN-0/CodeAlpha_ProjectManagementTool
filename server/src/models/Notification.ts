import { Schema, Types, model } from 'mongoose';
import type { NotificationType } from '@pm/shared';

const TYPES: NotificationType[] = [
  'task_assigned',
  'task_comment',
  'project_member_added',
  'project_role_changed',
];

export interface INotification {
  recipient: Types.ObjectId;
  actor: Types.ObjectId;
  type: NotificationType;
  project: Types.ObjectId | null;
  task: Types.ObjectId | null;
  comment: Types.ObjectId | null;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    task: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    read: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

// Serves both the unread badge count and the newest-first dropdown.
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
