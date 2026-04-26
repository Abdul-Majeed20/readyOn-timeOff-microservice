import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/layout/Sidebar';

import LoginPage          from './pages/LoginPage';
import EmployeeDashboard  from './pages/employee/EmployeeDashboard';
import NewRequestPage     from './pages/employee/NewRequestPage';
import BalancePage        from './pages/employee/BalancePage';
import ManagerDashboard   from './pages/manager/ManagerDashboard';
import AllRequestsPage    from './pages/manager/AllRequestsPage';

// Login page wrapper — redirects to dashboard as soon as user is set
function LoginRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'manager' ? '/manager' : '/employee', { replace: true });
    }
  }, [user, navigate]);

  // If already logged in, show nothing while redirect happens
  if (user) return null;

  return <LoginPage />;
}

// Wraps routes that need a logged-in user
function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {user.role === 'manager' ? (
            <>
              <Route path="/manager"          element={<ManagerDashboard />} />
              <Route path="/manager/requests" element={<AllRequestsPage />} />
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
            <Route path="/login" element={<LoginRoute />} />
            <Route path="*"     element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}