import { Schema, Types, model } from 'mongoose';
import { ROLES, type Role } from '@pm/shared';

export interface IMember {
  user: Types.ObjectId;
  role: Role;
  joinedAt: Date;
}

export interface IProject {
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: IMember[];
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, required: true, default: 'member' },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
);

// Every "projects I can see" query filters on this.
projectSchema.index({ 'members.user': 1 });

export const Project = model<IProject>('Project', projectSchema);
