/**
 * Global Toast Notification Store
 *
 * A lightweight, reactive toast system that replaces all `alert()` calls.
 * Uses a simple pub/sub pattern — no external dependencies.
 *
 * Usage:
 *   import { toast } from './services/toastStore';
 *   toast.success('User created!');
 *   toast.error('Failed to load');
 *   toast.info('Welcome back');
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type Listener = (toasts: Toast[]) => void;

class ToastStore {
  private toasts: Toast[] = [];
  private listeners: Set<Listener> = new Set();
  private counter = 0;

  private emit() {
    this.listeners.forEach((fn) => fn([...this.toasts]));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private add(message: string, type: ToastType, duration: number = 3500) {
    const id = `toast-${++this.counter}-${Date.now()}`;
    this.toasts = [...this.toasts, { id, message, type, duration }];
    this.emit();

    // Auto-dismiss
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }

  dismissAll() {
    this.toasts = [];
    this.emit();
  }

  // ── Convenience Methods ──
  success(message: string, duration?: number) {
    this.add(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.add(message, 'error', duration ?? 5000);
  }

  info(message: string, duration?: number) {
    this.add(message, 'info', duration);
  }

  warning(message: string, duration?: number) {
    this.add(message, 'warning', duration ?? 4000);
  }

  /** Alias for .error() — drop-in replacement for `alert()` */
  alert(message: string) {
    this.add(message, 'warning', 5000);
  }
}

/** Singleton instance */
export const toast = new ToastStore();
export type { Toast, ToastType };
