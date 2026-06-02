import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DemoScoringApp } from './pages/DemoScoringApp';
import { TrendReport } from './pages/TrendReport';
import { Login } from './pages/Login';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { AeDashboard } from './pages/AeDashboard';
import { CallHistory } from './pages/CallHistory';
import { SeRubricGuide } from './pages/SeRubricGuide';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getManagerConfig } from './config/managerConfig';
import { canViewSeRubric } from './config/rubricAccess';

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

const RubricRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewSeRubric(user.email)) return <Navigate to="/" replace />;
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
      <Route path="/bdr" element={<Navigate to="/" replace />} />
      <Route path="/ae-dashboard" element={<Navigate to="/se-dashboard" replace />} />
      <Route
        path="/se-dashboard"
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
      <Route
        path="/se-rubric"
        element={
          <RubricRoute>
            <Layout>
              <SeRubricGuide />
            </Layout>
          </RubricRoute>
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
