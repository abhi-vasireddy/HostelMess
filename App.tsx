import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MockDB } from './services/mockDb';
import { User, UserRole } from './types';
import { Layout } from './components/Layout'; // <--- Import Layout

// 1. Define the shape of our Auth Context
interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

// 2. Create the Context
const AuthContext = createContext<AuthContextType | null>(null);

// 3. EXPORT the hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// 4. The Main App Component
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on load
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
                // WRAPPER ADDED: Layout + User Prop Passed
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
                // WRAPPER ADDED: Layout
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