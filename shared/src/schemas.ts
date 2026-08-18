import { z } from 'zod';
import { LABEL_KEYS, PRIORITIES, ROLES } from './constants.js';

/** Mongo ObjectId as it appears over the wire. */
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

const password = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(72, 'must be at most 72 characters') // bcrypt truncates beyond 72 bytes
  .regex(/[A-Za-z]/, 'must contain a letter')
  .regex(/[0-9]/, 'must contain a number');

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'must be a valid date');

/* ---------------------------------------------------------------- auth ---- */

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('must be a valid email'),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('must be a valid email'),
  password: z.string().min(1, 'is required'),
});

/* ------------------------------------------------------------ projects ---- */

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'is required').max(80),
  description: z.string().trim().max(500).default(''),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to update');

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('must be a valid email'),
  role: z.enum(['admin', 'member']).default('member'),
});

/** Ownership transfer is out of scope, so 'owner' is not assignable here. */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

/* --------------------------------------------------------------- lists ---- */

export const createListSchema = z.object({
  title: z.string().trim().min(1, 'is required').max(60),
});

export const updateListSchema = z.object({
  title: z.string().trim().min(1).max(60),
});

/**
 * Moves are expressed as neighbours, not as a position number: the server reads
 * the neighbours' current positions and computes the midpoint at write time, so
 * a stale client cannot write a position that collides with a concurrent move.
 */
export const moveListSchema = z.object({
  prevListId: objectId.nullish(),
  nextListId: objectId.nullish(),
});

/* --------------------------------------------------------------- tasks ---- */

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'is required').max(200),
  description: z.string().trim().max(5000).default(''),
  assignees: z.array(objectId).max(20).default([]),
  dueDate: isoDate.nullish(),
  priority: z.enum(PRIORITIES).default('medium'),
  labels: z.array(z.enum(LABEL_KEYS as unknown as [string, ...string[]])).max(6).default([]),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    assignees: z.array(objectId).max(20).optional(),
    dueDate: isoDate.nullish(),
    priority: z.enum(PRIORITIES).optional(),
    labels: z.array(z.enum(LABEL_KEYS as unknown as [string, ...string[]])).max(6).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to update');

export const moveTaskSchema = z.object({
  list: objectId,
  prevTaskId: objectId.nullish(),
  nextTaskId: objectId.nullish(),
});

/* ------------------------------------------------------------ comments ---- */

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'is required').max(2000),
});

export const updateCommentSchema = createCommentSchema;

/* ------------------------------------------------------------- queries ---- */

export const userSearchSchema = z.object({
  q: z.string().trim().min(1, 'is required').max(80),
});

/* --------------------------------------------------------------- types ---- */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type MoveListInput = z.infer<typeof moveListSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type RoleName = (typeof ROLES)[number];

/**
 * Request-body types as a *client* sees them: fields with schema defaults are
 * optional here, because the server fills them in. The `*Input` types above are
 * the parsed output, which is what handlers receive.
 */
export type CreateProjectBody = z.input<typeof createProjectSchema>;
export type AddMemberBody = z.input<typeof addMemberSchema>;
export type CreateTaskBody = z.input<typeof createTaskSchema>;
export type UpdateTaskBody = z.input<typeof updateTaskSchema>;
