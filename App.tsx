import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { HomeHub } from './pages/HomeHub';
import { HostelDashboard } from './pages/HostelDashboard';
import { SportsDashboard } from './pages/SportsDashboard';
import { ComingSoon } from './pages/ComingSoon';
import { MockDB } from './services/mockDb';
import { User, UserRole, ServiceModule } from './types';
import { Layout } from './components/Layout'; 
import { InstallPrompt } from './components/InstallPrompt'; // 👈 1. Import this

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

  // 1. Initialize Auth AND Fetch Services
  useEffect(() => {
    const initData = async () => {
      // Check User
      const savedUser = MockDB.getCurrentUser();
      if (savedUser) setUser(savedUser);

      // Fetch Services for Dynamic Routing
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

  // 2. The Route Factory
  const getComponentForPath = (path: string, currentUser: User) => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    switch (cleanPath) {
      case 'mess':
        return (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CANTEEN_STAFF) ? (
          <Layout user={currentUser} onLogout={logout}>
             <AdminDashboard />
          </Layout>
        ) : (
          <Layout user={currentUser} onLogout={logout}>
             <StudentDashboard user={currentUser} />
          </Layout>
        );
      
      case 'hostel':
        return <HostelDashboard user={currentUser} />;
      
      case 'sports':
      case 'gym': 
        return <SportsDashboard user={currentUser} />;
      
      default:
        return <ComingSoon />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      <HashRouter>
        {/* 🟢 2. Add the Install Prompt here so it appears globally */}
        <InstallPrompt />
        
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/" />} 
          />
          
          {/* Protected Routes */}
          {user ? (
            <>
              <Route path="/" element={<HomeHub />} />

              {/* 3. Dynamic Routes */}
              {services.map((service) => (
                <React.Fragment key={service.id}>
                  <Route 
                    path={service.path} 
                    element={getComponentForPath(service.path, user)} 
                  />
                </React.Fragment>
              ))}

              {/* Fallbacks */}
              <Route path="/mess" element={getComponentForPath('/mess', user)} />
              <Route path="/hostel" element={<HostelDashboard user={user} />} />
              <Route path="/sports" element={<SportsDashboard user={user} />} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}

export default App;