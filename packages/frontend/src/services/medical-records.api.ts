import api from './api';
import { ApiResponse } from '../types/auth.types';
import {
  MedicalRecord,
  Symptom,
  Prescription,
  CreateSymptomRequest,
  UpdateSymptomRequest,
  CreatePrescriptionRequest,
  UpdatePrescriptionRequest,
  UpdateMedicalRecordRequest,
  PatchMedicalRecordRequest,
} from '../types/medical-records.types';

export const medicalRecordsApi = {
  // Medical Record
  getByAppointment: async (appointmentId: string): Promise<MedicalRecord | null> => {
    const response = await api.get<ApiResponse<MedicalRecord | null>>(
      `/appointments/${appointmentId}/record`
    );
    return response.data.data ?? null;
  },

  updateMedicalRecord: async (
    appointmentId: string,
    data: UpdateMedicalRecordRequest
  ): Promise<MedicalRecord> => {
    const response = await api.put<ApiResponse<MedicalRecord>>(
      `/appointments/${appointmentId}/record`,
      data
    );
    return response.data.data!;
  },

  patchMedicalRecord: async (
    appointmentId: string,
    data: PatchMedicalRecordRequest
  ): Promise<MedicalRecord> => {
    const response = await api.patch<ApiResponse<MedicalRecord>>(
      `/appointments/${appointmentId}/record`,
      data
    );
    return response.data.data!;
  },

  completeRecord: async (appointmentId: string): Promise<MedicalRecord> => {
    const response = await api.post<ApiResponse<MedicalRecord>>(
      `/appointments/${appointmentId}/record/complete`
    );
    return response.data.data!;
  },

  // Symptoms
  addSymptom: async (appointmentId: string, data: CreateSymptomRequest): Promise<Symptom> => {
    const response = await api.post<ApiResponse<Symptom>>(
      `/appointments/${appointmentId}/record/symptoms`,
      data
    );
    return response.data.data!;
  },

  updateSymptom: async (
    appointmentId: string,
    symptomId: string,
    data: UpdateSymptomRequest
  ): Promise<Symptom> => {
    const response = await api.patch<ApiResponse<Symptom>>(
      `/appointments/${appointmentId}/record/symptoms/${symptomId}`,
      data
    );
    return response.data.data!;
  },

  deleteSymptom: async (appointmentId: string, symptomId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/record/symptoms/${symptomId}`);
  },

  batchAddSymptoms: async (
    appointmentId: string,
    symptoms: CreateSymptomRequest[]
  ): Promise<{ count: number }> => {
    const response = await api.post<ApiResponse<{ count: number }>>(
      `/appointments/${appointmentId}/record/symptoms/batch`,
      { symptoms }
    );
    return response.data.data!;
  },

  // Prescriptions
  addPrescription: async (
    appointmentId: string,
    data: CreatePrescriptionRequest
  ): Promise<Prescription> => {
    const response = await api.post<ApiResponse<Prescription>>(
      `/appointments/${appointmentId}/record/prescriptions`,
      data
    );
    return response.data.data!;
  },

  updatePrescription: async (
    appointmentId: string,
    prescriptionId: string,
    data: UpdatePrescriptionRequest
  ): Promise<Prescription> => {
    const response = await api.patch<ApiResponse<Prescription>>(
      `/appointments/${appointmentId}/record/prescriptions/${prescriptionId}`,
      data
    );
    return response.data.data!;
  },

  deletePrescription: async (appointmentId: string, prescriptionId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/record/prescriptions/${prescriptionId}`);
  },

  batchAddPrescriptions: async (
    appointmentId: string,
    prescriptions: CreatePrescriptionRequest[]
  ): Promise<{ count: number }> => {
    const response = await api.post<ApiResponse<{ count: number }>>(
      `/appointments/${appointmentId}/record/prescriptions/batch`,
      { prescriptions }
    );
    return response.data.data!;
  },

  // AI Suggestions
  clearAISuggestions: async (
    appointmentId: string
  ): Promise<{ symptomsRemoved: number; prescriptionsRemoved: number; fieldsCleared: string[] }> => {
    const response = await api.delete<
      ApiResponse<{ symptomsRemoved: number; prescriptionsRemoved: number; fieldsCleared: string[] }>
    >(`/appointments/${appointmentId}/record/ai-suggestions`);
    return response.data.data!;
  },
};
