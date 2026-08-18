import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationsResponse } from '@pm/shared';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import { getSocket } from '../../lib/socket';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<NotificationsResponse>('/notifications'),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ id: string; unreadCount: number }>(`/notifications/${id}/read`),
    onMutate: (id) => {
      // The badge should drop the instant you click, not after a round trip.
      qc.setQueryData<NotificationsResponse>(queryKeys.notifications, (old) =>
        old
          ? {
              notifications: old.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
              unreadCount: Math.max(0, old.unreadCount - 1),
            }
          : old,
      );
    },
    onSuccess: (data) =>
      qc.setQueryData<NotificationsResponse>(queryKeys.notifications, (old) =>
        old ? { ...old, unreadCount: data.unreadCount } : old,
      ),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ unreadCount: number }>('/notifications/read-all'),
    onSuccess: () =>
      qc.setQueryData<NotificationsResponse>(queryKeys.notifications, (old) =>
        old
          ? { notifications: old.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 }
          : old,
      ),
  });
}

/**
 * Pushes arriving notifications straight into the cache.
 *
 * They land on the user's own socket room, so this works on every screen - you do
 * not have to be looking at the project a notification came from.
 */
export function useNotificationStream(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const onNew = ({
      notification,
      unreadCount,
    }: {
      notification: NotificationsResponse['notifications'][number];
      unreadCount: number;
    }) => {
      qc.setQueryData<NotificationsResponse>(queryKeys.notifications, (old) =>
        old
          ? {
              notifications: [notification, ...old.notifications.filter((n) => n.id !== notification.id)],
              unreadCount,
            }
          : { notifications: [notification], unreadCount },
      );
    };

    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [qc]);
}
