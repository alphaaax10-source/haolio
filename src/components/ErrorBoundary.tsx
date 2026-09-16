import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

/** Catches render errors so a crash never shows a blank window. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Haolio crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-background p-8">
          <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center shadow-lg">
            <CircleAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              Haolio hit an unexpected error. Your work is saved locally — reloading should restore it.
            </p>
            <pre className="haolio-scroll max-h-28 overflow-auto rounded-md bg-muted p-2 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
            <Button onClick={() => window.location.reload()}>Reload Haolio</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
