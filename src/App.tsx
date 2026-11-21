import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/app/AuthContext';
import { ToastProvider } from '@/src/app/ToastContext';
import { WorkspaceProvider } from '@/src/app/WorkspaceContext';
import { AppShell } from '@/src/components/layout/AppShell';
import { ErrorBoundary } from '@/src/components/ui/ErrorBoundary';
import { SakuinLogo } from '@/src/components/ui/SakuinLogo';
import { DashboardSkeleton } from '@/src/components/ui/Skeleton';
import { AuthPage } from '@/src/features/auth/AuthPage';
import { SplashScreen } from '@/src/features/auth/SplashScreen';

const DashboardPage = lazy(() =>
  import('@/src/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const TransactionsPage = lazy(() =>
  import('@/src/features/transactions/TransactionsPage').then((m) => ({
    default: m.TransactionsPage,
  }))
);
const BudgetsPage = lazy(() =>
  import('@/src/features/budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage }))
);
const ReportsPage = lazy(() =>
  import('@/src/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const EvaluationPage = lazy(() =>
  import('@/src/features/evaluation/EvaluationPage').then((m) => ({ default: m.EvaluationPage }))
);
const NotificationsPage = lazy(() =>
  import('@/src/features/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  }))
);
const GroupsPage = lazy(() =>
  import('@/src/features/groups/GroupsPage').then((m) => ({ default: m.GroupsPage }))
);
const PremiumPage = lazy(() =>
  import('@/src/features/premium/PremiumPage').then((m) => ({ default: m.PremiumPage }))
);
const SavingsPage = lazy(() =>
  import('@/src/features/premium/SavingsPage').then((m) => ({ default: m.SavingsPage }))
);
const AccountPage = lazy(() =>
  import('@/src/features/account/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const AkadInfoPage = lazy(() =>
  import('@/src/features/info/AkadInfoPage').then((m) => ({ default: m.AkadInfoPage }))
);

function RouteLoadingFallback() {
  return (
    <div className="py-6">
      <DashboardSkeleton />
    </div>
  );
}

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isDemoMode, authReady } = useAuth();
  if (!authReady) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <SakuinLogo size="lg" />
      </div>
    );
  }
  if (!firebaseUser && !isDemoMode) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AppShell>
      <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
    </AppShell>
  );
}

function AppRoutes() {
  const { firebaseUser, isDemoMode, authReady } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    const seen = sessionStorage.getItem('sakuin_splash_seen');
    return !seen;
  });

  useEffect(() => {
    if (!showSplash) {
      sessionStorage.setItem('sakuin_splash_seen', '1');
    }
  }, [showSplash]);

  if (showSplash || !authReady) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const isAuthenticated = Boolean(firebaseUser) || isDemoMode;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/akad-publik"
        element={
          <div className="min-h-[100dvh] bg-slate-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
              <SakuinLogo size="md" />
              <Link
                to="/login"
                className="min-h-[40px] inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Kembali ke Login
              </Link>
            </div>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AkadInfoPage />
            </Suspense>
          </div>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedShell>
            <DashboardPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/transaksi"
        element={
          <ProtectedShell>
            <TransactionsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/anggaran"
        element={
          <ProtectedShell>
            <BudgetsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/laporan"
        element={
          <ProtectedShell>
            <ReportsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/evaluasi"
        element={
          <ProtectedShell>
            <EvaluationPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/peringatan"
        element={
          <ProtectedShell>
            <NotificationsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/kelompok"
        element={
          <ProtectedShell>
            <GroupsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/tabungan"
        element={
          <ProtectedShell>
            <SavingsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/premium"
        element={
          <ProtectedShell>
            <PremiumPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/akun"
        element={
          <ProtectedShell>
            <AccountPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/akad"
        element={
          <ProtectedShell>
            <AkadInfoPage />
          </ProtectedShell>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <AppRoutes />
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
