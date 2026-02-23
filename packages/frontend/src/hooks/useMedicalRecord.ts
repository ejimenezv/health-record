import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalRecordsApi } from '../services/medical-records.api';
import {
  CreateSymptomRequest,
  UpdateSymptomRequest,
  CreatePrescriptionRequest,
  UpdatePrescriptionRequest,
  UpdateMedicalRecordRequest,
  PatchMedicalRecordRequest,
} from '../types/medical-records.types';

export const useMedicalRecord = (appointmentId: string) => {
  return useQuery({
    queryKey: ['medical-record', appointmentId],
    queryFn: () => medicalRecordsApi.getByAppointment(appointmentId),
    enabled: !!appointmentId,
  });
};

export const useUpdateMedicalRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: UpdateMedicalRecordRequest;
    }) => medicalRecordsApi.updateMedicalRecord(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', variables.appointmentId] });
    },
  });
};

export const usePatchMedicalRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: PatchMedicalRecordRequest;
    }) => medicalRecordsApi.patchMedicalRecord(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

export const useCompleteRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => medicalRecordsApi.completeRecord(appointmentId),
    onSuccess: (_, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

// Symptoms
export const useAddSymptom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: CreateSymptomRequest;
    }) => medicalRecordsApi.addSymptom(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

export const useUpdateSymptom = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ symptomId, data }: { symptomId: string; data: UpdateSymptomRequest }) =>
      medicalRecordsApi.updateSymptom(appointmentId, symptomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

export const useDeleteSymptom = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symptomId: string) => medicalRecordsApi.deleteSymptom(appointmentId, symptomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

export const useBatchAddSymptoms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      symptoms,
    }: {
      appointmentId: string;
      symptoms: CreateSymptomRequest[];
    }) => medicalRecordsApi.batchAddSymptoms(appointmentId, symptoms),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

// Prescriptions
export const useAddPrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: CreatePrescriptionRequest;
    }) => medicalRecordsApi.addPrescription(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

export const useUpdatePrescription = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      prescriptionId,
      data,
    }: {
      prescriptionId: string;
      data: UpdatePrescriptionRequest;
    }) => medicalRecordsApi.updatePrescription(appointmentId, prescriptionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

export const useDeletePrescription = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prescriptionId: string) =>
      medicalRecordsApi.deletePrescription(appointmentId, prescriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

export const useBatchAddPrescriptions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      prescriptions,
    }: {
      appointmentId: string;
      prescriptions: CreatePrescriptionRequest[];
    }) => medicalRecordsApi.batchAddPrescriptions(appointmentId, prescriptions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

// AI Suggestions
export const useClearAISuggestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => medicalRecordsApi.clearAISuggestions(appointmentId),
    onSuccess: (_, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};
