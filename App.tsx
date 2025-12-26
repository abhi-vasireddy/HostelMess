import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MockDB } from './services/mockDb';
import { User, UserRole } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const currentUser = MockDB.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await MockDB.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-indigo-600">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      {user.role === UserRole.ADMIN ? (
        <AdminDashboard />
      ) : (
        <StudentDashboard user={user} />
      )}
    </Layout>
  );
}

export default App;
