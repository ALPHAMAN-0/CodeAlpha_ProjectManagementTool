import type { TaskDTO } from '@pm/shared';
import { Project } from '../../models/Project.js';
import { Task } from '../../models/Task.js';
import { badRequest } from '../../middleware/error.js';
import { populated, toTaskDTO, type TaskShape } from '../../utils/serialize.js';

const memberFields = 'name email avatarColor createdAt';

/**
 * Assignees must be members of the task's project.
 *
 * Without this check any member could assign work to any user id in the system,
 * which would leak names and avatars of unrelated people onto the board and send
 * them notifications about a project they cannot open.
 */
export async function assertAssigneesAreMembers(
  projectId: string,
  assignees: string[],
): Promise<void> {
  if (assignees.length === 0) return;

  const project = await Project.findById(projectId).select('members');
  if (!project) throw badRequest('Project not found');

  const memberIds = new Set(project.members.map((m) => String(m.user)));
  const strangers = assignees.filter((id) => !memberIds.has(id));
  if (strangers.length > 0) {
    throw badRequest('You can only assign tasks to people in this project');
  }
}

/** Reloads a task with assignees populated, ready to serialize or broadcast. */
export async function loadTaskDTO(taskId: string): Promise<TaskDTO> {
  const task = await Task.findById(taskId).populate('assignees', memberFields);
  if (!task) throw badRequest('Task not found');
  return toTaskDTO(populated<TaskShape>(task));
}
