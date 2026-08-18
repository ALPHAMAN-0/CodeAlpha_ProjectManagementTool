import type { RequestHandler } from 'express';
import { ROLE_RANK, type Role } from '@pm/shared';
import { Comment } from '../models/Comment.js';
import { List } from '../models/List.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { forbidden, notFound } from './error.js';
import { param } from '../utils/params.js';

/**
 * Resolves the caller's role in a project.
 *
 * A non-member gets 404, not 403: answering "403" would confirm the project
 * exists, which leaks the existence of other teams' boards to anyone guessing ids.
 * An insufficient *member* role does get 403, because they already know it exists.
 */
export async function assertProjectRole(
  userId: string,
  projectId: string,
  minRole: Role,
): Promise<Role> {
  const project = await Project.findById(projectId).select('members');
  if (!project) throw notFound('Project not found');

  const membership = project.members.find((m) => String(m.user) === userId);
  if (!membership) throw notFound('Project not found');

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw forbidden(`This action requires the ${minRole} role`);
  }
  return membership.role;
}

/** For routes carrying :projectId. */
export const requireProjectRole =
  (minRole: Role): RequestHandler =>
  async (req, _res, next) => {
    const projectId = param(req, 'projectId');
    const role = await assertProjectRole(req.userId!, projectId, minRole);
    req.membership = { role, projectId };
    next();
  };

/** For routes carrying :listId - loads the list and checks its project. */
export const requireListAccess =
  (minRole: Role): RequestHandler =>
  async (req, _res, next) => {
    const list = await List.findById(param(req, 'listId'));
    if (!list) throw notFound('List not found');
    const role = await assertProjectRole(req.userId!, String(list.project), minRole);
    req.membership = { role, projectId: String(list.project) };
    req.list = list;
    next();
  };

/** For routes carrying :taskId. */
export const requireTaskAccess =
  (minRole: Role): RequestHandler =>
  async (req, _res, next) => {
    const task = await Task.findById(param(req, 'taskId'));
    if (!task) throw notFound('Task not found');
    const role = await assertProjectRole(req.userId!, String(task.project), minRole);
    req.membership = { role, projectId: String(task.project) };
    req.task = task;
    next();
  };

/** For routes carrying :commentId. */
export const requireCommentAccess =
  (minRole: Role): RequestHandler =>
  async (req, _res, next) => {
    const comment = await Comment.findById(param(req, 'commentId'));
    if (!comment) throw notFound('Comment not found');
    const role = await assertProjectRole(req.userId!, String(comment.project), minRole);
    req.membership = { role, projectId: String(comment.project) };
    req.comment = comment;
    next();
  };
