import { useParams, useNavigate } from 'react-router-dom';
import { useAppointment, useUpdateAppointmentStatus, useDeleteAppointment } from '../../hooks/useAppointments';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { StatusBadge, getStatusLabel } from '../../components/appointments/StatusBadge';
import { AppointmentTypeBadge, getAppointmentTypeLabel } from '../../components/appointments/AppointmentTypeBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import type { AppointmentStatus } from '../../types/appointment.types';

// Valid status transitions
const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['checked_in', 'in_progress', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

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

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading, error } = useAppointment(id!);
  const updateStatus = useUpdateAppointmentStatus();
  const deleteAppointment = useDeleteAppointment();

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    await updateStatus.mutateAsync({ id: id!, status: newStatus });
  };

  const handleDelete = async () => {
    if (window.confirm('Esta seguro de eliminar esta cita?')) {
      await deleteAppointment.mutateAsync(id!);
      navigate('/appointments');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="text-center py-8 text-red-500">
        Cita no encontrada
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[appointment.status] || [];
  const canChangeStatus = allowedTransitions.length > 0;
  const canDelete = appointment.status !== 'completed';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Detalle de Cita</h1>
          <p className="text-gray-600">{formatDateTime(appointment.appointmentDate)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/appointments')}>
            Volver
          </Button>
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de la Cita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={appointment.status} className="text-sm px-3 py-1" />
              <AppointmentTypeBadge type={appointment.appointmentType} className="text-sm px-3 py-1" />
            </div>

            {canChangeStatus && (
              <div>
                <label className="text-sm font-medium text-gray-700">Cambiar Estado</label>
                <Select
                  value=""
                  onValueChange={(value) => handleStatusChange(value as AppointmentStatus)}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar nuevo estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTransitions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-2">
              <p className="text-sm text-gray-600">
                <strong>Duracion:</strong> {appointment.durationMinutes} minutos
              </p>
              <p className="text-sm text-gray-600">
                <strong>Tipo:</strong> {getAppointmentTypeLabel(appointment.appointmentType)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Patient Card */}
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate(`/patients/${appointment.patient.id}`)}
        >
          <CardHeader>
            <CardTitle className="text-lg">Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-lg">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
            <p className="text-gray-600">
              {calculateAge(appointment.patient.dateOfBirth)} anos
            </p>
            <p className="text-gray-600">{appointment.patient.phone}</p>
            <p className="text-sm text-blue-600 mt-2">Ver perfil del paciente →</p>
          </CardContent>
        </Card>

        {/* Reason Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Motivo de la Consulta</CardTitle>
          </CardHeader>
          <CardContent>
            {appointment.reasonForVisit ? (
              <p className="text-gray-700">{appointment.reasonForVisit}</p>
            ) : (
              <p className="text-gray-500 italic">No especificado</p>
            )}
          </CardContent>
        </Card>

        {/* Medical Record Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expediente Medico</CardTitle>
          </CardHeader>
          <CardContent>
            {appointment.medicalRecord ? (
              <div>
                <p className="text-gray-700 mb-2">
                  Esta cita tiene un expediente medico asociado.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/medical-records/${appointment.medicalRecord!.id}`)}
                >
                  Ver Expediente
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 italic mb-2">
                  No hay expediente medico para esta cita.
                </p>
                {appointment.status === 'in_progress' && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/medical-records/new?appointmentId=${appointment.id}`)}
                  >
                    Crear Expediente
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AppointmentDetailPage;
