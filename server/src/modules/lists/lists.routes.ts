import { Router } from 'express';
import { createListSchema, moveListSchema, updateListSchema } from '@pm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { requireListAccess, requireProjectRole } from '../../middleware/projectAccess.js';
import { validateBody } from '../../middleware/validate.js';
import { List } from '../../models/List.js';
import { deleteListCascade } from '../../services/cascade.js';
import { emitToProject, originSocketId } from '../../realtime/emit.js';
import { toListDTO } from '../../utils/serialize.js';
import { param } from '../../utils/params.js';
import {
  calcPosition,
  needsRenormalize,
  nextListPosition,
  renormalizeLists,
} from '../../utils/position.js';

/** Mounted at /api/projects/:projectId/lists - creation is project-scoped. */
export const projectListsRouter = Router({ mergeParams: true });

projectListsRouter.use(requireAuth);

projectListsRouter.post(
  '/',
  requireProjectRole('member'),
  validateBody(createListSchema),
  async (req, res) => {
    const projectId = param(req, 'projectId');
    const list = await List.create({
      project: projectId,
      title: req.body.title,
      position: await nextListPosition(projectId),
    });

    const dto = toListDTO(list);
    emitToProject(projectId, originSocketId(req), 'list:created', { list: dto });
    res.status(201).json({ list: dto });
  },
);

/** Mounted at /api/lists - operates on an existing list. */
export const listsRouter = Router();

listsRouter.use(requireAuth);

listsRouter.patch(
  '/:listId',
  requireListAccess('member'),
  validateBody(updateListSchema),
  async (req, res) => {
    const list = req.list!;
    list.title = req.body.title;
    await list.save();

    const dto = toListDTO(list);
    emitToProject(String(list.project), originSocketId(req), 'list:updated', { list: dto });
    res.json({ list: dto });
  },
);

listsRouter.patch(
  '/:listId/move',
  requireListAccess('member'),
  validateBody(moveListSchema),
  async (req, res) => {
    const list = req.list!;
    const projectId = String(list.project);

    // Neighbour positions are read here, now - never taken from the client - so a
    // stale board cannot write a position that collides with a concurrent move.
    // A neighbour that has since moved away simply resolves to null.
    const neighbourIds = [req.body.prevListId, req.body.nextListId].filter(
      (id): id is string => typeof id === 'string',
    );
    const neighbours = await List.find({
      _id: { $in: neighbourIds },
      project: projectId,
    }).select('position');
    const positionOf = (id: string | null | undefined) =>
      neighbours.find((n) => String(n._id) === id)?.position ?? null;

    const prev = positionOf(req.body.prevListId);
    const next = positionOf(req.body.nextListId);

    list.position = calcPosition(prev, next);
    await list.save();

    const dto = toListDTO(list);
    const socketId = originSocketId(req);
    emitToProject(projectId, socketId, 'list:updated', { list: dto });

    // Floats ran out of room in this gap - rewrite the whole board's ordering.
    if (needsRenormalize(prev, next)) {
      const positions = await renormalizeLists(projectId);
      emitToProject(projectId, null, 'lists:renormalized', { projectId, positions });
      return res.json({ list: dto, renormalized: positions });
    }

    res.json({ list: dto });
  },
);

/** Deleting a column destroys its cards, so it needs more than member. */
listsRouter.delete('/:listId', requireListAccess('admin'), async (req, res) => {
  const list = req.list!;
  const projectId = String(list.project);
  const listId = String(list._id);

  await deleteListCascade(listId);

  emitToProject(projectId, originSocketId(req), 'list:deleted', { listId });
  res.status(204).end();
});
