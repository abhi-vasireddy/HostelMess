import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, ArrowRight, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { checkPermission, requestPermission, isPushSupported, isNativePlatform } from '../services/notificationService';

/**
 * A user-friendly permission request dialog.
 *
 * Features:
 * - Shows only if permission hasn't been granted or denied yet.
 * - Explains WHY notifications are needed (builds trust).
 * - Provides "Enable" and "Not Now" buttons.
 * - Detects if the user previously denied and shows a helpful message.
 * - Stores dismissal state to avoid re-prompting too often.
 */
export const NotificationPermissionRequest: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [previouslyDenied, setPreviouslyDenied] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);

  useEffect(() => {
    const evaluate = async () => {
      if (!isPushSupported()) return;

      // Don't re-prompt if user dismissed in the last 7 days
      const stored = localStorage.getItem('hft_notif_dismissed');
      if (stored) {
        const until = parseInt(stored, 10);
        setDismissedUntil(until);
        if (Date.now() < until) return;
      }

      const status = await checkPermission();
      if (status === 'granted') return;
      if (status === 'denied') {
        setPreviouslyDenied(true);
        // Show the "settings" view so user knows how to re-enable
        setVisible(true);
        return;
      }

      // status === 'default' — never asked
      setVisible(true);
    };

    // Small delay so the app renders first
    const timer = setTimeout(evaluate, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setVisible(false);
      localStorage.removeItem('hft_notif_dismissed');
    } else if (result === 'denied') {
      setPreviouslyDenied(true);
    }
  };

  const handleDismiss = () => {
    // Don't show again for 7 days
    const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('hft_notif_dismissed', until.toString());
    setDismissedUntil(until);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50">
            {previouslyDenied ? (
              <BellOff size={24} className="text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Bell size={24} className="text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
          {previouslyDenied ? 'Notifications Are Off' : 'Stay Updated'}
        </h3>

        {previouslyDenied ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              You've blocked notifications for this app. To re-enable them, go to your
              browser or device settings and allow notifications for CampDex.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-xl mb-5">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                <Smartphone size={14} />
                On Android: Settings → Apps → CampDex → Notifications → Allow
              </p>
            </div>
            <Button fullWidth variant="secondary" onClick={handleDismiss}>
              Got it
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Get notified about complaint updates, laundry slot availability, new announcements,
              and important hostel alerts — even when the app is closed.
            </p>

            <ul className="space-y-2 mb-6">
              {[
                'Complaint status changes',
                'New hostel announcements',
                'Laundry booking reminders',
              ].map((text) => (
                <li key={text} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2">
              <Button fullWidth onClick={handleEnable} className="gap-2">
                Enable Notifications <ArrowRight size={16} />
              </Button>
              <Button fullWidth variant="outline" size="sm" onClick={handleDismiss}>
                Not Now
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationPermissionRequest;
