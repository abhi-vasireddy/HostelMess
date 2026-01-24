import React, { useState } from 'react';
import { useAuth } from '../App';
import { Eye, EyeOff, Loader2, AlertCircle, User, Lock, ArrowRight } from 'lucide-react';
import { LottiePlayer } from '../components/LottiePlayer';
import foodThali from '../assets/animations/food-thali.png';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Network error state
  const [isNetworkError, setIsNetworkError] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsNetworkError(false);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.message || 'Failed to login';

      if (
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('connection') ||
        msg.toLowerCase().includes('offline')
      ) {
        setIsNetworkError(true);
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NETWORK ERROR VIEW ---
  if (isNetworkError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center animate-in fade-in">
        <LottiePlayer type="404" className="w-64 h-64 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Connection Failed
        </h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
          We couldn't connect to the server. Please check your internet.
        </p>
        <button
          onClick={() => setIsNetworkError(false)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95"
        >
          Retry Login
        </button>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans flex items-center justify-center relative overflow-hidden">

      {/* ✅ BITCOUNT PROP SINGLE FONT IMPORT */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Bitcount+Prop+Single&display=swap');`}
      </style>

      {/* 1. TOP ORANGE HEADER */}
      <div className="absolute top-0 left-0 w-full h-[220px] bg-[#FF6B1A] rounded-b-[100px] z-0 flex flex-col items-center pt-[32px]">

        {/* LOGO */}
        <div className="w-[90px] h-[90px] bg-white rounded-full flex items-center justify-center shadow-md mb-2">
          <img
            src="https://res.cloudinary.com/dev55x8f7/image/upload/v1767472236/Screenshot_2026-01-04_at_1.59.55_AM_e4pe4i.png"
            alt="Mess Connect Logo"
            className="w-[55px] h-[55px] object-contain"
          />
        </div>

        {/* ✅ TITLE */}
        <h1
          className="text-white text-[32px] leading-tight"
          style={{
            fontFamily: "'Bitcount Prop Single', sans-serif",
            fontWeight: 400,
          }}
        >
          Mess Connect
        </h1>

        {/* ✅ SUBTITLE */}
        <p
          className="text-white text-[16px] font-medium opacity-90 mt-0"
          style={{
            fontFamily: "'Bitcount Prop Single', sans-serif",
            fontWeight: 400,
          }}
        >
          Hostel Food Management
        </p>
      </div>

      {/* 2. LEFT DECORATION IMAGE */}
      <div className="hidden lg:block absolute bottom-0 left-0 z-0">
        <img
          src={foodThali}
          alt="Food Thali"
          className="w-[300px] h-[300px] object-cover rounded-full drop-shadow-2xl translate-y-[15%] translate-x-[-40%]"
        />
      </div>

      {/* 3. LOGIN CARD */}
      <div className="w-[85%] sm:w-full sm:max-w-[400px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-[24px] sm:p-[32px] relative z-10 translate-y-20">

        <h2 className="text-[28px] font-bold text-[#1F2937] mb-[24px]">
          Welcome Back!
        </h2>

        <form onSubmit={handleLogin}>
          {/* ERROR MESSAGE */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* EMAIL FIELD */}
          <div className="mb-0 relative group">
            <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[1px] mb-1">
              EMAIL ID
            </label>
            <div className="relative">
              <div className="absolute left-0 top-[12px] pointer-events-none">
                <User className="w-5 h-5 text-[#9CA3AF] group-focus-within:text-[#FF6B1A] transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#E5E7EB] focus:border-[#FF6B1A] outline-none text-[#1F2937] placeholder-gray-400 text-sm py-[12px] pl-[36px] transition-colors"
                placeholder="Enter your ID"
              />
            </div>
          </div>

          {/* PASSWORD FIELD */}
          <div className="mt-[20px] relative group">
            <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[1px] mb-1">
              PASSWORD
            </label>
            <div className="relative">
              <div className="absolute left-0 top-[12px] pointer-events-none">
                <Lock className="w-5 h-5 text-[#9CA3AF] group-focus-within:text-[#FF6B1A] transition-colors" />
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#E5E7EB] focus:border-[#FF6B1A] outline-none text-[#1F2937] placeholder-gray-400 text-sm py-[12px] pl-[36px] pr-[36px] transition-colors"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-[12px] text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* CONTINUE BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[48px] mt-[28px] mb-[28px] flex items-center justify-center rounded-[14px] bg-[#FF6B1A] hover:bg-[#e55a0f] text-white font-bold text-[16px] shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="flex flex-col items-center">
          <p className="text-[12px] text-[#9CA3AF] text-center mb-[8px]">
            From the students of
          </p>

          <img
            src="https://res.cloudinary.com/dev55x8f7/image/upload/v1769229418/ni_y6hh12.png"
            alt="NIAT Logo"
            className="h-[40px] w-[150px] object-contain mix-blend-multiply opacity-90"
          />
        </div>
      </div>
    </div>
  );
};
