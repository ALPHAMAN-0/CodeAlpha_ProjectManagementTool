import type { BoardDTO, ListDTO, PositionPatch, TaskDTO } from '@pm/shared';

/**
 * Pure helpers for patching a cached board.
 *
 * Both optimistic mutations and inbound socket events go through these, so a
 * change applied locally and the same change arriving from another user produce
 * identical state.
 */

export const tasksInList = (board: BoardDTO, listId: string): TaskDTO[] =>
  board.tasks.filter((t) => t.list === listId).sort((a, b) => a.position - b.position);

export const sortedLists = (board: BoardDTO): ListDTO[] =>
  [...board.lists].sort((a, b) => a.position - b.position);

export const upsertTask = (board: BoardDTO, task: TaskDTO): BoardDTO => {
  const exists = board.tasks.some((t) => t.id === task.id);
  return {
    ...board,
    tasks: exists ? board.tasks.map((t) => (t.id === task.id ? task : t)) : [...board.tasks, task],
  };
};

export const patchTask = (
  board: BoardDTO,
  taskId: string,
  patch: Partial<TaskDTO>,
): BoardDTO => ({
  ...board,
  tasks: board.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
});

export const removeTask = (board: BoardDTO, taskId: string): BoardDTO => ({
  ...board,
  tasks: board.tasks.filter((t) => t.id !== taskId),
});

export const upsertList = (board: BoardDTO, list: ListDTO): BoardDTO => {
  const exists = board.lists.some((l) => l.id === list.id);
  return {
    ...board,
    lists: exists ? board.lists.map((l) => (l.id === list.id ? list : l)) : [...board.lists, list],
  };
};

/** Dropping a column takes its cards with it, mirroring the server's cascade. */
export const removeList = (board: BoardDTO, listId: string): BoardDTO => ({
  ...board,
  lists: board.lists.filter((l) => l.id !== listId),
  tasks: board.tasks.filter((t) => t.list !== listId),
});

export const applyTaskPositions = (board: BoardDTO, patches: PositionPatch[]): BoardDTO => {
  const by = new Map(patches.map((p) => [p.id, p.position]));
  return {
    ...board,
    tasks: board.tasks.map((t) => (by.has(t.id) ? { ...t, position: by.get(t.id)! } : t)),
  };
};

export const applyListPositions = (board: BoardDTO, patches: PositionPatch[]): BoardDTO => {
  const by = new Map(patches.map((p) => [p.id, p.position]));
  return {
    ...board,
    lists: board.lists.map((l) => (by.has(l.id) ? { ...l, position: by.get(l.id)! } : l)),
  };
};

/**
 * The neighbours a dropped item lands between, as ids the server can resolve.
 * `items` must already exclude the item being moved.
 */
export function neighboursAt<T extends { id: string }>(
  items: T[],
  index: number,
): { prevId: string | null; nextId: string | null } {
  return {
    prevId: items[index - 1]?.id ?? null,
    nextId: items[index]?.id ?? null,
  };
}
