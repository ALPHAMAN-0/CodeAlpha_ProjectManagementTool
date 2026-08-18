import { Schema, model } from 'mongoose';
import { AVATAR_COLORS } from '@pm/shared';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never loaded unless a query explicitly asks with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    avatarColor: {
      type: String,
      required: true,
      default: () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Belt and braces: even if a query selects it, it cannot serialize.
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User = model<IUser>('User', userSchema);
