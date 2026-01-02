import React, { useState } from 'react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // <--- NEW STATE
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fill demo credentials
  const fillDemo = (role: UserRole) => {
    if (role === UserRole.ADMIN) {
      setEmail('admin@hostel.com');
      setPassword('password');
    } else {
      setEmail('student@hostel.com');
      setPassword('password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Logo Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 mb-4 animate-bounce-slow">
            <UtensilsCrossed size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">HostelMess</h1>
          <p className="text-slate-500 dark:text-slate-400">Welcome back! Please sign in.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white"
                  placeholder="name@hostel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field with Eye Icon */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={18} />
                </div>
                
                {/* 1. Toggle Type: password <-> text */}
                <input
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* 2. Eye Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  tabIndex={-1} // Prevents tabbing to this button
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" fullWidth isLoading={loading} className="py-3 text-base shadow-lg shadow-orange-500/20">
            Sign In
          </Button>
        </form>

      </div>
    </div>
  );
};