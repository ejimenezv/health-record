import { createBrowserRouter, Navigate, type RouterProviderProps } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PatientsListPage } from '../pages/patients/PatientsListPage';
import { PatientDetailPage } from '../pages/patients/PatientDetailPage';
import { NewPatientPage } from '../pages/patients/NewPatientPage';
import { EditPatientPage } from '../pages/patients/EditPatientPage';
import { AppointmentsListPage } from '../pages/appointments/AppointmentsListPage';
import { NewAppointmentPage } from '../pages/appointments/NewAppointmentPage';
import { AppointmentDetailPage } from '../pages/appointments/AppointmentDetailPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';

export const router: RouterProviderProps['router'] = createBrowserRouter(
  [
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to="/dashboard" replace />,
        },
        {
          path: 'dashboard',
          element: <DashboardPage />,
        },
        {
          path: 'patients',
          element: <PatientsListPage />,
        },
        {
          path: 'patients/new',
          element: <NewPatientPage />,
        },
        {
          path: 'patients/:id',
          element: <PatientDetailPage />,
        },
        {
          path: 'patients/:id/edit',
          element: <EditPatientPage />,
        },
        {
          path: 'appointments',
          element: <AppointmentsListPage />,
        },
        {
          path: 'appointments/new',
          element: <NewAppointmentPage />,
        },
        {
          path: 'appointments/:id',
          element: <AppointmentDetailPage />,
        },
      ],
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
