import { useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { calcPosition, type BoardDTO, type ListDTO, type Role, type TaskDTO } from '@pm/shared';
import { queryKeys } from '../../lib/queryClient';
import { patchTask, sortedLists, tasksInList } from './cache';
import { Column } from './Column';
import { AddListForm } from './AddListForm';
import { TaskCardPreview } from './TaskCard';
import {
  useCreateList,
  useCreateTask,
  useDeleteList,
  useMoveList,
  useMoveTask,
  useRenameList,
} from './hooks';

type DragTarget = { listId: string; index: number } | null;

export function Board({
  board,
  myRole,
  onOpenTask,
}: {
  board: BoardDTO;
  myRole: Role;
  onOpenTask: (taskId: string) => void;
}) {
  const projectId = board.project.id;
  const qc = useQueryClient();
  const boardKey = queryKeys.board(projectId);

  const createList = useCreateList(projectId);
  const renameList = useRenameList(projectId);
  const deleteList = useDeleteList(projectId);
  const moveList = useMoveList(projectId);
  const createTask = useCreateTask(projectId);
  const moveTask = useMoveTask(projectId);

  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);
  const [activeList, setActiveList] = useState<ListDTO | null>(null);

  /**
   * The board exactly as it looked before the drag began.
   *
   * onDragOver rewrites the cache to preview a cross-column move, so by the time
   * the request fires the mutation's own snapshot already contains that preview -
   * rolling back to it would leave the card in the wrong column. Restoring this
   * instead undoes the whole gesture.
   */
  const preDragBoard = useRef<BoardDTO | null>(null);
  const dragOrigin = useRef<DragTarget>(null);

  const sensors = useSensors(
    // A few pixels of travel before dragging starts, so clicking a card to open
    // it still works.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const lists = sortedLists(board);

  const readBoard = () => qc.getQueryData<BoardDTO>(boardKey) ?? board;

  /** Which list is under the cursor, whether over a card or over empty column space. */
  const listIdFromOver = (over: DragOverEvent['over']): string | null => {
    const data = over?.data.current;
    if (!data) return null;
    if (data.type === 'task') return (data.listId as string) ?? null;
    if (data.type === 'list-drop') return (data.listId as string) ?? null;
    if (data.type === 'column') return String(over!.id);
    return null;
  };

  const onDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    const current = readBoard();
    preDragBoard.current = current;

    if (type === 'task') {
      const task = current.tasks.find((t) => t.id === event.active.id) ?? null;
      setActiveTask(task);
      if (task) {
        dragOrigin.current = {
          listId: task.list,
          index: tasksInList(current, task.list).findIndex((t) => t.id === task.id),
        };
      }
    } else if (type === 'column') {
      setActiveList(current.lists.find((l) => l.id === event.active.id) ?? null);
      dragOrigin.current = {
        listId: String(event.active.id),
        index: sortedLists(current).findIndex((l) => l.id === event.active.id),
      };
    }
  };

  /** Live preview: while dragging across columns, the card follows the cursor. */
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== 'task') return;

    const targetListId = listIdFromOver(over);
    if (!targetListId) return;

    const current = readBoard();
    const dragged = current.tasks.find((t) => t.id === active.id);
    if (!dragged || dragged.list === targetListId) return; // same column: settled on drop

    const targetTasks = tasksInList(current, targetListId);
    let prev: number | null;
    let next: number | null;

    if (over.data.current?.type === 'task') {
      const overIndex = targetTasks.findIndex((t) => t.id === over.id);
      prev = targetTasks[overIndex - 1]?.position ?? null;
      next = targetTasks[overIndex]?.position ?? null;
    } else {
      prev = targetTasks[targetTasks.length - 1]?.position ?? null;
      next = null;
    }

    qc.setQueryData<BoardDTO>(
      boardKey,
      patchTask(current, dragged.id, {
        list: targetListId,
        position: calcPosition(prev, next),
      }),
    );
  };

  const restorePreDrag = () => {
    if (preDragBoard.current) qc.setQueryData(boardKey, preDragBoard.current);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const type = active.data.current?.type;
    setActiveTask(null);
    setActiveList(null);

    // Dropped outside any target - undo the preview and do nothing.
    if (!over) {
      restorePreDrag();
      dragOrigin.current = null;
      return;
    }

    const current = readBoard();

    if (type === 'column') {
      const ordered = sortedLists(current);
      const fromIndex = ordered.findIndex((l) => l.id === active.id);
      const overListId = listIdFromOver(over) ?? String(over.id);
      const toIndex = ordered.findIndex((l) => l.id === overListId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        dragOrigin.current = null;
        return;
      }

      const without = ordered.filter((l) => l.id !== active.id);
      const insertAt = toIndex;
      const prev = without[insertAt - 1] ?? null;
      const next = without[insertAt] ?? null;

      moveList.mutate(
        {
          listId: String(active.id),
          prevListId: prev?.id ?? null,
          nextListId: next?.id ?? null,
          position: calcPosition(prev?.position ?? null, next?.position ?? null),
        },
        { onError: restorePreDrag },
      );
      dragOrigin.current = null;
      return;
    }

    if (type !== 'task') return;

    const targetListId = listIdFromOver(over) ?? current.tasks.find((t) => t.id === active.id)?.list;
    if (!targetListId) {
      restorePreDrag();
      return;
    }

    // Neighbours are read from the list *without* the dragged card, which is what
    // the server will do too.
    const withoutDragged = tasksInList(current, targetListId).filter((t) => t.id !== active.id);
    let insertAt: number;
    if (over.data.current?.type === 'task' && over.id !== active.id) {
      const overIndex = withoutDragged.findIndex((t) => t.id === over.id);
      // Dragging downward lands after the hovered card, upward lands before it.
      const origin = dragOrigin.current;
      const movingDown =
        origin?.listId === targetListId &&
        origin.index <= tasksInList(current, targetListId).findIndex((t) => t.id === over.id);
      insertAt = overIndex === -1 ? withoutDragged.length : movingDown ? overIndex + 1 : overIndex;
    } else {
      insertAt = withoutDragged.length;
    }

    const origin = dragOrigin.current;
    dragOrigin.current = null;

    const prev = withoutDragged[insertAt - 1] ?? null;
    const next = withoutDragged[insertAt] ?? null;

    // Nothing actually changed - skip the request rather than write a no-op.
    if (origin && origin.listId === targetListId && origin.index === insertAt) {
      restorePreDrag();
      return;
    }

    moveTask.mutate(
      {
        taskId: String(active.id),
        listId: targetListId,
        prevTaskId: prev?.id ?? null,
        nextTaskId: next?.id ?? null,
        prevPosition: prev?.position ?? null,
        nextPosition: next?.position ?? null,
      },
      { onError: restorePreDrag },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        restorePreDrag();
        setActiveTask(null);
        setActiveList(null);
        dragOrigin.current = null;
      }}
    >
      <div className="flex h-full items-start gap-3 overflow-x-auto px-4 pb-4 sm:px-6">
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          {lists.map((list) => (
            <Column
              key={list.id}
              list={list}
              tasks={tasksInList(board, list.id)}
              myRole={myRole}
              onOpenTask={onOpenTask}
              onRename={(title) => renameList.mutate({ listId: list.id, title })}
              onDelete={() => deleteList.mutate({ listId: list.id })}
              isAdding={createTask.isPending}
              onAddTask={async (title) => {
                await createTask.mutateAsync({ listId: list.id, title });
              }}
            />
          ))}
        </SortableContext>

        <AddListForm
          pending={createList.isPending}
          onSubmit={async (title) => {
            await createList.mutateAsync({ title });
          }}
        />
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeTask ? (
          <TaskCardPreview task={activeTask} />
        ) : activeList ? (
          <div className="w-72 rotate-1 rounded-xl bg-slate-200 p-3 shadow-xl">
            <p className="text-sm font-semibold text-slate-700">{activeList.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
