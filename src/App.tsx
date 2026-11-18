import { type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider } from './context/NavigationContext';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPlaceholderPage from './pages/DashboardPlaceholderPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/admin/UserManagementPage';
import RoleManagementPage from './pages/admin/RoleManagementPage';
import ModuleManagementPage from './pages/admin/ModuleManagementPage';
import ModuleWorkspacePage from './pages/ModuleWorkspacePage';
import TicketsListPage from './pages/tickets/TicketsListPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';

function ProtectedRoute({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: string;
}) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] dark:bg-[#090D16]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NavigationProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPlaceholderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ProtectedRoute permission="tickets.read">
                    <TicketsListPage
                      defaultView="all"
                      title="All Tickets"
                      subtitle="Organization-wide service desk queue"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/my"
                element={
                  <ProtectedRoute permission="tickets.read">
                    <TicketsListPage
                      defaultView="my"
                      title="My Tickets"
                      subtitle="Tickets assigned to or reported by you"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/assigned"
                element={
                  <ProtectedRoute permission="tickets.read">
                    <TicketsListPage
                      defaultView="assigned"
                      title="Assigned to Me"
                      subtitle="Tickets currently assigned to you"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/created"
                element={
                  <ProtectedRoute permission="tickets.read">
                    <TicketsListPage
                      defaultView="created"
                      title="Created by Me"
                      subtitle="Tickets you submitted"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/unassigned"
                element={
                  <ProtectedRoute permission="tickets.assign">
                    <TicketsListPage
                      defaultView="unassigned"
                      title="Unassigned Tickets"
                      subtitle="Queue awaiting agent assignment"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute permission="tickets.read">
                    <TicketDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute permission="users.manage">
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <ProtectedRoute permission="roles.manage">
                    <RoleManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/modules"
                element={
                  <ProtectedRoute permission="modules.manage">
                    <ModuleManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <ModuleWorkspacePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
