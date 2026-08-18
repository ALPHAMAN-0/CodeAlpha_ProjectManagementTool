import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { BoardDTO, CommentDTO, ServerToClientEvents, UserDTO } from '@pm/shared';
import { getSocket } from '../../lib/socket';
import { queryKeys } from '../../lib/queryClient';
import {
  applyListPositions,
  applyTaskPositions,
  patchTask,
  removeList,
  removeTask,
  upsertList,
  upsertTask,
} from '../board/cache';

/**
 * Subscribes a board to live updates.
 *
 * Inbound events patch the cache through the same helpers the local mutations
 * use, so a change made here and the same change arriving from another user end
 * up as identical state. The server never echoes an event back to the tab that
 * caused it, so optimistic updates are not applied twice.
 */
export function useBoardRealtime(
  projectId: string,
  onPresence?: (users: UserDTO[]) => void,
): void {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    const boardKey = queryKeys.board(projectId);

    const patchBoard = (fn: (board: BoardDTO) => BoardDTO) => {
      const current = qc.getQueryData<BoardDTO>(boardKey);
      if (current) qc.setQueryData<BoardDTO>(boardKey, fn(current));
    };

    const join = () => socket.emit('project:join', projectId);

    /**
     * After a dropped connection we cannot know what we missed, so rather than
     * trusting a patched-up cache we refetch the board and rejoin the room.
     */
    const onReconnect = () => {
      join();
      void qc.invalidateQueries({ queryKey: boardKey });
    };

    const handlers: Partial<ServerToClientEvents> = {
      'list:created': ({ list }) => patchBoard((b) => upsertList(b, list)),
      'list:updated': ({ list }) => patchBoard((b) => upsertList(b, list)),
      'list:deleted': ({ listId }) => patchBoard((b) => removeList(b, listId)),
      'lists:renormalized': ({ positions }) =>
        patchBoard((b) => applyListPositions(b, positions)),

      'task:created': ({ task }) => patchBoard((b) => upsertTask(b, task)),
      'task:updated': ({ task }) => patchBoard((b) => upsertTask(b, task)),
      'task:moved': ({ task }) => patchBoard((b) => upsertTask(b, task)),
      'task:deleted': ({ taskId }) => patchBoard((b) => removeTask(b, taskId)),
      'tasks:renormalized': ({ positions }) =>
        patchBoard((b) => applyTaskPositions(b, positions)),

      'comment:created': ({ comment, commentCount }) => {
        patchBoard((b) => patchTask(b, comment.task, { commentCount }));
        qc.setQueryData<{ comments: CommentDTO[] }>(queryKeys.comments(comment.task), (old) =>
          // Guard against a duplicate if the thread was refetched in between.
          old
            ? old.comments.some((c) => c.id === comment.id)
              ? old
              : { comments: [...old.comments, comment] }
            : old,
        );
      },
      'comment:updated': ({ comment }) => {
        qc.setQueryData<{ comments: CommentDTO[] }>(queryKeys.comments(comment.task), (old) =>
          old
            ? { comments: old.comments.map((c) => (c.id === comment.id ? comment : c)) }
            : old,
        );
      },
      'comment:deleted': ({ commentId, taskId, commentCount }) => {
        patchBoard((b) => patchTask(b, taskId, { commentCount }));
        qc.setQueryData<{ comments: CommentDTO[] }>(queryKeys.comments(taskId), (old) =>
          old ? { comments: old.comments.filter((c) => c.id !== commentId) } : old,
        );
      },

      'project:updated': ({ project }) => patchBoard((b) => ({ ...b, project })),
      'project:deleted': () => {
        toast.info('This project was deleted');
        navigate('/', { replace: true });
      },

      // Membership changes alter who can be assigned, so refetch the board.
      'member:added': () => void qc.invalidateQueries({ queryKey: boardKey }),
      'member:roleChanged': () => void qc.invalidateQueries({ queryKey: boardKey }),
      'member:removed': ({ userId }) => {
        const me = qc.getQueryData<{ user: UserDTO }>(queryKeys.me)?.user;
        if (me && me.id === userId) {
          toast.info('You were removed from this project');
          navigate('/', { replace: true });
          return;
        }
        void qc.invalidateQueries({ queryKey: boardKey });
      },

      'presence:update': ({ users }) => onPresence?.(users),
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event as keyof ServerToClientEvents, handler as never);
    }
    socket.on('connect', onReconnect);

    if (socket.connected) join();

    return () => {
      socket.emit('project:leave', projectId);
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event as keyof ServerToClientEvents, handler as never);
      }
      socket.off('connect', onReconnect);
    };
    // onPresence is intentionally not a dependency: it is a stable setter from
    // the caller, and re-subscribing on every render would thrash the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, qc, navigate]);
}
