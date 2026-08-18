import { Router } from 'express';
import { objectId } from '@pm/shared';
import {
  addMemberSchema,
  createProjectSchema,
  updateMemberRoleSchema,
  updateProjectSchema,
} from '@pm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { requireProjectRole } from '../../middleware/projectAccess.js';
import { validateBody } from '../../middleware/validate.js';
import { badRequest, forbidden } from '../../middleware/error.js';
import { param } from '../../utils/params.js';
import { emitToProject, originSocketId } from '../../realtime/emit.js';
import { notifyMemberAdded, notifyRoleChanged } from '../../services/notify.js';
import {
  addMember,
  changeMemberRole,
  createProject,
  deleteProject,
  getBoard,
  listProjectsForUser,
  removeMember,
  updateProject,
} from './projects.service.js';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get('/', async (req, res) => {
  res.json({ projects: await listProjectsForUser(req.userId!) });
});

projectsRouter.post('/', validateBody(createProjectSchema), async (req, res) => {
  res.status(201).json({ project: await createProject(req.userId!, req.body) });
});

// Any member may read the board.
projectsRouter.get('/:projectId', requireProjectRole('member'), async (req, res) => {
  res.json(await getBoard(param(req, 'projectId')));
});

projectsRouter.patch(
  '/:projectId',
  requireProjectRole('admin'),
  validateBody(updateProjectSchema),
  async (req, res) => {
    const projectId = param(req, 'projectId');
    const project = await updateProject(projectId, req.body);
    emitToProject(projectId, originSocketId(req), 'project:updated', { project });
    res.json({ project });
  },
);

projectsRouter.delete('/:projectId', requireProjectRole('owner'), async (req, res) => {
  const projectId = param(req, 'projectId');
  await deleteProject(projectId);
  // Sent to everyone including the deleter's other tabs - they must all leave.
  emitToProject(projectId, null, 'project:deleted', { projectId });
  res.status(204).end();
});

/* ------------------------------------------------------------- membership -- */

projectsRouter.post(
  '/:projectId/members',
  requireProjectRole('admin'),
  validateBody(addMemberSchema),
  async (req, res) => {
    const projectId = param(req, 'projectId');
    const result = await addMember(projectId, req.body);

    emitToProject(projectId, originSocketId(req), 'member:added', {
      projectId,
      member: result.member,
    });
    await notifyMemberAdded({
      actorId: req.userId!,
      projectId,
      recipientId: result.userId,
    });

    res.status(201).json({ project: result.project, member: result.member });
  },
);

projectsRouter.patch(
  '/:projectId/members/:userId',
  requireProjectRole('admin'),
  validateBody(updateMemberRoleSchema),
  async (req, res) => {
    const targetUserId = param(req, 'userId');
    if (!objectId.safeParse(targetUserId).success) throw badRequest('Invalid user id');

    const projectId = param(req, 'projectId');
    const result = await changeMemberRole(
      projectId,
      req.membership!.role,
      targetUserId,
      req.body.role,
    );

    emitToProject(projectId, originSocketId(req), 'member:roleChanged', {
      projectId,
      userId: targetUserId,
      role: result.role,
    });
    await notifyRoleChanged({
      actorId: req.userId!,
      projectId,
      recipientId: targetUserId,
      role: result.role,
    });

    res.json({ userId: targetUserId, role: result.role });
  },
);

/** Also the "leave project" route: removing yourself needs no elevated role. */
projectsRouter.delete(
  '/:projectId/members/:userId',
  requireProjectRole('member'),
  async (req, res) => {
    const targetUserId = param(req, 'userId');
    if (!objectId.safeParse(targetUserId).success) throw badRequest('Invalid user id');

    // Removing someone else is an admin action; leaving on your own is not.
    if (targetUserId !== req.userId && req.membership!.role === 'member') {
      throw forbidden('Only admins can remove other members');
    }

    const projectId = param(req, 'projectId');
    await removeMember(projectId, req.userId!, req.membership!.role, targetUserId);

    emitToProject(projectId, originSocketId(req), 'member:removed', { projectId, userId: targetUserId });
    res.status(204).end();
  },
);
