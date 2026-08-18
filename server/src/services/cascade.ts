import { Comment } from '../models/Comment.js';
import { List } from '../models/List.js';
import { Notification } from '../models/Notification.js';
import { Task } from '../models/Task.js';

/**
 * MongoDB has no foreign keys, so deletes cascade here.
 *
 * Deliberately not wrapped in a transaction: transactions need a replica set,
 * which the local development mongod is not, and having dev take a different code
 * path from production is worse than the failure mode being guarded against.
 * Children are removed before parents, so a mid-way failure can only ever leave
 * unreachable orphans (a comment whose task is gone), never a dangling reference
 * that breaks a read.
 */
export async function deleteTaskCascade(taskId: string): Promise<void> {
  await Comment.deleteMany({ task: taskId });
  await Notification.deleteMany({ task: taskId });
  await Task.deleteOne({ _id: taskId });
}

export async function deleteListCascade(listId: string): Promise<string[]> {
  const tasks = await Task.find({ list: listId }).select('_id');
  const taskIds = tasks.map((t) => String(t._id));

  if (taskIds.length > 0) {
    await Comment.deleteMany({ task: { $in: taskIds } });
    await Notification.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ _id: { $in: taskIds } });
  }
  await List.deleteOne({ _id: listId });
  return taskIds;
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  await Comment.deleteMany({ project: projectId });
  await Task.deleteMany({ project: projectId });
  await List.deleteMany({ project: projectId });
  await Notification.deleteMany({ project: projectId });
}
