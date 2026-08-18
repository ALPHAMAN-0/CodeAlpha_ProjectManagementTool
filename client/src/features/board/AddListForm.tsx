import { useState } from 'react';
import { Button, Input } from '../../components/ui';

export function AddListForm({
  onSubmit,
  pending,
}: {
  onSubmit: (title: string) => Promise<void>;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = async () => {
    const value = title.trim();
    if (!value) return;
    setTitle('');
    await onSubmit(value);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-72 shrink-0 rounded-xl bg-slate-200/60 px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-200"
      >
        + Add another column
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-xl bg-slate-200/70 p-2">
      <Input
        autoFocus
        value={title}
        placeholder="Column name"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') {
            setTitle('');
            setOpen(false);
          }
        }}
      />
      <div className="mt-1.5 flex items-center gap-2">
        <Button size="sm" loading={pending} onClick={() => void submit()} disabled={!title.trim()}>
          Add column
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setTitle('');
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
