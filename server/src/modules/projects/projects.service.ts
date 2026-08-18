import { Types } from 'mongoose';
import { POSITION_STEP, ROLE_RANK, type BoardDTO, type ProjectSummaryDTO, type Role } from '@pm/shared';
import { List } from '../../models/List.js';
import { Project } from '../../models/Project.js';
import { Task } from '../../models/Task.js';
import { User } from '../../models/User.js';
import { badRequest, conflict, forbidden, notFound } from '../../middleware/error.js';
import { deleteProjectCascade } from '../../services/cascade.js';
import {
  populated,
  toListDTO,
  toMemberDTO,
  toProjectDTO,
  toTaskDTO,
  type ProjectShape,
  type TaskShape,
} from '../../utils/serialize.js';

/** Columns every new board starts with, so a fresh project is usable immediately. */
const STARTER_LISTS = ['To do', 'In progress', 'Done'];

const populateMembers = 'members.user';
const memberFields = 'name email avatarColor createdAt';

export async function listProjectsForUser(userId: string): Promise<ProjectSummaryDTO[]> {
  const projects = await Project.find({ 'members.user': userId })
    .sort({ updatedAt: -1 })
    .populate(populateMembers, memberFields);

  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p._id);

  // Two aggregations instead of a count query per project - no N+1.
  const [taskCounts, listCounts] = await Promise.all([
    Task.aggregate<{ _id: Types.ObjectId; total: number; mine: number }>([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: '$project',
          total: { $sum: 1 },
          mine: {
            $sum: { $cond: [{ $in: [new Types.ObjectId(userId), '$assignees'] }, 1, 0] },
          },
        },
      },
    ]),
    List.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', total: { $sum: 1 } } },
    ]),
  ]);

  const tasksBy = new Map(taskCounts.map((c) => [String(c._id), c]));
  const listsBy = new Map(listCounts.map((c) => [String(c._id), c.total]));

  return projects.map((project) => {
    const id = String(project._id);
    const dto = toProjectDTO(populated<ProjectShape>(project));
    return {
      ...dto,
      listCount: listsBy.get(id) ?? 0,
      taskCount: tasksBy.get(id)?.total ?? 0,
      myTaskCount: tasksBy.get(id)?.mine ?? 0,
    };
  });
}

export async function createProject(
  userId: string,
  input: { name: string; description: string },
) {
  const project = await Project.create({
    name: input.name,
    description: input.description,
    owner: userId,
    members: [{ user: userId, role: 'owner', joinedAt: new Date() }],
  });

  await List.insertMany(
    STARTER_LISTS.map((title, index) => ({
      project: project._id,
      title,
      position: (index + 1) * POSITION_STEP,
    })),
  );

  await project.populate(populateMembers, memberFields);
  return toProjectDTO(populated<ProjectShape>(project));
}

/** Everything the board screen renders, in a single round trip. */
export async function getBoard(projectId: string): Promise<BoardDTO> {
  const project = await Project.findById(projectId).populate(populateMembers, memberFields);
  if (!project) throw notFound('Project not found');

  const [lists, tasks] = await Promise.all([
    List.find({ project: projectId }).sort({ position: 1 }),
    Task.find({ project: projectId })
      .sort({ position: 1 })
      .populate('assignees', memberFields),
  ]);

  return {
    project: toProjectDTO(populated<ProjectShape>(project)),
    lists: lists.map(toListDTO),
    tasks: tasks.map((t) => toTaskDTO(populated<TaskShape>(t))),
  };
}

export async function updateProject(
  projectId: string,
  input: { name?: string; description?: string },
) {
  const project = await Project.findByIdAndUpdate(projectId, { $set: input }, { new: true }).populate(
    populateMembers,
    memberFields,
  );
  if (!project) throw notFound('Project not found');
  return toProjectDTO(populated<ProjectShape>(project));
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteProjectCascade(projectId);
  await Project.deleteOne({ _id: projectId });
}

/* ------------------------------------------------------------- membership -- */

export async function addMember(
  projectId: string,
  input: { email: string; role: 'admin' | 'member' },
) {
  const project = await Project.findById(projectId);
  if (!project) throw notFound('Project not found');

  const user = await User.findOne({ email: input.email });
  if (!user) {
    throw notFound('No account with that email. They need to sign up first.');
  }

  const already = project.members.some((m) => String(m.user) === String(user._id));
  if (already) throw conflict(`${user.name} is already in this project`);

  project.members.push({ user: user._id, role: input.role, joinedAt: new Date() });
  await project.save();
  await project.populate(populateMembers, memberFields);

  const added = project.members.find((m) => String(user._id) === String(m.user._id ?? m.user))!;
  return {
    project: toProjectDTO(populated<ProjectShape>(project)),
    member: toMemberDTO({ user, role: added.role, joinedAt: added.joinedAt }),
    userId: String(user._id),
  };
}

/**
 * You may only act on a member you outrank. Without this an admin could demote or
 * eject a fellow admin, or the owner, purely by knowing their user id.
 */
function assertCanManage(actorRole: Role, targetRole: Role, action: string) {
  if (ROLE_RANK[actorRole] <= ROLE_RANK[targetRole]) {
    throw forbidden(`You cannot ${action} someone with the ${targetRole} role`);
  }
}

export async function changeMemberRole(
  projectId: string,
  actorRole: Role,
  targetUserId: string,
  role: 'admin' | 'member',
) {
  const project = await Project.findById(projectId);
  if (!project) throw notFound('Project not found');

  const member = project.members.find((m) => String(m.user) === targetUserId);
  if (!member) throw notFound('That person is not in this project');
  if (member.role === 'owner') throw badRequest("The owner's role cannot be changed");
  assertCanManage(actorRole, member.role, 'change the role of');

  member.role = role;
  await project.save();
  return { role };
}

export async function removeMember(
  projectId: string,
  actorId: string,
  actorRole: Role,
  targetUserId: string,
) {
  const project = await Project.findById(projectId);
  if (!project) throw notFound('Project not found');

  const member = project.members.find((m) => String(m.user) === targetUserId);
  if (!member) throw notFound('That person is not in this project');

  const isSelf = targetUserId === actorId;
  if (member.role === 'owner') {
    throw badRequest(
      isSelf
        ? 'The owner cannot leave. Delete the project instead.'
        : 'The project owner cannot be removed.',
    );
  }
  // Anyone may leave on their own; removing someone else needs rank.
  if (!isSelf) assertCanManage(actorRole, member.role, 'remove');

  project.members = project.members.filter((m) => String(m.user) !== targetUserId);
  await project.save();

  // Unassign them from this project's tasks so cards stop showing a stranger.
  await Task.updateMany({ project: projectId }, { $pull: { assignees: targetUserId } });

  return { isSelf };
}
