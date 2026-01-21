import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { HomeHub } from './pages/HomeHub';               // 👈 New!
import { HostelDashboard } from './pages/HostelDashboard'; // 👈 New!
import { MockDB } from './services/mockDb';
import { User, UserRole } from './types';
import { Layout } from './components/Layout'; 

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

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = MockDB.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    const loggedInUser = await MockDB.login(email, password);
    setUser(loggedInUser);
  };

  const logout = async () => {
    await MockDB.logout();
    setUser(null);
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
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/" />} 
          />
          
          {/* Protected Routes (User must be logged in) */}
          {user ? (
            <>
              {/* 1. Main Hub - The "Super App" Home Screen */}
              <Route path="/" element={<HomeHub />} />

              {/* 2. Mess Module */}
              <Route 
                path="/mess" 
                element={
                  (user.role === UserRole.ADMIN || user.role === UserRole.CANTEEN_STAFF) ? (
                    <Layout user={user} onLogout={logout}>
                       <AdminDashboard user={user} />
                    </Layout>
                  ) : (
                    <Layout user={user} onLogout={logout}>
                       <StudentDashboard user={user} />
                    </Layout>
                  )
                } 
              />

              {/* 3. Hostel Module */}
              <Route 
                 path="/hostel" 
                 element={<HostelDashboard user={user} />} 
              />
            </>
          ) : (
            // If not logged in, go to login
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}

export default App;