import { createBrowserRouter, Navigate, type RouterProviderProps } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const router: RouterProviderProps['router'] = createBrowserRouter(
  [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);

export default router;
