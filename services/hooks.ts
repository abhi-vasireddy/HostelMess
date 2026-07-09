/**
 * Reusable application hooks
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from './toastStore';

// ──────────────────────────────────────────
// useOnlineStatus — Detect connectivity
// ──────────────────────────────────────────
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
};

// ──────────────────────────────────────────
// useConfirm — Promise-based confirmation dialog
// Replaces `confirm("Are you sure?")` with a
// custom modal that can be styled consistently.
// ──────────────────────────────────────────
interface UseConfirmReturn {
  confirm: (message: string, title?: string) => Promise<boolean>;
  ConfirmationDialog: React.FC;
}

export const useConfirm = (): UseConfirmReturn => {
  const [pending, setPending] = useState<{
    message: string;
    title: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirm = useCallback((message: string, title = 'Confirm') => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, title, resolve });
    });
  }, []);

  const ConfirmationDialog: React.FC = () => {
    if (!pending) return null;

    const handleConfirm = () => {
      pending.resolve(true);
      setPending(null);
    };

    const handleCancel = () => {
      pending.resolve(false);
      setPending(null);
    };

    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {pending.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {pending.message}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { confirm, ConfirmationDialog };
};

// ──────────────────────────────────────────
// useToast — Access toast methods easily
// ──────────────────────────────────────────
export const useToast = () => toast;

// ──────────────────────────────────────────
// useVersion — Tracks app version from .env
// ──────────────────────────────────────────
export const useAppVersion = (): string => {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
};
