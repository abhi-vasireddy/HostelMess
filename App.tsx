import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MockDB } from './services/mockDb';
import { User, UserRole, ServiceModule } from './types';
import { InstallPrompt } from './components/InstallPrompt';

// 👇 Lazy-loaded pages for code splitting
import {
  LazyLogin,
  LazyStudentDashboard,
  LazyAdminDashboard,
  LazyHomeHub,
  LazyHostelDashboard,
  LazySportsDashboard,
  LazyComingSoon,
} from './components/LazyPages';

// 👇 Notification Components
import { NotificationProvider } from './components/NotificationProvider';
import { NotificationPermissionRequest } from './components/NotificationPermissionRequest';

// 👇 Global Toast
import { ToastContainer } from './components/ToastContainer';

// 👇 Offline indicator
import { OfflineIndicator } from './components/OfflineIndicator';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceModule[]>([]);

  // Initialize Data & Fetch Services
  useEffect(() => {
    const initData = async () => {
      const savedUser = MockDB.getCurrentUser();
      if (savedUser) setUser(savedUser);

      try {
        const serviceList = await MockDB.getServices();
        setServices(serviceList);
      } catch (e) {
        console.error("Failed to load routes", e);
      }

      setLoading(false);
    };
    initData();
  }, []);

  const login = async (email: string, password?: string) => {
    const loggedInUser = await MockDB.login(email, password);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await MockDB.logout();
    setUser(null);
  };

  // Route Factory (returns the correct component based on path + role)
  const getComponentForPath = (path: string, currentUser: User) => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    switch (cleanPath) {
      case 'mess':
        return (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CANTEEN_STAFF) ? (
          <LazyAdminDashboard />
        ) : (
          <LazyStudentDashboard user={currentUser} />
        );

      case 'hostel':
        return <LazyHostelDashboard user={currentUser} />;

      case 'sports':
      case 'gym':
        return <LazySportsDashboard user={currentUser} />;

      default:
        return <LazyComingSoon />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      <HashRouter>
        {/* Offline banner at top of every page */}
        <OfflineIndicator />

        <InstallPrompt />

        <NotificationProvider userId={user?.uid || null}>
          <Routes>
            <Route
              path="/login"
              element={!user ? <LazyLogin /> : <Navigate to="/" />}
            />

            {user ? (
              <>
                <Route path="/" element={<LazyHomeHub />} />

                {services.map((service) => (
                  <React.Fragment key={service.id}>
                    <Route
                      path={service.path}
                      element={getComponentForPath(service.path, user)}
                    />
                  </React.Fragment>
                ))}

                <Route path="/mess" element={getComponentForPath('/mess', user)} />
                <Route path="/hostel" element={<LazyHostelDashboard user={user} />} />
                <Route path="/sports" element={<LazySportsDashboard user={user} />} />

                <Route path="*" element={<Navigate to="/" />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" />} />
            )}
          </Routes>
        </NotificationProvider>

        <NotificationPermissionRequest />
        <ToastContainer />
      </HashRouter>
    </AuthContext.Provider>
  );
}

export default App;
