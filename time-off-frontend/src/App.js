import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/layout/Sidebar';

import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/ResgisterPage';
import CompanySignupPage  from './pages/CompanySignupPage';
import EmployeeDashboard  from './pages/employee/EmployeeDashboard';
import NewRequestPage     from './pages/employee/NewRequestPage';
import BalancePage        from './pages/employee/BalancePage';
import ManagerDashboard   from './pages/manager/ManagerDashboard';
import AllRequestsPage    from './pages/manager/AllRequestsPage';
import TeamPage           from './pages/manager/TeamPage';

// ── Helpers ───────────────────────────────────────────────────────────────────
const isManagerLevel = (role) => role === 'manager' || role === 'admin';

// Show a full-screen spinner while we verify the stored token
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 300 }}>
        Ready<span style={{ color: 'var(--accent)' }}>On</span>
      </div>
      <div className="spinner" />
    </div>
  );
}

// Public routes — redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(isManagerLevel(user.role) ? '/manager' : '/employee', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <LoadingScreen />;
  if (user)    return null;
  return children;
}

// Protected layout — wraps all authenticated pages with the sidebar
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* Admin and Manager both see the manager dashboard */}
          {isManagerLevel(user.role) ? (
            <>
              <Route path="/manager"          element={<ManagerDashboard />} />
              <Route path="/manager/requests" element={<AllRequestsPage />} />
              <Route path="/manager/team"     element={<TeamPage />} />
              {/* Admin can also see their own leave */}
              <Route path="/employee"         element={<EmployeeDashboard />} />
              <Route path="/employee/request" element={<NewRequestPage />} />
              <Route path="/employee/balance" element={<BalancePage />} />
              <Route path="*"                 element={<Navigate to="/manager" replace />} />
            </>
          ) : (
            <>
              <Route path="/employee"         element={<EmployeeDashboard />} />
              <Route path="/employee/request" element={<NewRequestPage />} />
              <Route path="/employee/balance" element={<BalancePage />} />
              <Route path="*"                 element={<Navigate to="/employee" replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register"       element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/company/signup" element={<PublicRoute><CompanySignupPage /></PublicRoute>} />
            {/* Everything else is protected */}
            <Route path="*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}