import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Shows a persistent banner at the top when the user is offline.
 * Hides automatically when connectivity returns.
 */
export const OfflineIndicator: React.FC = () => {
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

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-[80] w-full bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-lg animate-in slide-in-from-top fade-in duration-300">
      <WifiOff size={16} />
      You are offline. Some features may not work.
      <button
        onClick={() => window.location.reload()}
        className="ml-2 underline hover:no-underline text-white/80 hover:text-white"
      >
        Retry
      </button>
    </div>
  );
};
