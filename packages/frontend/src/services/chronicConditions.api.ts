import api from './api';
import type { ChronicCondition, CreateChronicConditionRequest, UpdateChronicConditionRequest } from '../types/patient.types';

export const chronicConditionsApi = {
  getByPatient: async (patientId: string): Promise<ChronicCondition[]> => {
    const response = await api.get<ChronicCondition[]>(`/patients/${patientId}/chronic-conditions`);
    return response.data;
  },

  getById: async (id: string): Promise<ChronicCondition> => {
    const response = await api.get<ChronicCondition>(`/chronic-conditions/${id}`);
    return response.data;
  },

  create: async (patientId: string, data: CreateChronicConditionRequest): Promise<ChronicCondition> => {
    const response = await api.post<ChronicCondition>(`/patients/${patientId}/chronic-conditions`, data);
    return response.data;
  },

  update: async (id: string, data: UpdateChronicConditionRequest): Promise<ChronicCondition> => {
    const response = await api.put<ChronicCondition>(`/chronic-conditions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/chronic-conditions/${id}`);
  },
};
