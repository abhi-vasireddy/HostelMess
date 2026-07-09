import React, { useState, useEffect } from 'react';
import { toast } from '../services/toastStore';
import type { Toast, ToastType } from '../services/toastStore';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/** A floating toast container that renders at the bottom-right of the viewport */
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = toast.subscribe(setToasts);
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
};

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: <CheckCircle2 size={18} className="text-emerald-500" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: <AlertCircle size={18} className="text-red-500" />,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: <Info size={18} className="text-blue-500" />,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: <AlertTriangle size={18} className="text-amber-500" />,
  },
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast: t }) => {
  const styles = TOAST_STYLES[t.type];
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => toast.dismiss(t.id), 200);
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md
        ${styles.bg} ${styles.border}
        animate-in slide-in-from-right fade-in duration-200
        ${exiting ? 'animate-out slide-out-to-right fade-out duration-200' : ''}
      `}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">{styles.icon}</div>
      <p className={`text-sm font-medium flex-1 ${styles.text}`}>{t.message}</p>
      <button onClick={handleDismiss} className="shrink-0 p-0.5 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} className={styles.text} />
      </button>
    </div>
  );
};
