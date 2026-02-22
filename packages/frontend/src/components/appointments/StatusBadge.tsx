import type { AppointmentStatus } from '../../types/appointment.types';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: {
    label: 'Programada',
    className: 'bg-blue-100 text-blue-800',
  },
  checked_in: {
    label: 'Registrado',
    className: 'bg-yellow-100 text-yellow-800',
  },
  in_progress: {
    label: 'En Progreso',
    className: 'bg-orange-100 text-orange-800',
  },
  completed: {
    label: 'Completada',
    className: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-gray-100 text-gray-800',
  },
  no_show: {
    label: 'No Asistio',
    className: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: AppointmentStatus): string {
  return statusConfig[status]?.label || status;
}

export function getStatusColor(status: AppointmentStatus): string {
  return statusConfig[status]?.className || 'bg-gray-100 text-gray-800';
}

export default StatusBadge;
