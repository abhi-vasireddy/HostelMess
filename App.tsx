import React, { createContext, useContext, useState, useEffect } from 'react';
// 👇 CHANGE 1: Import HashRouter instead of BrowserRouter
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      {/* 👇 CHANGE 2: Using the Router (which is now HashRouter) */}
      <Router>
        <Routes>
          {/* Public Route: Login */}
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to={user.role === UserRole.ADMIN ? "/admin" : "/student"} />} 
          />

          {/* Protected Route: Student Dashboard */}
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

          {/* Protected Route: Admin Dashboard */}
          <Route 
            path="/admin" 
            element={
              user && user.role === UserRole.ADMIN ? (
                <Layout user={user} onLogout={logout}>
                   <AdminDashboard />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;