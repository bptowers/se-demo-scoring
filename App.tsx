import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DemoScoringApp } from './pages/DemoScoringApp';
import { TrendReport } from './pages/TrendReport';
import { Login } from './pages/Login';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { BdrDashboard } from './pages/BdrDashboard';
import { AeDashboard } from './pages/AeDashboard';
import { CallHistory } from './pages/CallHistory';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getManagerConfig } from './config/managerConfig';
import { isBdrUser, isBdrDashboardManager } from './config/bdrUsers';

const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!getManagerConfig(user.email)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ManagerDashboardWrapper: React.FC = () => {
  const { user } = useAuth();
  const config = getManagerConfig(user?.email);
  return config ? <ManagerDashboard managerConfig={config} /> : null;
};

const BdrRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isBdrUser(user.email) && !isBdrDashboardManager(user.email)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DemoScoringApp />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trends"
        element={
          <ProtectedRoute>
            <Layout>
              <TrendReport />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager"
        element={
          <ManagerRoute>
            <Layout>
              <ManagerDashboardWrapper />
            </Layout>
          </ManagerRoute>
        }
      />
      <Route
        path="/bdr"
        element={
          <BdrRoute>
            <Layout>
              <BdrDashboard />
            </Layout>
          </BdrRoute>
        }
      />
      <Route
        path="/ae-dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <AeDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <CallHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;