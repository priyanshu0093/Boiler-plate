import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import DashboardPage from './pages/DashboardPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminResourcesPage from './pages/AdminResourcesPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import WorkspaceMembersPage from './pages/WorkspaceMembersPage';
import PlatformAdminPage from './pages/PlatformAdminPage';
import ProfilePage from './pages/ProfilePage';

function HomePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loadingOrgs } = useOrganization();

  if (authLoading || (isAuthenticated && loadingOrgs)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Loading Boiler Plate...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <DashboardPage />
      <Toast />
    </div>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loadingOrgs } = useOrganization();

  if (authLoading || (isAuthenticated && loadingOrgs)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Loading Boiler Plate Workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <Outlet />
      <Toast />
    </div>
  );
}

function AdminRoute() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();

  // Admin access granted if platform ADMIN or tenant ADMIN / OWNER
  const isOrgAdmin =
    user?.role === 'ADMIN' ||
    (activeOrganization?.memberRole && ['OWNER', 'ADMIN'].includes(activeOrganization.memberRole));

  if (!isOrgAdmin) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function PlatformAdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <SocketProvider>
            <NotificationProvider>
              <Routes>
                {/* Public & Onboarding Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/invitations/accept" element={<AcceptInvitationPage />} />

                {/* Authenticated Workspace Routes */}
                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/bookings" element={<MyBookingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Organization Admin & Owner Controls */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/resources" element={<AdminResourcesPage />} />
                    <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                    <Route path="/admin/members" element={<WorkspaceMembersPage />} />
                  </Route>

                  {/* Platform Super Admin Controls */}
                  <Route element={<PlatformAdminRoute />}>
                    <Route path="/platform-admin" element={<PlatformAdminPage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </NotificationProvider>
          </SocketProvider>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
