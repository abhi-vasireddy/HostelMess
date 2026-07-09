/**
 * NotificationProvider — React Context for the entire notification lifecycle.
 *
 * Responsibilities:
 *   - Register for push notifications when a user logs in.
 *   - Clean up tokens/listeners on logout.
 *   - Display in-app toast/banner for foreground notifications.
 *   - Navigate to the correct screen when a notification is tapped.
 *   - Expose notification state and actions via a custom hook.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  registerForNotifications,
  cleanupNotifications,
  setForegroundCallback,
  setTapCallback,
  isPushSupported,
} from '../services/notificationService';
import type { NotificationPayload, NotificationEvent } from '../services/notificationTypes';
import { Bell, X, ChevronRight, AlertCircle, Megaphone, WashingMachine } from 'lucide-react';

// ──────────────────────────────────────────────────────
//  CONTEXT INTERFACE
// ──────────────────────────────────────────────────────

interface NotificationContextValue {
  /** The last received notification payload (null if none) */
  lastNotification: NotificationPayload | null;
  /** Whether a notification toast/banner is currently visible */
  toastVisible: boolean;
  /** Dismiss the in-app toast */
  dismissToast: () => void;
  /** Manually trigger navigation from the last notification */
  navigateFromNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ──────────────────────────────────────────────────────
//  HOOK
// ──────────────────────────────────────────────────────

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};

// ──────────────────────────────────────────────────────
//  TOAST COMPONENT (rendered inline)
// ──────────────────────────────────────────────────────

const NotificationToast: React.FC<{
  payload: NotificationPayload;
  onTap: () => void;
  onDismiss: () => void;
}> = ({ payload, onTap, onDismiss }) => {
  const getIcon = () => {
    const route = payload.route || '';
    if (route.includes('issues') || route.includes('complaint')) return <AlertCircle size={18} />;
    if (route.includes('laundry')) return <WashingMachine size={18} />;
    if (route.includes('notice') || route.includes('announcement')) return <Megaphone size={18} />;
    return <Bell size={18} />;
  };

  return (
    <div className="animate-in slide-in-from-top fade-in duration-300">
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors max-w-sm"
        onClick={onTap}
        role="alert"
      >
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {payload.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
            {payload.body}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ChevronRight size={16} className="text-slate-300 dark:text-slate-500" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Dismiss notification"
          >
            <X size={14} className="text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────
//  PROVIDER
// ──────────────────────────────────────────────────────

interface NotificationProviderProps {
  children: React.ReactNode;
  /** The currently logged-in user's UID (null when logged out) */
  userId: string | null;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  userId,
}) => {
  const navigate = useNavigate();
  const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);
  const [toastPayload, setToastPayload] = useState<NotificationPayload | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  // ── Register / Cleanup on user change ──
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    const setup = async () => {
      // Cleanup previous user's registration
      if (prevUserId && prevUserId !== userId) {
        await cleanupNotifications(prevUserId);
      }

      if (!userId) return; // Logged out → don't register

      // Register for this user
      await registerForNotifications(userId);
    };

    setup();

    return () => {
      // Don't cleanup on every re-render; only on actual user change
    };
  }, [userId]);

  // ── Foreground message handler ──
  useEffect(() => {
    setForegroundCallback((event: NotificationEvent) => {
      const { payload, source } = event;
      console.log(`[NotificationProvider] Foreground event from ${source}:`, payload);

      setLastNotification(payload);
      showToast(payload);
    });
  }, []);

  // ── Tap handler (app opened from background/closed state) ──
  useEffect(() => {
    setTapCallback((event: NotificationEvent) => {
      const { payload, source } = event;
      console.log(`[NotificationProvider] Tap event from ${source}:`, payload);

      setLastNotification(payload);
      // Navigate immediately on tap
      navigateToRoute(payload.route);
    });
  }, []);

  // ── Toast helpers ──
  const showToast = useCallback((payload: NotificationPayload) => {
    setToastPayload(payload);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    // Auto-dismiss after 5 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setToastPayload(null);
      toastTimeoutRef.current = null;
    }, 5000);
  }, []);

  const dismissToast = useCallback(() => {
    setToastPayload(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  // ── Navigation ──
  const navigateToRoute = useCallback(
    (route?: string) => {
      if (route) {
        navigate(route);
      }
    },
    [navigate]
  );

  const navigateFromNotification = useCallback(() => {
    if (lastNotification?.route) {
      navigateToRoute(lastNotification.route);
    }
  }, [lastNotification, navigateToRoute]);

  const handleToastTap = useCallback(() => {
    if (toastPayload?.route) {
      navigateToRoute(toastPayload.route);
    }
    dismissToast();
  }, [toastPayload, navigateToRoute, dismissToast]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Context value ──
  const value: NotificationContextValue = {
    lastNotification,
    toastVisible: toastPayload !== null,
    dismissToast,
    navigateFromNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* In-app toast banner rendered at the top of the viewport */}
      {toastPayload && (
        <div className="fixed top-4 left-4 right-4 z-[70] flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <NotificationToast
              payload={toastPayload}
              onTap={handleToastTap}
              onDismiss={dismissToast}
            />
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
