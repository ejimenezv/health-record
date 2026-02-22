import api from './api';
import type { Allergy, CreateAllergyRequest, UpdateAllergyRequest } from '../types/patient.types';

export const allergiesApi = {
  getByPatient: async (patientId: string): Promise<Allergy[]> => {
    const response = await api.get<Allergy[]>(`/patients/${patientId}/allergies`);
    return response.data;
  },

  getById: async (id: string): Promise<Allergy> => {
    const response = await api.get<Allergy>(`/allergies/${id}`);
    return response.data;
  },

  create: async (patientId: string, data: CreateAllergyRequest): Promise<Allergy> => {
    const response = await api.post<Allergy>(`/patients/${patientId}/allergies`, data);
    return response.data;
  },

  update: async (id: string, data: UpdateAllergyRequest): Promise<Allergy> => {
    const response = await api.put<Allergy>(`/allergies/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/allergies/${id}`);
  },
};
