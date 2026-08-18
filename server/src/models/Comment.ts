import { Schema, Types, model } from 'mongoose';

export interface IComment {
  task: Types.ObjectId;
  /** Denormalized so the project room and authorization are reachable directly. */
  project: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

commentSchema.index({ task: 1, createdAt: 1 });

export const Comment = model<IComment>('Comment', commentSchema);
