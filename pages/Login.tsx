
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { MockDB } from '../services/mockDb';
import { User } from '../types';
import { Utensils, Lock, Mail } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 800));
      const user = await MockDB.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (type: 'student' | 'admin') => {
    setEmail(type === 'student' ? 'student@hostel.com' : 'admin@hostel.com');
    setPassword('password');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-slate-950 transition-colors duration-200">
      
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 mx-auto mb-4">
           <Utensils className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">HostelMess Connect</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage meals, feedback, and more.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-orange-100 dark:border-slate-800 w-full max-w-md backdrop-blur-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Welcome Back</h2>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6 border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                required
                className="w-full pl-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 p-3 outline-none dark:text-white transition-all"
                placeholder="you@hostel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                required
                className="w-full pl-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 p-3 outline-none dark:text-white transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" fullWidth disabled={loading} size="lg" className="rounded-xl font-semibold shadow-lg shadow-orange-500/20 mt-2">
            {loading ? 'Logging in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
           <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-3 font-medium uppercase tracking-wider">Demo Credentials</p>
           <div className="flex gap-3 justify-center">
             <button onClick={() => fillCredentials('student')} className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full transition-colors">Student Demo</button>
             <button onClick={() => fillCredentials('admin')} className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full transition-colors">Admin Demo</button>
           </div>
        </div>
      </div>
    </div>
  );
};
