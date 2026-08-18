import { useState } from 'react';
import { ROLE_RANK, type CommentDTO, type Role } from '@pm/shared';
import { Avatar, Button, Spinner, Textarea } from '../../components/ui';
import { relativeTime } from '../../lib/time';
import { useAddComment, useComments, useDeleteComment, useEditComment } from './hooks';

export function CommentThread({
  projectId,
  taskId,
  myUserId,
  myRole,
}: {
  projectId: string;
  taskId: string;
  myUserId: string;
  myRole: Role;
}) {
  const { data: comments, isPending, error } = useComments(taskId);
  const add = useAddComment(projectId, taskId);
  const edit = useEditComment(taskId);
  const remove = useDeleteComment(projectId, taskId);
  const [draft, setDraft] = useState('');

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await add.mutateAsync(body);
  };

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Comments {comments?.length ? `(${comments.length})` : ''}
      </h3>

      <div className="mt-3 space-y-4">
        {isPending ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Spinner className="size-4" /> Loading comments
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error.message}</p>
        ) : comments && comments.length > 0 ? (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                canEdit={comment.author.id === myUserId}
                canDelete={
                  comment.author.id === myUserId || ROLE_RANK[myRole] >= ROLE_RANK.admin
                }
                onSave={(body) => edit.mutate({ commentId: comment.id, body })}
                onDelete={() => {
                  if (window.confirm('Delete this comment?')) remove.mutate(comment.id);
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No comments yet. Start the conversation.</p>
        )}
      </div>

      <div className="mt-4">
        <Textarea
          rows={3}
          value={draft}
          placeholder="Write a comment... (Ctrl+Enter to send)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" loading={add.isPending} disabled={!draft.trim()} onClick={() => void submit()}>
            Comment
          </Button>
        </div>
      </div>
    </section>
  );
}

function CommentRow({
  comment,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  comment: CommentDTO;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (body: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  return (
    <li className="flex gap-2.5">
      <Avatar name={comment.author.name} color={comment.author.avatarColor} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-800">{comment.author.name}</span>
          <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-xs text-slate-400">(edited)</span>}
        </div>

        {editing ? (
          <div className="mt-1.5">
            <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="mt-1.5 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const body = draft.trim();
                  if (body && body !== comment.body) onSave(body);
                  setEditing(false);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700">
              {comment.body}
            </p>
            {(canEdit || canDelete) && (
              <div className="mt-1 flex gap-3 text-xs">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="text-slate-500 hover:text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
