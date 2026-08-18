import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

interface State {
  error: Error | null;
}

/** Last line of defence: a render crash shows a recovery screen, not a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] render error', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-slate-900">Something broke on this screen</h1>
          <p className="mt-2 text-sm text-slate-600">{this.state.error.message}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        </div>
      </div>
    );
  }
}
