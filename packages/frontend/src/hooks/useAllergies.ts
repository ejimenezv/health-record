import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allergiesApi } from '../services/allergies.api';
import type { CreateAllergyRequest, UpdateAllergyRequest } from '../types/patient.types';

export function usePatientAllergies(patientId: string) {
  return useQuery({
    queryKey: ['allergies', patientId],
    queryFn: () => allergiesApi.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useAllergy(id: string) {
  return useQuery({
    queryKey: ['allergy', id],
    queryFn: () => allergiesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAllergy(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAllergyRequest) => allergiesApi.create(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergies', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

export function useUpdateAllergy(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAllergyRequest }) =>
      allergiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergies', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

export function useDeleteAllergy(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => allergiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergies', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}
