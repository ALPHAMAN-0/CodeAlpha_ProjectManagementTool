import { useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { ListDTO, Role, TaskDTO } from '@pm/shared';
import { ROLE_RANK } from '@pm/shared';
import { Button, Input } from '../../components/ui';
import { TaskCard } from './TaskCard';
import { AddCardForm } from './AddCardForm';

export function Column({
  list,
  tasks,
  myRole,
  onOpenTask,
  onRename,
  onDelete,
  onAddTask,
  isAdding,
}: {
  list: ListDTO;
  tasks: TaskDTO[];
  myRole: Role;
  onOpenTask: (taskId: string) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddTask: (title: string) => Promise<void>;
  isAdding: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(list.title);
  const [adding, setAdding] = useState(false);

  const canDelete = ROLE_RANK[myRole] >= ROLE_RANK.admin;

  // The column itself is sortable (horizontally), so boards can be rearranged.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'column' },
  });

  // A separate droppable covering the card area, so an empty column is still a
  // valid drop target - without this you cannot drag a card into an empty list.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `list-drop-${list.id}`,
    data: { type: 'list-drop', listId: list.id },
  });

  const submitRename = () => {
    const title = draft.trim();
    setRenaming(false);
    if (title && title !== list.title) onRename(title);
    else setDraft(list.title);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx('flex w-72 shrink-0 flex-col', isDragging && 'opacity-50')}
    >
      <div className="flex max-h-full flex-col rounded-xl bg-slate-200/70">
        <div className="flex items-center gap-1 px-3 pt-3 pb-2">
          {renaming ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') {
                  setDraft(list.title);
                  setRenaming(false);
                }
              }}
              className="h-7 py-1 text-sm font-semibold"
            />
          ) : (
            <button
              type="button"
              {...attributes}
              {...listeners}
              onDoubleClick={() => setRenaming(true)}
              title="Drag to reorder, double-click to rename"
              className="flex-1 cursor-grab truncate text-left text-sm font-semibold text-slate-700 active:cursor-grabbing"
            >
              {list.title}
              <span className="ml-1.5 font-normal text-slate-500">{tasks.length}</span>
            </button>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label={`${list.title} options`}
              className="rounded p-1 text-slate-500 hover:bg-slate-300/60 hover:text-slate-700"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M10 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
              </svg>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
              >
                <DropdownMenu.Item
                  onSelect={() => setRenaming(true)}
                  className="cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                >
                  Rename column
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setAdding(true)}
                  className="cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                >
                  Add a card
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item
                  disabled={!canDelete}
                  onSelect={() => {
                    if (!canDelete) return;
                    const message = tasks.length
                      ? `Delete "${list.title}" and its ${tasks.length} card${tasks.length === 1 ? '' : 's'}? This cannot be undone.`
                      : `Delete "${list.title}"?`;
                    if (window.confirm(message)) onDelete();
                  }}
                  className="cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-red-600 outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-red-50 data-[disabled]:text-slate-400"
                >
                  {canDelete ? 'Delete column' : 'Delete (admins only)'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div
          ref={setDropRef}
          className={clsx(
            'min-h-2 flex-1 overflow-y-auto px-2 pb-1 transition-colors',
            isOver && 'bg-indigo-100/60',
          )}
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
              ))}
            </ul>
          </SortableContext>

          {tasks.length === 0 && !adding && (
            <p className="px-1 py-4 text-center text-xs text-slate-500">Drop cards here</p>
          )}
        </div>

        <div className="p-2 pt-1">
          {adding ? (
            <AddCardForm
              onCancel={() => setAdding(false)}
              onSubmit={async (title) => {
                await onAddTask(title);
              }}
              pending={isAdding}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-600"
              onClick={() => setAdding(true)}
            >
              + Add a card
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
