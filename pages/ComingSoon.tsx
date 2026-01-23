import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

export const ComingSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
      <div className="bg-orange-100 dark:bg-orange-900/20 p-6 rounded-full mb-6">
        <Construction size={64} className="text-orange-500" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
        Coming Soon!
      </h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-8">
        We are currently building this feature. Stay tuned for updates!
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
      >
        <ArrowLeft size={20} /> Back to Hub
      </button>
    </div>
  );
};