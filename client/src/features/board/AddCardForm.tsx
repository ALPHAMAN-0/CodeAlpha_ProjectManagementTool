import { useState } from 'react';
import { Button, Textarea } from '../../components/ui';

/** Inline composer. Enter submits and stays open so several cards can be added. */
export function AddCardForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (title: string) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState('');

  const submit = async () => {
    const value = title.trim();
    if (!value) return;
    setTitle('');
    await onSubmit(value);
  };

  return (
    <div className="rounded-lg bg-white p-2 shadow-sm">
      <Textarea
        autoFocus
        rows={2}
        value={title}
        placeholder="What needs doing?"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
          if (e.key === 'Escape') onCancel();
        }}
        className="resize-none border-0 py-1 shadow-none ring-0 focus:ring-0"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <Button size="sm" loading={pending} onClick={() => void submit()} disabled={!title.trim()}>
          Add card
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
