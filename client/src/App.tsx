import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { store } from '@/store';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppLayout from '@/components/layout/AppLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import OnboardingPage from '@/pages/auth/OnboardingPage';

// App Pages
import DashboardPage from '@/pages/DashboardPage';
import WorkspacePage from '@/pages/workspace/WorkspacePage';
import ModulePage from '@/pages/workspace/ModulePage';
import EntityPage from '@/pages/workspace/EntityPage';
import ProjectPage from '@/pages/workspace/ProjectPage';
import TasksPage from '@/pages/TasksPage';
import CalendarPage from '@/pages/CalendarPage';
import DocumentsPage from '@/pages/DocumentsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import FinancePage from '@/pages/FinancePage';
import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function SplashScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse-glow">
          <span className="text-white font-bold text-xl">W</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute:
 *  - If loading → splash
 *  - If not logged in → /login
 *  - If logged in but no orgId → /onboarding (must complete setup)
 *  - Otherwise → render children
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading, profileLoading } = useAuth();

  // Auth state still being resolved
  if (loading || profileLoading) return <SplashScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;

  // User is authenticated but profile confirmed has no orgId → onboarding
  if (userProfile !== null && !userProfile?.orgId) {
    return <Navigate to="/onboarding" replace />;
  }

  // Profile unexpectedly null after loading (edge case) — show splash briefly
  if (userProfile === null) return <SplashScreen />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading, profileLoading } = useAuth();
  if (loading || profileLoading) return <SplashScreen />;
  if (currentUser && userProfile?.orgId) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Onboarding route: accessible only when logged in */
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="workspace/:workspaceId" element={<WorkspacePage />} />
        <Route path="workspace/:workspaceId/module/:moduleId" element={<ModulePage />} />
        <Route path="workspace/:workspaceId/module/:moduleId/entity/:entityId" element={<EntityPage />} />
        <Route path="workspace/:workspaceId/project/:projectId" element={<ProjectPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <ThemeProvider>
              <WorkspaceProvider>
                <AppRoutes />
                <Toaster
                  theme="dark"
                  position="bottom-right"
                  toastOptions={{
                    style: {
                      background: 'hsl(224 40% 7%)',
                      border: '1px solid hsl(224 40% 14%)',
                      color: 'hsl(215 20% 92%)',
                    },
                  }}
                />
              </WorkspaceProvider>
            </ThemeProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}
