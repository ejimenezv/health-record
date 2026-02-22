import { useNavigate } from 'react-router-dom';
import { useTodayAppointments } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { StatusBadge } from '../../components/appointments/StatusBadge';
import { AppointmentTypeBadge } from '../../components/appointments/AppointmentTypeBadge';

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: todayAppointments, isLoading: loadingAppointments } = useTodayAppointments();
  const { data: patientsData, isLoading: loadingPatients } = usePatients({ limit: 1 });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPatients ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
            ) : (
              <>
                <p className="text-3xl font-bold">{patientsData?.pagination.total || 0}</p>
                <p className="text-gray-500 text-sm">Total registrados</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Citas Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
            ) : (
              <>
                <p className="text-3xl font-bold">{todayAppointments?.length || 0}</p>
                <p className="text-gray-500 text-sm">Programadas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rapidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/patients/new')}
            >
              Nuevo Paciente
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/patients')}
            >
              Nueva Cita
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg">Citas de Hoy</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/appointments')}>
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAppointments ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : todayAppointments?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay citas programadas para hoy
            </p>
          ) : (
            <div className="space-y-2">
              {todayAppointments?.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/appointments/${appointment.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                        <span className="text-gray-500 text-sm ml-2">
                          ({calculateAge(appointment.patient.dateOfBirth)} anos)
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.appointmentDate).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {appointment.reasonForVisit && ` - ${appointment.reasonForVisit}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={appointment.status} />
                      <AppointmentTypeBadge type={appointment.appointmentType} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardPage;
