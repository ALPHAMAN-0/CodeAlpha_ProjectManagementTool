import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  calcPosition,
  type BoardDTO,
  type CreateListInput,
  type CreateTaskBody,
  type ListDTO,
  type TaskDTO,
  type UpdateTaskBody,
} from '@pm/shared';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import {
  applyListPositions,
  applyTaskPositions,
  patchTask,
  removeList,
  removeTask,
  upsertList,
  upsertTask,
} from './cache';

export function useBoard(projectId: string) {
  return useQuery({
    queryKey: queryKeys.board(projectId),
    queryFn: () => api.get<BoardDTO>(`/projects/${projectId}`),
  });
}

/**
 * Shared plumbing for board mutations: snapshot the board, apply the optimistic
 * change, and put the snapshot back if the request fails.
 */
function useBoardMutation<TVars, TData>(
  projectId: string,
  options: {
    request: (vars: TVars) => Promise<TData>;
    optimistic?: (board: BoardDTO, vars: TVars) => BoardDTO;
    settle?: (board: BoardDTO, data: TData, vars: TVars) => BoardDTO;
    errorMessage: string;
  },
) {
  const qc = useQueryClient();
  const key = queryKeys.board(projectId);

  return useMutation({
    mutationFn: options.request,
    onMutate: async (vars) => {
      if (!options.optimistic) return { previous: undefined };
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<BoardDTO>(key);
      if (previous) qc.setQueryData<BoardDTO>(key, options.optimistic(previous, vars));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      toast.error(options.errorMessage, { description: error.message });
    },
    onSuccess: (data, vars) => {
      if (!options.settle) return;
      const current = qc.getQueryData<BoardDTO>(key);
      if (current) qc.setQueryData<BoardDTO>(key, options.settle(current, data, vars));
    },
  });
}

/* ---------------------------------------------------------------- lists --- */

export function useCreateList(projectId: string) {
  return useBoardMutation<CreateListInput, { list: ListDTO }>(projectId, {
    request: (input) => api.post(`/projects/${projectId}/lists`, input),
    settle: (board, data) => upsertList(board, data.list),
    errorMessage: "Couldn't add that column",
  });
}

export function useRenameList(projectId: string) {
  return useBoardMutation<{ listId: string; title: string }, { list: ListDTO }>(projectId, {
    request: ({ listId, title }) => api.patch(`/lists/${listId}`, { title }),
    optimistic: (board, { listId, title }) => ({
      ...board,
      lists: board.lists.map((l) => (l.id === listId ? { ...l, title } : l)),
    }),
    settle: (board, data) => upsertList(board, data.list),
    errorMessage: "Couldn't rename that column",
  });
}

export function useDeleteList(projectId: string) {
  return useBoardMutation<{ listId: string }, void>(projectId, {
    request: ({ listId }) => api.del(`/lists/${listId}`),
    optimistic: (board, { listId }) => removeList(board, listId),
    errorMessage: "Couldn't delete that column",
  });
}

export function useMoveList(projectId: string) {
  return useBoardMutation<
    { listId: string; prevListId: string | null; nextListId: string | null; position: number },
    { list: ListDTO; renormalized?: { id: string; position: number }[] }
  >(projectId, {
    request: ({ listId, prevListId, nextListId }) =>
      api.patch(`/lists/${listId}/move`, { prevListId, nextListId }),
    optimistic: (board, { listId, position }) => ({
      ...board,
      lists: board.lists.map((l) => (l.id === listId ? { ...l, position } : l)),
    }),
    settle: (board, data) => {
      const next = upsertList(board, data.list);
      return data.renormalized ? applyListPositions(next, data.renormalized) : next;
    },
    errorMessage: "Couldn't move that column",
  });
}

/* ---------------------------------------------------------------- tasks --- */

export function useCreateTask(projectId: string) {
  return useBoardMutation<{ listId: string } & CreateTaskBody, { task: TaskDTO }>(projectId, {
    request: ({ listId, ...body }) => api.post(`/lists/${listId}/tasks`, body),
    settle: (board, data) => upsertTask(board, data.task),
    errorMessage: "Couldn't add that card",
  });
}

export function useUpdateTask(projectId: string) {
  return useBoardMutation<{ taskId: string } & UpdateTaskBody, { task: TaskDTO }>(projectId, {
    request: ({ taskId, ...body }) => api.patch(`/tasks/${taskId}`, body),
    settle: (board, data) => upsertTask(board, data.task),
    errorMessage: "Couldn't save that change",
  });
}

export function useDeleteTask(projectId: string) {
  return useBoardMutation<{ taskId: string }, void>(projectId, {
    request: ({ taskId }) => api.del(`/tasks/${taskId}`),
    optimistic: (board, { taskId }) => removeTask(board, taskId),
    errorMessage: "Couldn't delete that card",
  });
}

/**
 * A card move. The optimistic position uses the same midpoint function the server
 * will apply, so the card settles exactly where it was dropped instead of
 * twitching when the response lands.
 */
export function useMoveTask(projectId: string) {
  return useBoardMutation<
    {
      taskId: string;
      listId: string;
      prevTaskId: string | null;
      nextTaskId: string | null;
      prevPosition: number | null;
      nextPosition: number | null;
    },
    { task: TaskDTO; renormalized?: { id: string; position: number }[] }
  >(projectId, {
    request: ({ taskId, listId, prevTaskId, nextTaskId }) =>
      api.patch(`/tasks/${taskId}/move`, { list: listId, prevTaskId, nextTaskId }),
    optimistic: (board, vars) =>
      patchTask(board, vars.taskId, {
        list: vars.listId,
        position: calcPosition(vars.prevPosition, vars.nextPosition),
      }),
    settle: (board, data) => {
      const next = upsertTask(board, data.task);
      return data.renormalized ? applyTaskPositions(next, data.renormalized) : next;
    },
    errorMessage: "Couldn't move that card",
  });
}
