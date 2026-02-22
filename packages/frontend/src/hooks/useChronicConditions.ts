import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chronicConditionsApi } from '../services/chronicConditions.api';
import type { CreateChronicConditionRequest, UpdateChronicConditionRequest } from '../types/patient.types';

export function usePatientChronicConditions(patientId: string) {
  return useQuery({
    queryKey: ['chronicConditions', patientId],
    queryFn: () => chronicConditionsApi.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useChronicCondition(id: string) {
  return useQuery({
    queryKey: ['chronicCondition', id],
    queryFn: () => chronicConditionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateChronicCondition(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChronicConditionRequest) => chronicConditionsApi.create(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chronicConditions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

export function useUpdateChronicCondition(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChronicConditionRequest }) =>
      chronicConditionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chronicConditions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

export function useDeleteChronicCondition(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chronicConditionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chronicConditions', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}
