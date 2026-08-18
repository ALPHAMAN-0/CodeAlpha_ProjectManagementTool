import clsx from 'clsx';
import type { ConnectionState } from '../features/realtime/useConnection';

const COPY: Record<ConnectionState, { label: string; dot: string; text: string }> = {
  live: { label: 'Live', dot: 'bg-emerald-500', text: 'text-slate-500' },
  connecting: { label: 'Connecting', dot: 'bg-slate-400', text: 'text-slate-500' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700' },
};

/**
 * Says out loud whether updates are still arriving. Without this a dropped socket
 * looks exactly like a quiet board.
 */
export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const copy = COPY[state];
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', copy.text)}
      title={
        state === 'live'
          ? 'Connected - changes appear as they happen'
          : 'Not receiving live updates right now'
      }
    >
      <span className={clsx('size-1.5 rounded-full', copy.dot)} />
      {copy.label}
    </span>
  );
}
