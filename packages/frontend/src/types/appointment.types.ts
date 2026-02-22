export type AppointmentStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'new_patient' | 'follow_up' | 'routine_checkup' | 'sick_visit' | 'telehealth';

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  appointmentDate: string;
  appointmentType: AppointmentType;
  reasonForVisit?: string | null;
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
  };
  medicalRecord?: {
    id: string;
  } | null;
}

export interface CreateAppointmentRequest {
  patientId: string;
  appointmentDate: string;
  appointmentType: AppointmentType;
  reasonForVisit?: string | null;
  durationMinutes?: number;
}

export interface UpdateAppointmentRequest {
  appointmentDate?: string;
  appointmentType?: AppointmentType;
  reasonForVisit?: string | null;
  durationMinutes?: number;
}

export interface AppointmentQuery {
  patientId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
