import clsx from 'clsx';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Due dates are only useful if late ones look late, so this colours by urgency
 * and uses plain words for the near ones.
 */
export function DueDate({ iso, size = 'xs' }: { iso: string; size?: 'xs' | 'sm' }) {
  const due = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - startOfToday.getTime()) / DAY);

  const label =
    days < 0
      ? days === -1
        ? 'Yesterday'
        : `${Math.abs(days)} days late`
      : days === 0
        ? 'Today'
        : days === 1
          ? 'Tomorrow'
          : due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const tone =
    days < 0
      ? 'bg-red-100 text-red-700'
      : days <= 1
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <span
      title={due.toLocaleDateString(undefined, { dateStyle: 'full' })}
      className={clsx(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        tone,
      )}
    >
      <svg viewBox="0 0 20 20" className="size-3" fill="currentColor" aria-hidden="true">
        <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2ZM3.5 8v7.25c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V8h-13Z" />
      </svg>
      {label}
    </span>
  );
}
