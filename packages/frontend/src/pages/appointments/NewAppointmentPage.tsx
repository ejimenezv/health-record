import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePatient } from '../../hooks/usePatients';
import { useCreateAppointment } from '../../hooks/useAppointments';
import { AppointmentForm } from '../../components/appointments/AppointmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { CreateAppointmentRequest } from '../../types/appointment.types';

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId || '');
  const createAppointment = useCreateAppointment();

  const handleSubmit = async (data: CreateAppointmentRequest) => {
    const result = await createAppointment.mutateAsync(data);
    // Navigate to the appointment detail page
    navigate(`/appointments/${result.id}`);
  };

  const handleCancel = () => {
    if (patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      navigate('/appointments');
    }
  };

  if (!patientId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Nueva Cita</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">
              Para crear una cita, primero seleccione un paciente desde su perfil.
            </p>
            <button
              onClick={() => navigate('/patients')}
              className="text-blue-600 hover:underline"
            >
              Ver lista de pacientes
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingPatient) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-8 text-red-500">
        Paciente no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nueva Cita</h1>

      <Card>
        <CardHeader>
          <CardTitle>Programar Cita</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentForm
            patientId={patient.id}
            patientName={`${patient.firstName} ${patient.lastName}`}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createAppointment.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default NewAppointmentPage;
