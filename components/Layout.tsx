import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Button } from './Button';
import { LogOut, Sun, Moon, Utensils } from 'lucide-react';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage on mount
    const savedTheme = localStorage.getItem('theme');
    
    // Default to Light: Only set dark if explicitly saved as 'dark'
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      // Default to Light (even if system is dark, unless user previously toggled)
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      // Set default in storage if not present to ensure consistency
      if (!savedTheme) {
        localStorage.setItem('theme', 'light');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-orange-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Import Font specifically for Layout if not global */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');`}
      </style>

      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-orange-100 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                <Utensils className="w-5 h-5" />
             </div>
             <div>
               {/* UPDATED NAME AND FONT */}
               <h1 
                 className="text-2xl text-slate-900 dark:text-white leading-none mt-1"
                 style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400 }}
               >
                 Mess Connect
               </h1>
               <p style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 25 }}>Mess Secretary : Indra Reddy</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-orange-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user && (
              <>
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {user.displayName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                    {user.role}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={onLogout} className="!p-2 sm:!px-4 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {user?.role !== UserRole.ADMIN && (
        <footer className="bg-white dark:bg-slate-900 border-t border-orange-100 dark:border-slate-800 py-8 mt-auto transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {/* UPDATED FOOTER TEXT */}
              &copy; {new Date().getFullYear()} Mess Connect.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};