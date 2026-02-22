import type { AppointmentType } from '../../types/appointment.types';

interface AppointmentTypeBadgeProps {
  type: AppointmentType;
  className?: string;
}

const typeConfig: Record<AppointmentType, { label: string; className: string }> = {
  new_patient: {
    label: 'Nuevo Paciente',
    className: 'bg-purple-100 text-purple-800',
  },
  follow_up: {
    label: 'Seguimiento',
    className: 'bg-blue-100 text-blue-800',
  },
  routine_checkup: {
    label: 'Chequeo Rutina',
    className: 'bg-green-100 text-green-800',
  },
  sick_visit: {
    label: 'Consulta Enfermedad',
    className: 'bg-orange-100 text-orange-800',
  },
  telehealth: {
    label: 'Telemedicina',
    className: 'bg-cyan-100 text-cyan-800',
  },
};

export function AppointmentTypeBadge({ type, className = '' }: AppointmentTypeBadgeProps) {
  const config = typeConfig[type] || typeConfig.follow_up;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export function getAppointmentTypeLabel(type: AppointmentType): string {
  return typeConfig[type]?.label || type;
}

export default AppointmentTypeBadge;
