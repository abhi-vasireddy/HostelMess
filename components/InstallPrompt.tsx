import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // If accepted, hide our custom button
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-slate-900/90 dark:bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-orange-500/20">
            <Download size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Install App</h3>
            <p className="text-slate-300 text-[10px] leading-tight mt-0.5">Add to Home Screen for a better experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsVisible(false)} 
             className="p-1.5 text-slate-400 hover:text-white transition-colors"
           >
             <X size={16} />
           </button>
           <button 
             onClick={handleInstallClick}
             className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
           >
             Install
           </button>
        </div>
      </div>
    </div>
  );
};