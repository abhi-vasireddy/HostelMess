import React, { createContext, useContext, useState, useEffect } from 'react';
// 👇 IMPORT HashRouter explicitly
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
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
      {/* 👇 HashRouter GUARANTEES no 404s on reload */}
      <HashRouter>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to={(user.role === UserRole.ADMIN || user.role === UserRole.CANTEEN_STAFF) ? "/admin" : "/student"} />} 
          />
          <Route 
            path="/student" 
            element={
              user && user.role === UserRole.STUDENT ? (
                <Layout user={user} onLogout={logout}>
                   <StudentDashboard user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              // 👇 Allow both ADMIN and CANTEEN_STAFF
              user && (user.role === UserRole.ADMIN || user.role === UserRole.CANTEEN_STAFF) ? (
                <Layout user={user} onLogout={logout}>
                   {/* 👇 Pass the 'user' prop so Dashboard knows who is logged in */}
                   <AdminDashboard user={user} />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}

export default App;