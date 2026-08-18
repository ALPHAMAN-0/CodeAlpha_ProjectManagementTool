export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-md bg-indigo-600 text-white">
        <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
          <rect x="2.5" y="3" width="4.5" height="14" rx="1.2" />
          <rect x="8.75" y="3" width="4.5" height="9" rx="1.2" opacity="0.75" />
          <rect x="15" y="3" width="2.5" height="5.5" rx="1.1" opacity="0.5" />
        </svg>
      </span>
      {!compact && <span className="text-base font-semibold tracking-tight text-slate-900">Kanvas</span>}
    </span>
  );
}
