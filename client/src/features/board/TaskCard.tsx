import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { LABELS_BY_KEY, type TaskDTO } from '@pm/shared';
import { Avatar } from '../../components/ui';
import { DueDate } from './DueDate';

const PRIORITY_STYLES: Record<TaskDTO['priority'], string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export function TaskCard({ task, onOpen }: { task: TaskDTO; onOpen: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', listId: task.list },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dnd-draggable
      className={clsx('touch-none', isDragging && 'z-10 opacity-40')}
    >
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        {...attributes}
        {...listeners}
        className="w-full cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-slate-300 hover:shadow active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
      >
        {task.labels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {task.labels.map((key) => {
              const label = LABELS_BY_KEY[key];
              return (
                <span
                  key={key}
                  title={label?.name ?? key}
                  style={{ backgroundColor: label?.color }}
                  className="h-1.5 w-8 rounded-full"
                />
              );
            })}
          </div>
        )}

        <p className="text-sm font-medium leading-snug text-slate-800">{task.title}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {task.priority !== 'low' && (
            <span
              className={clsx(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                PRIORITY_STYLES[task.priority],
              )}
            >
              {task.priority}
            </span>
          )}

          {task.dueDate && <DueDate iso={task.dueDate} />}

          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
              <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 3c-4.418 0-8 2.9-8 6.5 0 1.7.8 3.24 2.1 4.4-.14 1.03-.5 1.94-1.03 2.66a.5.5 0 0 0 .56.77 8.3 8.3 0 0 0 3.2-1.62c1 .3 2.06.46 3.17.46 4.418 0 8-2.9 8-6.5S14.418 3 10 3Z"
                  clipRule="evenodd"
                />
              </svg>
              {task.commentCount}
            </span>
          )}

          {task.assignees.length > 0 && (
            <span className="ml-auto flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} name={a.name} color={a.avatarColor} size="xs" />
              ))}
              {task.assignees.length > 3 && (
                <span className="grid size-5 place-items-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 ring-2 ring-white">
                  +{task.assignees.length - 3}
                </span>
              )}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

/** What follows the cursor while dragging. */
export function TaskCardPreview({ task }: { task: TaskDTO }) {
  return (
    <div className="w-64 rotate-2 rounded-lg border border-indigo-300 bg-white p-2.5 shadow-xl">
      <p className="text-sm font-medium leading-snug text-slate-800">{task.title}</p>
    </div>
  );
}
