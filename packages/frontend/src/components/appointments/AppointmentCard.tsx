import { useNavigate } from 'react-router-dom';
import type { Appointment } from '../../types/appointment.types';
import { StatusBadge } from './StatusBadge';
import { AppointmentTypeBadge } from './AppointmentTypeBadge';
import { Card, CardContent } from '../ui/card';

interface AppointmentCardProps {
  appointment: Appointment;
  showPatient?: boolean;
}

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

function formatDateTime(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    time: date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function AppointmentCard({ appointment, showPatient = true }: AppointmentCardProps) {
  const navigate = useNavigate();
  const { date, time } = formatDateTime(appointment.appointmentDate);

  return (
    <Card
      className="cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => navigate(`/appointments/${appointment.id}`)}
    >
      <CardContent className="py-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            {showPatient && (
              <p className="font-medium">
                {appointment.patient.firstName} {appointment.patient.lastName}
                <span className="text-gray-500 text-sm ml-2">
                  ({calculateAge(appointment.patient.dateOfBirth)} anos)
                </span>
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{date}</span>
              <span className="font-medium">{time}</span>
              <span>({appointment.durationMinutes} min)</span>
            </div>
            {appointment.reasonForVisit && (
              <p className="text-sm text-gray-600 truncate max-w-xs">
                {appointment.reasonForVisit}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={appointment.status} />
            <AppointmentTypeBadge type={appointment.appointmentType} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AppointmentCard;
