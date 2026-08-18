import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BoardDTO, CommentDTO } from '@pm/shared';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import { patchTask } from '../board/cache';

export function useComments(taskId: string) {
  return useQuery({
    queryKey: queryKeys.comments(taskId),
    queryFn: () => api.get<{ comments: CommentDTO[] }>(`/tasks/${taskId}/comments`),
    select: (data) => data.comments,
  });
}

/** Keeps the card's comment badge in step with the thread. */
function useSyncCommentCount(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return (commentCount: number) => {
    const board = qc.getQueryData<BoardDTO>(queryKeys.board(projectId));
    if (board) {
      qc.setQueryData(queryKeys.board(projectId), patchTask(board, taskId, { commentCount }));
    }
  };
}

export function useAddComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  const syncCount = useSyncCommentCount(projectId, taskId);

  return useMutation({
    mutationFn: (body: string) =>
      api.post<{ comment: CommentDTO; commentCount: number }>(`/tasks/${taskId}/comments`, { body }),
    onSuccess: (data) => {
      qc.setQueryData<{ comments: CommentDTO[] }>(queryKeys.comments(taskId), (old) =>
        old ? { comments: [...old.comments, data.comment] } : { comments: [data.comment] },
      );
      syncCount(data.commentCount);
    },
    onError: (e) => toast.error("Couldn't post that comment", { description: e.message }),
  });
}

export function useEditComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { commentId: string; body: string }) =>
      api.patch<{ comment: CommentDTO }>(`/comments/${vars.commentId}`, { body: vars.body }),
    onSuccess: (data) => {
      qc.setQueryData<{ comments: CommentDTO[] }>(queryKeys.comments(taskId), (old) =>
        old
          ? { comments: old.comments.map((c) => (c.id === data.comment.id ? data.comment : c)) }
          : old,
      );
    },
    onError: (e) => toast.error("Couldn't save that edit", { description: e.message }),
  });
}

export function useDeleteComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  const syncCount = useSyncCommentCount(projectId, taskId);

  return useMutation({
    mutationFn: (commentId: string) => api.del<void>(`/comments/${commentId}`),
    onSuccess: (_data, commentId) => {
      let remaining = 0;
      qc.setQueryData<{ comments: CommentDTO[] }>(queryKeys.comments(taskId), (old) => {
        if (!old) return old;
        const comments = old.comments.filter((c) => c.id !== commentId);
        remaining = comments.length;
        return { comments };
      });
      syncCount(remaining);
    },
    onError: (e) => toast.error("Couldn't delete that comment", { description: e.message }),
  });
}
