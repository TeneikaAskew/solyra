import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigGate } from '@/components/auth/ConfigGate';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';

// The gated shell (AuthGate + AppShell + the stores and layout they pull) is
// its own chunk, so `/` — the public landing — downloads none of it
// (issue #26). ConfigGate stays in the entry chunk: it is tiny and it owns
// the runtime-config fetch those routes block on.
const AppGroup = lazy(() => import('@/components/layout/AppGroup'));

const DashboardPage = lazy(() => import('@/routes/DashboardPage'));
const LiveMarketPage = lazy(() => import('@/routes/LiveMarketPage'));
const ChartsPage = lazy(() => import('@/routes/ChartsPage'));
const OptionsFlowPage = lazy(() => import('@/routes/OptionsFlowPage'));
const PlaybookPage = lazy(() => import('@/routes/PlaybookPage'));
const ReportsPage = lazy(() => import('@/routes/ReportsPage'));
const SignalsPage = lazy(() => import('@/routes/SignalsPage'));
const JournalPage = lazy(() => import('@/routes/JournalPage'));
const InsightsPage = lazy(() => import('@/routes/InsightsPage'));
const CatalystsPage = lazy(() => import('@/routes/CatalystsPage'));
const AdminPage = lazy(() => import('@/routes/AdminPage'));
const HelpPage = lazy(() => import('@/routes/HelpPage'));
const SettingsPage = lazy(() => import('@/routes/SettingsPage'));
const LandingPage = lazy(() => import('@/routes/LandingPage'));
const AuthActionPage = lazy(() => import('@/routes/AuthActionPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  );
}

// Per-route errorElement isolates a single page's render crash from the
// AppShell — sidebar + header stay rendered, the bad page shows a card.
const errorElement = <RouteErrorBoundary />;

const router = createBrowserRouter([
  // The site's DEFAULT page — public marketing/landing, all auth modes.
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>,
  },
  { path: '/welcome', element: <Navigate to="/" replace /> },
  // Where the Firebase auth emails' buttons land (password reset, email
  // confirmation, recovery). Public on purpose: the visitor is usually
  // signed out, so it renders outside AuthGate — but INSIDE ConfigGate,
  // because its SDK calls need the runtime web config even signed-out.
  {
    path: '/auth/action',
    element: (
      <ConfigGate>
        <Suspense fallback={<PageLoader />}><AuthActionPage /></Suspense>
      </ConfigGate>
    ),
  },
  // The app group — AuthGate wraps the shell, so in firebase mode a signed-out
  // visitor hitting any app route sees SignInScreen, then the app on success.
  // ConfigGate blocks on the runtime config first (fail-loud, issue #5).
  {
    element: (
      <ConfigGate>
        <Suspense fallback={<PageLoader />}><AppGroup /></Suspense>
      </ConfigGate>
    ),
    errorElement,
    children: [
      { path: '/dashboard', errorElement, element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense> },
      { path: '/live', errorElement, element: <Suspense fallback={<PageLoader />}><LiveMarketPage /></Suspense> },
      { path: '/charts', errorElement, element: <Suspense fallback={<PageLoader />}><ChartsPage /></Suspense> },
      { path: '/options', errorElement, element: <Suspense fallback={<PageLoader />}><OptionsFlowPage /></Suspense> },
      { path: '/playbook', errorElement, element: <Suspense fallback={<PageLoader />}><PlaybookPage /></Suspense> },
      { path: '/reports', errorElement, element: <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense> },
      { path: '/signals', errorElement, element: <Suspense fallback={<PageLoader />}><SignalsPage /></Suspense> },
      { path: '/journal', errorElement, element: <Suspense fallback={<PageLoader />}><JournalPage /></Suspense> },
      { path: '/insights', errorElement, element: <Suspense fallback={<PageLoader />}><InsightsPage /></Suspense> },
      { path: '/catalysts', errorElement, element: <Suspense fallback={<PageLoader />}><CatalystsPage /></Suspense> },
      { path: '/admin', errorElement, element: <Suspense fallback={<PageLoader />}><AdminPage /></Suspense> },
      { path: '/help', errorElement, element: <Suspense fallback={<PageLoader />}><HelpPage /></Suspense> },
      { path: '/settings', errorElement, element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
