import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider } from './context/NavigationContext';
import { AppShell } from './components/layout/AppShell';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const RoleManagementPage = lazy(() => import('./pages/admin/RoleManagementPage'));
const ModuleManagementPage = lazy(() => import('./pages/admin/ModuleManagementPage'));
const ModuleWorkspacePage = lazy(() => import('./pages/ModuleWorkspacePage'));
const TicketsListPage = lazy(() => import('./pages/tickets/TicketsListPage'));
const TicketDetailPage = lazy(() => import('./pages/tickets/TicketDetailPage'));
const OutlookInboxPage = lazy(() => import('./pages/emails/OutlookInboxPage'));
const EmailConversationsPage = lazy(() => import('./pages/emails/EmailConversationsPage'));
const JiraIntegrationPage = lazy(() => import('./pages/jira/JiraIntegrationPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
    </div>
  );
}

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
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#111215]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NavigationProvider>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#111215]">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              }
            >
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
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
                  path="/emails"
                  element={
                    <ProtectedRoute permission="emails.read">
                      <OutlookInboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emails/inbox"
                  element={
                    <ProtectedRoute permission="emails.read">
                      <OutlookInboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emails/conversations"
                  element={
                    <ProtectedRoute permission="emails.read">
                      <EmailConversationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jira/*"
                  element={
                    <ProtectedRoute permission="jira.read">
                      <JiraIntegrationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/tickets"
                  element={
                    <ProtectedRoute permission="reports.read">
                      <ReportsPage section="tickets" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/users"
                  element={
                    <ProtectedRoute permission="reports.read">
                      <ReportsPage section="users" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/modules"
                  element={
                    <ProtectedRoute permission="reports.read">
                      <ReportsPage section="modules" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/*"
                  element={
                    <ProtectedRoute permission="reports.read">
                      <ReportsPage section="tickets" />
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
            </Suspense>
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
