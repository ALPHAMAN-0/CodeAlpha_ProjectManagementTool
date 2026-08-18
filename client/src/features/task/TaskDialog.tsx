import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import {
  LABELS_BY_KEY,
  LABEL_PALETTE,
  PRIORITIES,
  ROLE_RANK,
  type BoardDTO,
  type Role,
  type TaskDTO,
} from '@pm/shared';
import { Modal } from '../../components/Modal';
import { Avatar, Button, Input, Textarea } from '../../components/ui';
import { useDeleteTask, useUpdateTask } from '../board/hooks';
import { CommentThread } from './CommentThread';
import { useMe } from '../auth/hooks';
import { relativeTime } from '../../lib/time';

/**
 * The card detail view. Reads the task from the board cache rather than
 * refetching, so it opens instantly and stays live as socket events arrive.
 */
export function TaskDialog({
  taskId,
  board,
  myRole,
  onClose,
}: {
  taskId: string;
  board: BoardDTO;
  myRole: Role;
  onClose: () => void;
}) {
  const { user } = useMe();
  const projectId = board.project.id;
  const update = useUpdateTask(projectId);
  const remove = useDeleteTask(projectId);

  const task = board.tasks.find((t) => t.id === taskId);
  const list = board.lists.find((l) => l.id === task?.list);

  // Another user deleting this card while it is open should close it, not leave
  // an empty shell behind.
  useEffect(() => {
    if (!task) onClose();
  }, [task, onClose]);

  if (!task || !user) return null;

  const canDelete = task.createdBy === user.id || ROLE_RANK[myRole] >= ROLE_RANK.admin;
  const save = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  return (
    <Modal open onOpenChange={(next) => !next && onClose()} title={task.title} size="lg">
      <div className="grid gap-6 sm:grid-cols-[1fr_13rem]">
        <div className="min-w-0 space-y-6">
          <TitleField task={task} onSave={(title) => save({ taskId, title })} />
          <DescriptionField task={task} onSave={(description) => save({ taskId, description })} />
          <CommentThread
            projectId={projectId}
            taskId={taskId}
            myUserId={user.id}
            myRole={myRole}
          />
        </div>

        <aside className="space-y-5 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Column</p>
            <p className="mt-1 text-slate-700">{list?.title ?? 'Unknown'}</p>
          </div>

          <AssigneePicker
            task={task}
            board={board}
            onChange={(assignees) => save({ taskId, assignees })}
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</p>
            <div className="mt-1.5 flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => save({ taskId, priority: p })}
                  className={clsx(
                    'flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition',
                    task.priority === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</p>
            <Input
              type="date"
              className="mt-1.5"
              value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onChange={(e) =>
                save({
                  taskId,
                  dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </div>

          <LabelPicker task={task} onChange={(labels) => save({ taskId, labels })} />

          <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
            <p>Created {relativeTime(task.createdAt)}</p>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start text-red-600"
                onClick={() => {
                  if (!window.confirm('Delete this card? This cannot be undone.')) return;
                  remove.mutate({ taskId });
                  onClose();
                }}
              >
                Delete card
              </Button>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function TitleField({ task, onSave }: { task: TaskDTO; onSave: (title: string) => void }) {
  const [draft, setDraft] = useState(task.title);
  useEffect(() => setDraft(task.title), [task.title]);

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
      <Input
        className="mt-1.5 font-medium"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const value = draft.trim();
          if (value && value !== task.title) onSave(value);
          else setDraft(task.title);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setDraft(task.title);
        }}
      />
    </div>
  );
}

function DescriptionField({
  task,
  onSave,
}: {
  task: TaskDTO;
  onSave: (description: string) => void;
}) {
  const [draft, setDraft] = useState(task.description);
  useEffect(() => setDraft(task.description), [task.description]);

  const dirty = draft.trim() !== task.description;

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Description
      </label>
      <Textarea
        rows={4}
        className="mt-1.5"
        placeholder="Add more detail..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {dirty && (
        <div className="mt-1.5 flex gap-2">
          <Button size="sm" onClick={() => onSave(draft.trim())}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(task.description)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/** Only project members can be assigned, matching the server's rule. */
function AssigneePicker({
  task,
  board,
  onChange,
}: {
  task: TaskDTO;
  board: BoardDTO;
  onChange: (assignees: string[]) => void;
}) {
  const assigned = new Set(task.assignees.map((a) => a.id));

  const toggle = (userId: string) => {
    const next = new Set(assigned);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    onChange([...next]);
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignees</p>
      <Popover.Root>
        <Popover.Trigger className="mt-1.5 flex w-full items-center gap-2 rounded-md bg-slate-100 px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-200">
          {task.assignees.length === 0 ? (
            <span className="text-slate-500">Nobody yet</span>
          ) : (
            <span className="flex -space-x-1.5">
              {task.assignees.map((a) => (
                <Avatar key={a.id} name={a.name} color={a.avatarColor} size="xs" />
              ))}
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400">Edit</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-60 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            {board.project.members.map((m) => (
              <button
                key={m.user.id}
                type="button"
                onClick={() => toggle(m.user.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100"
              >
                <Avatar name={m.user.name} color={m.user.avatarColor} size="sm" />
                <span className="min-w-0 flex-1 truncate">{m.user.name}</span>
                {assigned.has(m.user.id) && (
                  <svg viewBox="0 0 20 20" className="size-4 text-indigo-600" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function LabelPicker({ task, onChange }: { task: TaskDTO; onChange: (labels: string[]) => void }) {
  const active = new Set(task.labels);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Labels</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {LABEL_PALETTE.map((label) => {
          const on = active.has(label.key);
          return (
            <button
              key={label.key}
              type="button"
              onClick={() => {
                const next = new Set(active);
                if (on) next.delete(label.key);
                else next.add(label.key);
                onChange([...next]);
              }}
              style={on ? { backgroundColor: label.color, color: 'white' } : undefined}
              className={clsx(
                'rounded px-1.5 py-0.5 text-xs font-medium transition',
                !on && 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {LABELS_BY_KEY[label.key]?.name ?? label.key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
