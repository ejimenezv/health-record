import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useMedicalRecord,
  useUpdateMedicalRecord,
  usePatchMedicalRecord,
  useCompleteRecord,
  useAddSymptom,
  useUpdateSymptom,
  useDeleteSymptom,
  useAddPrescription,
  useUpdatePrescription,
  useDeletePrescription,
  useClearAISuggestions,
} from '../../../src/hooks/useMedicalRecord';
import { medicalRecordsApi } from '../../../src/services/medical-records.api';
import React from 'react';

// Mock the medical records API
vi.mock('../../../src/services/medical-records.api', () => ({
  medicalRecordsApi: {
    getByAppointment: vi.fn(),
    updateMedicalRecord: vi.fn(),
    patchMedicalRecord: vi.fn(),
    completeRecord: vi.fn(),
    addSymptom: vi.fn(),
    updateSymptom: vi.fn(),
    deleteSymptom: vi.fn(),
    batchAddSymptoms: vi.fn(),
    addPrescription: vi.fn(),
    updatePrescription: vi.fn(),
    deletePrescription: vi.fn(),
    batchAddPrescriptions: vi.fn(),
    clearAISuggestions: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockMedicalRecord = {
  id: 'record-1',
  appointmentId: 'appointment-1',
  chiefComplaint: 'Dolor de cabeza',
  historyOfPresentIllness: 'Inicio hace 2 semanas',
  physicalExamNotes: 'Sin hallazgos anormales',
  diagnosis: 'Migrania',
  diagnosisNotes: '',
  treatmentPlan: 'Tratamiento conservador',
  followUpInstructions: 'Regresar en 2 semanas',
  patientEducation: '',
  isAIGenerated: false,
  isDraft: true,
  symptoms: [],
  prescriptions: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockSymptom = {
  id: 'symptom-1',
  symptomName: 'Cefalea',
  bodySite: 'Frontal',
  severity: 7,
  duration: '2 semanas',
  notes: '',
  isAIExtracted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockPrescription = {
  id: 'prescription-1',
  medicationName: 'Ibuprofeno',
  strength: '400mg',
  dosage: '1 tableta',
  frequency: 'Cada 8 horas',
  duration: '5 dias',
  quantity: 15,
  refills: 0,
  instructions: 'Tomar con alimentos',
  indication: 'Dolor',
  isAIExtracted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useMedicalRecord hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMedicalRecord', () => {
    it('should fetch medical record successfully', async () => {
      vi.mocked(medicalRecordsApi.getByAppointment).mockResolvedValue(mockMedicalRecord);

      const { result } = renderHook(() => useMedicalRecord('appointment-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMedicalRecord);
      expect(medicalRecordsApi.getByAppointment).toHaveBeenCalledWith('appointment-1');
    });

    it('should not fetch when appointmentId is empty', async () => {
      const { result } = renderHook(() => useMedicalRecord(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(medicalRecordsApi.getByAppointment).not.toHaveBeenCalled();
    });

    it('should handle null medical record', async () => {
      vi.mocked(medicalRecordsApi.getByAppointment).mockResolvedValue(null);

      const { result } = renderHook(() => useMedicalRecord('appointment-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle error state', async () => {
      vi.mocked(medicalRecordsApi.getByAppointment).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMedicalRecord('appointment-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdateMedicalRecord', () => {
    it('should update medical record successfully', async () => {
      vi.mocked(medicalRecordsApi.updateMedicalRecord).mockResolvedValue(mockMedicalRecord);

      const { result } = renderHook(() => useUpdateMedicalRecord(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appointmentId: 'appointment-1',
        data: { chiefComplaint: 'Updated complaint' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.updateMedicalRecord).toHaveBeenCalledWith('appointment-1', {
        chiefComplaint: 'Updated complaint',
      });
    });
  });

  describe('usePatchMedicalRecord', () => {
    it('should patch medical record successfully', async () => {
      vi.mocked(medicalRecordsApi.patchMedicalRecord).mockResolvedValue(mockMedicalRecord);

      const { result } = renderHook(() => usePatchMedicalRecord(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appointmentId: 'appointment-1',
        data: { diagnosis: 'Updated diagnosis' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.patchMedicalRecord).toHaveBeenCalledWith('appointment-1', {
        diagnosis: 'Updated diagnosis',
      });
    });
  });

  describe('useCompleteRecord', () => {
    it('should complete medical record successfully', async () => {
      vi.mocked(medicalRecordsApi.completeRecord).mockResolvedValue({
        ...mockMedicalRecord,
        isDraft: false,
      });

      const { result } = renderHook(() => useCompleteRecord(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('appointment-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.completeRecord).toHaveBeenCalledWith('appointment-1');
    });
  });

  describe('useAddSymptom', () => {
    it('should add symptom successfully', async () => {
      vi.mocked(medicalRecordsApi.addSymptom).mockResolvedValue(mockSymptom);

      const { result } = renderHook(() => useAddSymptom(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appointmentId: 'appointment-1',
        data: { symptomName: 'Cefalea', severity: 7 },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.addSymptom).toHaveBeenCalledWith('appointment-1', {
        symptomName: 'Cefalea',
        severity: 7,
      });
    });
  });

  describe('useUpdateSymptom', () => {
    it('should update symptom successfully', async () => {
      vi.mocked(medicalRecordsApi.updateSymptom).mockResolvedValue(mockSymptom);

      const { result } = renderHook(() => useUpdateSymptom('appointment-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        symptomId: 'symptom-1',
        data: { severity: 8 },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.updateSymptom).toHaveBeenCalledWith(
        'appointment-1',
        'symptom-1',
        { severity: 8 }
      );
    });
  });

  describe('useDeleteSymptom', () => {
    it('should delete symptom successfully', async () => {
      vi.mocked(medicalRecordsApi.deleteSymptom).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteSymptom('appointment-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate('symptom-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.deleteSymptom).toHaveBeenCalledWith('appointment-1', 'symptom-1');
    });
  });

  describe('useAddPrescription', () => {
    it('should add prescription successfully', async () => {
      vi.mocked(medicalRecordsApi.addPrescription).mockResolvedValue(mockPrescription);

      const { result } = renderHook(() => useAddPrescription(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appointmentId: 'appointment-1',
        data: {
          medicationName: 'Ibuprofeno',
          dosage: '1 tableta',
          frequency: 'Cada 8 horas',
          instructions: 'Tomar con alimentos',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.addPrescription).toHaveBeenCalledWith('appointment-1', {
        medicationName: 'Ibuprofeno',
        dosage: '1 tableta',
        frequency: 'Cada 8 horas',
        instructions: 'Tomar con alimentos',
      });
    });
  });

  describe('useUpdatePrescription', () => {
    it('should update prescription successfully', async () => {
      vi.mocked(medicalRecordsApi.updatePrescription).mockResolvedValue(mockPrescription);

      const { result } = renderHook(() => useUpdatePrescription('appointment-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        prescriptionId: 'prescription-1',
        data: { dosage: '2 tabletas' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.updatePrescription).toHaveBeenCalledWith(
        'appointment-1',
        'prescription-1',
        { dosage: '2 tabletas' }
      );
    });
  });

  describe('useDeletePrescription', () => {
    it('should delete prescription successfully', async () => {
      vi.mocked(medicalRecordsApi.deletePrescription).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePrescription('appointment-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate('prescription-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.deletePrescription).toHaveBeenCalledWith(
        'appointment-1',
        'prescription-1'
      );
    });
  });

  describe('useClearAISuggestions', () => {
    it('should clear AI suggestions successfully', async () => {
      vi.mocked(medicalRecordsApi.clearAISuggestions).mockResolvedValue({
        symptomsRemoved: 2,
        prescriptionsRemoved: 1,
        fieldsCleared: ['chiefComplaint', 'diagnosis'],
      });

      const { result } = renderHook(() => useClearAISuggestions(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('appointment-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(medicalRecordsApi.clearAISuggestions).toHaveBeenCalledWith('appointment-1');
    });
  });
});
