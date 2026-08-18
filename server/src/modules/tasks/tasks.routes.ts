import { Router } from 'express';
import { ROLE_RANK, createTaskSchema, moveTaskSchema, updateTaskSchema } from '@pm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { requireListAccess, requireTaskAccess } from '../../middleware/projectAccess.js';
import { validateBody } from '../../middleware/validate.js';
import { forbidden, notFound } from '../../middleware/error.js';
import { List } from '../../models/List.js';
import { Task } from '../../models/Task.js';
import { deleteTaskCascade } from '../../services/cascade.js';
import { emitToProject, originSocketId } from '../../realtime/emit.js';
import { notifyTaskAssigned } from '../../services/notify.js';
import { param } from '../../utils/params.js';
import {
  calcPosition,
  needsRenormalize,
  nextTaskPosition,
  renormalizeTasks,
} from '../../utils/position.js';
import { assertAssigneesAreMembers, loadTaskDTO } from './tasks.service.js';

/** Mounted at /api/lists/:listId/tasks. */
export const listTasksRouter = Router({ mergeParams: true });

listTasksRouter.use(requireAuth);

listTasksRouter.post(
  '/',
  requireListAccess('member'),
  validateBody(createTaskSchema),
  async (req, res) => {
    const list = req.list!;
    const projectId = String(list.project);

    await assertAssigneesAreMembers(projectId, req.body.assignees);

    const task = await Task.create({
      project: projectId,
      list: list._id,
      title: req.body.title,
      description: req.body.description,
      assignees: req.body.assignees,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      priority: req.body.priority,
      labels: req.body.labels,
      position: await nextTaskPosition(String(list._id)),
      createdBy: req.userId,
    });

    const dto = await loadTaskDTO(String(task._id));
    emitToProject(projectId, originSocketId(req), 'task:created', { task: dto });
    await notifyTaskAssigned({
      actorId: req.userId!,
      task: dto,
      recipientIds: req.body.assignees,
    });

    res.status(201).json({ task: dto });
  },
);

/** Mounted at /api/tasks. */
export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get('/:taskId', requireTaskAccess('member'), async (req, res) => {
  res.json({ task: await loadTaskDTO(String(req.task!._id)) });
});

tasksRouter.patch(
  '/:taskId',
  requireTaskAccess('member'),
  validateBody(updateTaskSchema),
  async (req, res) => {
    const task = req.task!;
    const projectId = String(task.project);
    const body = req.body as Record<string, unknown>;

    if (Array.isArray(body.assignees)) {
      await assertAssigneesAreMembers(projectId, body.assignees as string[]);
    }

    // Who is newly assigned, so only they get notified.
    const before = new Set(task.assignees.map(String));

    if (typeof body.title === 'string') task.title = body.title;
    if (typeof body.description === 'string') task.description = body.description;
    if (typeof body.priority === 'string') task.priority = body.priority as typeof task.priority;
    if (Array.isArray(body.labels)) task.labels = body.labels as string[];
    if (Array.isArray(body.assignees)) task.set('assignees', body.assignees);
    if ('dueDate' in body) {
      task.dueDate = body.dueDate ? new Date(body.dueDate as string) : null;
    }
    await task.save();

    const dto = await loadTaskDTO(String(task._id));
    emitToProject(projectId, originSocketId(req), 'task:updated', { task: dto });

    const newlyAssigned = dto.assignees.map((a) => a.id).filter((id) => !before.has(id));
    await notifyTaskAssigned({ actorId: req.userId!, task: dto, recipientIds: newlyAssigned });

    res.json({ task: dto });
  },
);

tasksRouter.patch(
  '/:taskId/move',
  requireTaskAccess('member'),
  validateBody(moveTaskSchema),
  async (req, res) => {
    const task = req.task!;
    const projectId = String(task.project);
    const fromList = String(task.list);
    const targetListId = req.body.list as string;

    // The destination column must belong to the same project - otherwise a member
    // of two projects could drag a card from one board into the other.
    const targetList = await List.findOne({ _id: targetListId, project: projectId });
    if (!targetList) throw notFound('List not found in this project');

    const neighbourIds = [req.body.prevTaskId, req.body.nextTaskId].filter(
      (id): id is string => typeof id === 'string',
    );
    const neighbours = await Task.find({
      _id: { $in: neighbourIds },
      list: targetListId,
    }).select('position');
    const positionOf = (id: string | null | undefined) =>
      neighbours.find((n) => String(n._id) === id)?.position ?? null;

    const prev = positionOf(req.body.prevTaskId);
    const next = positionOf(req.body.nextTaskId);

    task.list = targetList._id;
    task.position = calcPosition(prev, next);
    await task.save();

    const dto = await loadTaskDTO(String(task._id));
    const socketId = originSocketId(req);
    emitToProject(projectId, socketId, 'task:moved', { task: dto, fromList });

    if (needsRenormalize(prev, next)) {
      const positions = await renormalizeTasks(targetListId);
      // Sent to everyone, including the mover: their optimistic positions are
      // now wrong too.
      emitToProject(projectId, null, 'tasks:renormalized', { listId: targetListId, positions });
      return res.json({ task: dto, renormalized: positions });
    }

    res.json({ task: dto });
  },
);

/** Your own cards are yours to delete; anyone else's needs admin. */
tasksRouter.delete('/:taskId', requireTaskAccess('member'), async (req, res) => {
  const task = req.task!;
  const isCreator = String(task.createdBy) === req.userId;
  if (!isCreator && ROLE_RANK[req.membership!.role] < ROLE_RANK.admin) {
    throw forbidden('Only the person who created this task, or an admin, can delete it');
  }

  const projectId = String(task.project);
  const listId = String(task.list);
  const taskId = param(req, 'taskId');

  await deleteTaskCascade(taskId);

  emitToProject(projectId, originSocketId(req), 'task:deleted', { taskId, listId });
  res.status(204).end();
});
