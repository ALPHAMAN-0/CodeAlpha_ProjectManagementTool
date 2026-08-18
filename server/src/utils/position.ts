import { POSITION_STEP, calcPosition, type PositionPatch } from '@pm/shared';
import { List } from '../models/List.js';
import { Task } from '../models/Task.js';

/**
 * Ordering helpers that touch the database. The midpoint maths itself lives in
 * @pm/shared so the client can predict the same result for optimistic drags.
 *
 * Positions are always computed on the server from the neighbours' *current*
 * positions - never accepted from the client - so a stale board cannot write a
 * position that collides with a concurrent move.
 */
export { calcPosition, needsRenormalize } from '@pm/shared';

/** Rewrites every task position in a list to a clean multiple of POSITION_STEP. */
export async function renormalizeTasks(listId: string): Promise<PositionPatch[]> {
  const tasks = await Task.find({ list: listId }).sort({ position: 1, _id: 1 }).select('_id');
  const patches = tasks.map((task, index) => ({
    id: String(task._id),
    position: (index + 1) * POSITION_STEP,
  }));
  if (patches.length > 0) {
    await Task.bulkWrite(
      patches.map((p) => ({
        updateOne: { filter: { _id: p.id }, update: { $set: { position: p.position } } },
      })),
    );
  }
  return patches;
}

/** Same, for the columns of a board. */
export async function renormalizeLists(projectId: string): Promise<PositionPatch[]> {
  const lists = await List.find({ project: projectId }).sort({ position: 1, _id: 1 }).select('_id');
  const patches = lists.map((list, index) => ({
    id: String(list._id),
    position: (index + 1) * POSITION_STEP,
  }));
  if (patches.length > 0) {
    await List.bulkWrite(
      patches.map((p) => ({
        updateOne: { filter: { _id: p.id }, update: { $set: { position: p.position } } },
      })),
    );
  }
  return patches;
}

/** Position for a new item appended to the end of a column (or board). */
export async function nextTaskPosition(listId: string): Promise<number> {
  const last = await Task.findOne({ list: listId }).sort({ position: -1 }).select('position');
  return calcPosition(last?.position ?? null, null);
}

export async function nextListPosition(projectId: string): Promise<number> {
  const last = await List.findOne({ project: projectId }).sort({ position: -1 }).select('position');
  return calcPosition(last?.position ?? null, null);
}
