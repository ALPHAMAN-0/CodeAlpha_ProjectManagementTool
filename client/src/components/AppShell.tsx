import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Avatar } from './ui';
import { Logo } from './Logo';
import { useLogout, useMe } from '../features/auth/hooks';
import { disconnectSocket } from '../lib/socket';
import { NotificationBell } from '../features/notifications/NotificationBell';
import { useConnection } from '../features/realtime/useConnection';
import { ConnectionBadge } from './ConnectionBadge';

/** Header + page frame shared by every signed-in screen. */
export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  // Opening the socket here means every signed-in screen is live, and the badge
  // reflects one shared connection rather than a per-screen one.
  const connection = useConnection();

  const signOut = async () => {
    await logout.mutateAsync();
    // Drop the socket too - it authenticates from the cookie we just cleared.
    disconnectSocket();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/" className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          <ConnectionBadge state={connection} />
          <NotificationBell />

          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="ml-1 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                <Avatar name={user.name} color={user.avatarColor} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                  <DropdownMenu.Item
                    onSelect={() => void signOut()}
                    className="cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                  >
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </header>

      <main className={wide ? 'min-h-0 flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6'}>
        {children}
      </main>
    </div>
  );
}
