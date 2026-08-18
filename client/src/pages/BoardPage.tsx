import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ROLE_RANK } from '@pm/shared';
import { AppShell } from '../components/AppShell';
import { Avatar, Button, EmptyState, FullPageSpinner } from '../components/ui';
import { useMe } from '../features/auth/hooks';
import { useBoard } from '../features/board/hooks';
import { Board } from '../features/board/Board';
import { MembersPanel } from '../features/board/MembersPanel';
import { TaskDialog } from '../features/task/TaskDialog';
import { useDeleteProject } from '../features/projects/hooks';
import { ApiError } from '../lib/api';
import { useBoardRealtime } from '../features/realtime/useBoardRealtime';
import type { UserDTO } from '@pm/shared';

export default function BoardPage() {
  const { projectId = '' } = useParams();
  const { user } = useMe();
  const navigate = useNavigate();
  const { data: board, isPending, error } = useBoard(projectId);
  const [showMembers, setShowMembers] = useState(false);
  const [viewers, setViewers] = useState<UserDTO[]>([]);
  const deleteProject = useDeleteProject();

  // Stable identity so the subscription is not torn down every render.
  const onPresence = useCallback((users: UserDTO[]) => setViewers(users), []);
  useBoardRealtime(projectId, onPresence);

  // Deep-linkable: /projects/:id?task=:taskId opens straight into a card.
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');

  const setOpenTask = (taskId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (taskId) next.set('task', taskId);
    else next.delete('task');
    setSearchParams(next, { replace: true });
  };

  if (isPending) {
    return (
      <AppShell>
        <div className="h-96">
          <FullPageSpinner label="Loading board" />
        </div>
      </AppShell>
    );
  }

  if (error || !board) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <AppShell>
        <EmptyState
          title={missing ? 'This board is not available' : "We couldn't load this board"}
          description={
            missing
              ? "It may have been deleted, or you may no longer be a member of it."
              : error?.message
          }
          action={
            <Link to="/">
              <Button>Back to your projects</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const myRole = board.project.members.find((m) => m.user.id === user?.id)?.role ?? 'member';
  const isOwner = ROLE_RANK[myRole] >= ROLE_RANK.owner;

  return (
    <AppShell wide>
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
                Projects
              </Link>
              <span className="text-slate-300">/</span>
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                {board.project.name}
              </h1>
            </div>
            {board.project.description && (
              <p className="mt-0.5 truncate text-sm text-slate-500">{board.project.description}</p>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-slate-200/70"
              title="Manage people"
            >
              <span className="flex -space-x-1.5">
                {board.project.members.slice(0, 4).map((m) => (
                  <Avatar key={m.user.id} name={m.user.name} color={m.user.avatarColor} size="sm" />
                ))}
              </span>
              {board.project.members.length > 4 && (
                <span className="text-xs text-slate-500">+{board.project.members.length - 4}</span>
              )}
            </button>

            {viewers.length > 1 && (
              <span
                className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex"
                title={viewers.map((v) => v.name).join(', ')}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {viewers.length} viewing
              </span>
            )}

            <Button variant="secondary" size="sm" onClick={() => setShowMembers(true)}>
              People
            </Button>

            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => {
                  if (!window.confirm(`Delete "${board.project.name}" and everything in it?`)) return;
                  deleteProject.mutate(projectId, {
                    onSuccess: () => {
                      toast.success('Project deleted');
                      navigate('/', { replace: true });
                    },
                    onError: (e) => toast.error("Couldn't delete it", { description: e.message }),
                  });
                }}
              >
                Delete project
              </Button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Board board={board} myRole={myRole} onOpenTask={(id) => setOpenTask(id)} />
        </div>
      </div>

      <MembersPanel
        open={showMembers}
        onOpenChange={setShowMembers}
        project={board.project}
        myRole={myRole}
        myUserId={user?.id ?? ''}
      />

      {openTaskId && (
        <TaskDialog
          taskId={openTaskId}
          board={board}
          myRole={myRole}
          onClose={() => setOpenTask(null)}
        />
      )}
    </AppShell>
  );
}
