import { Schema, Types, model } from 'mongoose';
import { LABEL_KEYS, PRIORITIES, type Priority } from '@pm/shared';

export interface ITask {
  project: Types.ObjectId;
  list: Types.ObjectId;
  title: string;
  description: string;
  assignees: Types.ObjectId[];
  dueDate: Date | null;
  priority: Priority;
  labels: string[];
  position: number;
  createdBy: Types.ObjectId;
  /** Denormalized so board cards can show a comment count without a join. */
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    // Denormalized from list.project so authorization and board queries are one hop.
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    list: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    assignees: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: PRIORITIES, required: true, default: 'medium' },
    labels: { type: [{ type: String, enum: LABEL_KEYS }], default: [] },
    position: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    commentCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

taskSchema.index({ list: 1, position: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ assignees: 1 });

export const Task = model<ITask>('Task', taskSchema);
