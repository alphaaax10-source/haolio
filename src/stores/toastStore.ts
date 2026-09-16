import { create } from 'zustand';
import { createId } from '@/lib/id';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  push(kind: ToastKind, message: string, opts?: { actionLabel?: string; onAction?: () => void; duration?: number }): string;
  dismiss(id: string): void;
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, message, opts = {}) => {
    const id = createId(8);
    const toast: Toast = { id, kind, message, actionLabel: opts.actionLabel, onAction: opts.onAction };
    set({ toasts: [...get().toasts.slice(-3), toast] });
    const duration = opts.duration ?? (kind === 'error' ? 8000 : 4500);
    window.setTimeout(() => get().dismiss(id), duration);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  info: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().push('info', message, opts),
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().push('error', message, opts),
};
