import { useToastStore } from '@/stores/toastStore';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const ICONS = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

/** Bottom-center toast stack (save errors, import results, hints). */
export function Toaster() {

  const tr = useT();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2',
              t.kind === 'error' ? 'border-destructive/40 bg-destructive text-destructive-foreground' : 'bg-popover',
            )}
          >
            <Icon className={cn('h-4.5 w-4.5 shrink-0', t.kind === 'success' && 'text-emerald-500', t.kind === 'info' && 'text-primary')} />
            <span className="flex-1 text-sm">{t.message}</span>
            {t.actionLabel && (
              <button
                type="button"
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-xs font-medium',
                  t.kind === 'error' ? 'bg-white/15 hover:bg-white/25' : 'bg-primary/10 text-primary hover:bg-primary/20',
                )}
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              className={cn('shrink-0 rounded p-1', t.kind === 'error' ? 'hover:bg-white/15' : 'text-muted-foreground hover:bg-accent')}
              onClick={() => dismiss(t.id)}
              aria-label={tr('toast.dismiss')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
