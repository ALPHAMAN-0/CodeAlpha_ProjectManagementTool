import type { ReactNode } from 'react';
import { Logo } from '../../components/Logo';

/** Shared chrome for the signed-out screens. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-slate-500">{footer}</p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-slate-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-slate-900" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex h-full flex-col justify-center px-14 text-white">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Boards your whole team sees update at the same moment.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              'Drag a card - everyone watching sees it move',
              'Assign work and comment in the task itself',
              'Notifications the instant something needs you',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-400" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
