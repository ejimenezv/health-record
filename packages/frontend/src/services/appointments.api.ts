import api from './api';
import { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest, AppointmentQuery, AppointmentStatus } from '../types/appointment.types';
import { PaginatedResponse } from '../types/common.types';
import { ApiResponse } from '../types/auth.types';

export const appointmentsApi = {
  getAll: async (query?: AppointmentQuery): Promise<PaginatedResponse<Appointment>> => {
    const params = new URLSearchParams();
    if (query?.patientId) params.append('patientId', query.patientId);
    if (query?.status) params.append('status', query.status);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await api.get<ApiResponse<Appointment[]> & { pagination: PaginatedResponse<Appointment>['pagination'] }>(
      `/appointments?${params.toString()}`
    );
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  getToday: async (): Promise<Appointment[]> => {
    const response = await api.get<ApiResponse<Appointment[]>>('/appointments/today');
    return response.data.data!;
  },

  getById: async (id: string): Promise<Appointment> => {
    const response = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateAppointmentRequest): Promise<Appointment> => {
    const response = await api.post<ApiResponse<Appointment>>('/appointments', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateAppointmentRequest): Promise<Appointment> => {
    const response = await api.put<ApiResponse<Appointment>>(`/appointments/${id}`, data);
    return response.data.data!;
  },

  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const response = await api.patch<ApiResponse<Appointment>>(`/appointments/${id}/status`, { status });
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },
};
