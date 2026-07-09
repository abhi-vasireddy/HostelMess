/**
 * Lazy-loaded page components for code splitting.
 *
 * Each dashboard is loaded only when the user navigates to it,
 * reducing the initial bundle from ~2.7MB to ~500KB.
 *
 * Uses `.then(m => ({ default: m.ComponentName }))` because all
 * pages use named exports (export const), not export default.
 */

import React, { Suspense, lazy } from 'react';
import type { User } from '../types';

// ── Loading Fallback ──
const PageLoader: React.FC<{ label?: string }> = ({ label }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-400 animate-pulse">{label || 'Loading...'}</p>
    </div>
  </div>
);

// ── Lazy Imports (named export → default re-export) ──
const LoginLazy = lazy(() =>
  import('../pages/Login').then((m) => ({ default: m.Login }))
);
const StudentDashboardLazy = lazy(() =>
  import('../pages/StudentDashboard').then((m) => ({ default: m.StudentDashboard }))
);
const AdminDashboardLazy = lazy(() =>
  import('../pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const HomeHubLazy = lazy(() =>
  import('../pages/HomeHub').then((m) => ({ default: m.HomeHub }))
);
const HostelDashboardLazy = lazy(() =>
  import('../pages/HostelDashboard').then((m) => ({ default: m.HostelDashboard }))
);
const SportsDashboardLazy = lazy(() =>
  import('../pages/SportsDashboard').then((m) => ({ default: m.SportsDashboard }))
);
const ComingSoonLazy = lazy(() =>
  import('../pages/ComingSoon').then((m) => ({ default: m.ComingSoon }))
);

// ── Exported lazy components ──

export const LazyLogin: React.FC = () => (
  <Suspense fallback={<PageLoader label="Signing in..." />}>
    <LoginLazy />
  </Suspense>
);

export const LazyStudentDashboard: React.FC<{ user: User }> = ({ user }) => (
  <Suspense fallback={<PageLoader label="Loading mess..." />}>
    <StudentDashboardLazy user={user} />
  </Suspense>
);

export const LazyAdminDashboard: React.FC = () => (
  <Suspense fallback={<PageLoader label="Loading admin..." />}>
    <AdminDashboardLazy />
  </Suspense>
);

export const LazyHomeHub: React.FC = () => (
  <Suspense fallback={<PageLoader label="Loading home..." />}>
    <HomeHubLazy />
  </Suspense>
);

export const LazyHostelDashboard: React.FC<{ user: User }> = ({ user }) => (
  <Suspense fallback={<PageLoader label="Loading hostel..." />}>
    <HostelDashboardLazy user={user} />
  </Suspense>
);

export const LazySportsDashboard: React.FC<{ user: User }> = ({ user }) => (
  <Suspense fallback={<PageLoader label="Loading sports..." />}>
    <SportsDashboardLazy user={user} />
  </Suspense>
);

export const LazyComingSoon: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <ComingSoonLazy />
  </Suspense>
);
