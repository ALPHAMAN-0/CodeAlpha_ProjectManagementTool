import * as Popover from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { NotificationDTO } from '@pm/shared';
import { Avatar, Button, Spinner } from '../../components/ui';
import { relativeTime } from '../../lib/time';
import { useMarkAllRead, useMarkRead, useNotifications, useNotificationStream } from './hooks';

/** Human sentence for each notification type. */
function describe(n: NotificationDTO): string {
  switch (n.type) {
    case 'task_assigned':
      return `assigned you "${n.task?.title ?? 'a task'}"`;
    case 'task_comment':
      return `commented on "${n.task?.title ?? 'a task'}"`;
    case 'project_member_added':
      return `added you to ${n.project?.name ?? 'a project'}`;
    case 'project_role_changed':
      return `changed your role in ${n.project?.name ?? 'a project'}`;
    default:
      return 'sent you an update';
  }
}

export function NotificationBell() {
  const { data, isPending } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();
  useNotificationStream();

  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const open = (n: NotificationDTO) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.project && n.task) navigate(`/projects/${n.project.id}?task=${n.task.id}`);
    else if (n.project) navigate(`/projects/${n.project.id}`);
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="currentColor" aria-hidden="true">
          <path d="M10 2a5 5 0 0 0-5 5v2.6c0 .5-.2 1-.55 1.36L3.4 12.02A1 1 0 0 0 4.1 13.7h11.8a1 1 0 0 0 .7-1.7l-1.05-1.05A1.9 1.9 0 0 1 15 9.6V7a5 5 0 0 0-5-5ZM7.75 15.2a2.5 2.5 0 0 0 4.5 0h-4.5Z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {unread > 0 && (
              <Button
                size="sm"
                variant="ghost"
                loading={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isPending ? (
              <div className="flex items-center gap-2 p-4 text-sm text-slate-400">
                <Spinner className="size-4" /> Loading
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Nothing yet. You&apos;ll hear about assignments and comments here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={clsx(
                        'flex w-full gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50',
                        !n.read && 'bg-indigo-50/60',
                      )}
                    >
                      <Avatar
                        name={n.actor.name}
                        color={n.actor.avatarColor}
                        size="sm"
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug text-slate-700">
                          <span className="font-medium text-slate-900">{n.actor.name}</span>{' '}
                          {describe(n)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-500" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
