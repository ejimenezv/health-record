import api from './api';
import { Patient, CreatePatientRequest, UpdatePatientRequest, PatientQuery } from '../types/patient.types';
import { PaginatedResponse } from '../types/common.types';
import { ApiResponse } from '../types/auth.types';

export const patientsApi = {
  getAll: async (query?: PatientQuery): Promise<PaginatedResponse<Patient>> => {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const response = await api.get<ApiResponse<Patient[]> & { pagination: PaginatedResponse<Patient>['pagination'] }>(
      `/patients?${params.toString()}`
    );
    return {
      data: response.data.data!,
      pagination: response.data.pagination,
    };
  },

  getById: async (id: string): Promise<Patient> => {
    const response = await api.get<ApiResponse<Patient>>(`/patients/${id}`);
    return response.data.data!;
  },

  create: async (data: CreatePatientRequest): Promise<Patient> => {
    const response = await api.post<ApiResponse<Patient>>('/patients', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdatePatientRequest): Promise<Patient> => {
    const response = await api.put<ApiResponse<Patient>>(`/patients/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
};
