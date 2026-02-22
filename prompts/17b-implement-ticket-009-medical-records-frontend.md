# Prompt 17b: Implement TICKET-009 - Medical Records Frontend

## Context
You are implementing the Medical Record System MVP. Medical records backend (TICKET-008) is complete.

## Documentation to Read
**IMPORTANT: Read and understand these files before implementing:**
- `docs/tickets/TICKET-009-medical-records-frontend.md` - Frontend requirements
- `docs/frontend/pages/appointment.md` - Appointment page design
- `docs/frontend/components/medical-record-components.md` - Component specs

## Verify Prerequisites
```bash
# 1. Backend is running
cd packages/backend && pnpm dev

# 2. Medical records API works
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medrecord.com","password":"password123"}' | jq -r '.data.token')

# Get an appointment and test medical record endpoint
curl http://localhost:3001/api/v1/appointments/today \
  -H "Authorization: Bearer $TOKEN" | jq
```

**If any verification fails:** Go back to Prompt 17a.

---

## Objective
Implement frontend for medical records with:
- Medical record types
- API service for medical records, symptoms, diagnosis, prescriptions
- React Query hooks for all operations
- Symptoms section component with add/edit/delete
- Diagnosis section component
- Prescriptions section component
- Medical record form with auto-save
- Appointment page with full medical record management
- AI-generated field indicators

---

## Step 1: Create Medical Records Types
Create `packages/frontend/src/types/medical-records.types.ts`:

```typescript
export interface Symptom {
  id: string;
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  onset?: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Diagnosis {
  id: string;
  description: string;
  icdCode?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  aiGenerated: boolean;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  chiefComplaint?: string;
  presentIllness?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
  symptoms: Symptom[];
  diagnosis?: Diagnosis | null;
  prescriptions: Prescription[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithMedicalRecord {
  id: string;
  patientId: string;
  scheduledAt: string;
  status: string;
  type: string;
  reasonForVisit?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  medicalRecord?: MedicalRecord | null;
}

// Request types
export interface CreateSymptomRequest {
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  onset?: string;
  aiGenerated?: boolean;
}

export interface CreateDiagnosisRequest {
  description: string;
  icdCode?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  aiGenerated?: boolean;
  confidence?: number;
}

export interface CreatePrescriptionRequest {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  aiGenerated?: boolean;
}

export interface UpdateMedicalRecordRequest {
  chiefComplaint?: string;
  presentIllness?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
}
```

---

## Step 2: Create Medical Records API Service
Create `packages/frontend/src/services/medical-records.api.ts`:

```typescript
import api from './api';
import { ApiResponse } from '../types/auth.types';
import {
  AppointmentWithMedicalRecord,
  MedicalRecord,
  Symptom,
  Diagnosis,
  Prescription,
  CreateSymptomRequest,
  CreateDiagnosisRequest,
  CreatePrescriptionRequest,
  UpdateMedicalRecordRequest,
} from '../types/medical-records.types';

export const medicalRecordsApi = {
  // Medical Record
  getByAppointment: async (appointmentId: string): Promise<AppointmentWithMedicalRecord> => {
    const response = await api.get<ApiResponse<AppointmentWithMedicalRecord>>(
      `/appointments/${appointmentId}/medical-record`
    );
    return response.data.data!;
  },

  updateMedicalRecord: async (
    appointmentId: string,
    data: UpdateMedicalRecordRequest
  ): Promise<MedicalRecord> => {
    const response = await api.put<ApiResponse<MedicalRecord>>(
      `/appointments/${appointmentId}/medical-record`,
      data
    );
    return response.data.data!;
  },

  // Symptoms
  addSymptom: async (appointmentId: string, data: CreateSymptomRequest): Promise<Symptom> => {
    const response = await api.post<ApiResponse<Symptom>>(
      `/appointments/${appointmentId}/symptoms`,
      data
    );
    return response.data.data!;
  },

  updateSymptom: async (symptomId: string, data: Partial<CreateSymptomRequest>): Promise<Symptom> => {
    const response = await api.put<ApiResponse<Symptom>>(`/symptoms/${symptomId}`, data);
    return response.data.data!;
  },

  deleteSymptom: async (symptomId: string): Promise<void> => {
    await api.delete(`/symptoms/${symptomId}`);
  },

  // Diagnosis
  setDiagnosis: async (appointmentId: string, data: CreateDiagnosisRequest): Promise<Diagnosis> => {
    const response = await api.put<ApiResponse<Diagnosis>>(
      `/appointments/${appointmentId}/diagnosis`,
      data
    );
    return response.data.data!;
  },

  deleteDiagnosis: async (appointmentId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/diagnosis`);
  },

  // Prescriptions
  addPrescription: async (
    appointmentId: string,
    data: CreatePrescriptionRequest
  ): Promise<Prescription> => {
    const response = await api.post<ApiResponse<Prescription>>(
      `/appointments/${appointmentId}/prescriptions`,
      data
    );
    return response.data.data!;
  },

  updatePrescription: async (
    prescriptionId: string,
    data: Partial<CreatePrescriptionRequest>
  ): Promise<Prescription> => {
    const response = await api.put<ApiResponse<Prescription>>(
      `/prescriptions/${prescriptionId}`,
      data
    );
    return response.data.data!;
  },

  deletePrescription: async (prescriptionId: string): Promise<void> => {
    await api.delete(`/prescriptions/${prescriptionId}`);
  },
};
```

---

## Step 3: Create Medical Records Hooks
Create `packages/frontend/src/hooks/useMedicalRecord.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalRecordsApi } from '../services/medical-records.api';
import {
  CreateSymptomRequest,
  CreateDiagnosisRequest,
  CreatePrescriptionRequest,
  UpdateMedicalRecordRequest,
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
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: UpdateMedicalRecordRequest }) =>
      medicalRecordsApi.updateMedicalRecord(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

// Symptoms
export const useAddSymptom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: CreateSymptomRequest }) =>
      medicalRecordsApi.addSymptom(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

export const useUpdateSymptom = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ symptomId, data }: { symptomId: string; data: Partial<CreateSymptomRequest> }) =>
      medicalRecordsApi.updateSymptom(symptomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

export const useDeleteSymptom = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symptomId: string) => medicalRecordsApi.deleteSymptom(symptomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

// Diagnosis
export const useSetDiagnosis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: CreateDiagnosisRequest }) =>
      medicalRecordsApi.setDiagnosis(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

export const useDeleteDiagnosis = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => medicalRecordsApi.deleteDiagnosis(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

// Prescriptions
export const useAddPrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: CreatePrescriptionRequest }) =>
      medicalRecordsApi.addPrescription(appointmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', variables.appointmentId] });
    },
  });
};

export const useUpdatePrescription = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prescriptionId, data }: { prescriptionId: string; data: Partial<CreatePrescriptionRequest> }) =>
      medicalRecordsApi.updatePrescription(prescriptionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};

export const useDeletePrescription = (appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prescriptionId: string) => medicalRecordsApi.deletePrescription(prescriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', appointmentId] });
    },
  });
};
```

---

## Step 4: Create AI Badge Component
Create `packages/frontend/src/components/ui/ai-badge.tsx`:

```typescript
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIBadgeProps {
  className?: string;
  confidence?: number;
}

export function AIBadge({ className, confidence }: AIBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700',
        className
      )}
      title={confidence ? `Confianza: ${Math.round(confidence * 100)}%` : 'Generado por IA'}
    >
      <Sparkles className="h-3 w-3" />
      IA
      {confidence && <span className="ml-1">{Math.round(confidence * 100)}%</span>}
    </span>
  );
}
```

---

## Step 5: Create Symptoms Section Component
Create `packages/frontend/src/components/medical-record/SymptomsSection.tsx`:

```typescript
import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AIBadge } from '../ui/ai-badge';
import { Symptom, CreateSymptomRequest } from '../../types/medical-records.types';

interface SymptomsSectionProps {
  symptoms: Symptom[];
  onAdd: (data: CreateSymptomRequest) => Promise<void>;
  onUpdate: (symptomId: string, data: Partial<CreateSymptomRequest>) => Promise<void>;
  onDelete: (symptomId: string) => Promise<void>;
  disabled?: boolean;
}

export function SymptomsSection({
  symptoms,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false,
}: SymptomsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSymptom, setNewSymptom] = useState<CreateSymptomRequest>({
    description: '',
    severity: undefined,
    duration: '',
    onset: '',
  });

  const handleAdd = async () => {
    if (!newSymptom.description.trim()) return;
    await onAdd(newSymptom);
    setNewSymptom({ description: '', severity: undefined, duration: '', onset: '' });
    setIsAdding(false);
  };

  const handleUpdate = async (symptomId: string, data: Partial<CreateSymptomRequest>) => {
    await onUpdate(symptomId, data);
    setEditingId(null);
  };

  const getSeverityLabel = (severity?: string) => {
    const labels: Record<string, string> = {
      mild: 'Leve',
      moderate: 'Moderado',
      severe: 'Severo',
    };
    return severity ? labels[severity] : '';
  };

  const getSeverityColor = (severity?: string) => {
    const colors: Record<string, string> = {
      mild: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      severe: 'bg-red-100 text-red-700',
    };
    return severity ? colors[severity] : '';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Síntomas</CardTitle>
        {!disabled && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new symptom form */}
        {isAdding && (
          <div className="p-3 border rounded-lg space-y-3 bg-gray-50">
            <Input
              placeholder="Descripción del síntoma..."
              value={newSymptom.description}
              onChange={(e) => setNewSymptom({ ...newSymptom, description: e.target.value })}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={newSymptom.severity}
                onValueChange={(value) => setNewSymptom({ ...newSymptom, severity: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="severe">Severo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Duración"
                value={newSymptom.duration}
                onChange={(e) => setNewSymptom({ ...newSymptom, duration: e.target.value })}
              />
              <Input
                placeholder="Inicio"
                value={newSymptom.onset}
                onChange={(e) => setNewSymptom({ ...newSymptom, onset: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Symptoms list */}
        {symptoms.length === 0 && !isAdding ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No hay síntomas registrados
          </p>
        ) : (
          <ul className="space-y-2">
            {symptoms.map((symptom) => (
              <li
                key={symptom.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{symptom.description}</span>
                    {symptom.aiGenerated && <AIBadge />}
                    {symptom.severity && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(symptom.severity)}`}>
                        {getSeverityLabel(symptom.severity)}
                      </span>
                    )}
                  </div>
                  {(symptom.duration || symptom.onset) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {symptom.duration && `Duración: ${symptom.duration}`}
                      {symptom.duration && symptom.onset && ' | '}
                      {symptom.onset && `Inicio: ${symptom.onset}`}
                    </p>
                  )}
                </div>
                {!disabled && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingId(symptom.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => onDelete(symptom.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 6: Create Diagnosis Section Component
Create `packages/frontend/src/components/medical-record/DiagnosisSection.tsx`:

```typescript
import { useState } from 'react';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AIBadge } from '../ui/ai-badge';
import { Diagnosis, CreateDiagnosisRequest } from '../../types/medical-records.types';

interface DiagnosisSectionProps {
  diagnosis?: Diagnosis | null;
  onSet: (data: CreateDiagnosisRequest) => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
}

export function DiagnosisSection({
  diagnosis,
  onSet,
  onDelete,
  disabled = false,
}: DiagnosisSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreateDiagnosisRequest>({
    description: diagnosis?.description || '',
    icdCode: diagnosis?.icdCode || '',
    severity: diagnosis?.severity,
  });

  const handleSave = async () => {
    if (!formData.description.trim()) return;
    await onSet(formData);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setFormData({
      description: diagnosis?.description || '',
      icdCode: diagnosis?.icdCode || '',
      severity: diagnosis?.severity,
    });
    setIsEditing(true);
  };

  const getSeverityLabel = (severity?: string) => {
    const labels: Record<string, string> = {
      mild: 'Leve',
      moderate: 'Moderado',
      severe: 'Severo',
    };
    return severity ? labels[severity] : '';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Diagnóstico</CardTitle>
        {!disabled && !isEditing && !diagnosis && (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Agregar Diagnóstico
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Descripción del diagnóstico..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Código ICD (ej: G44.2)"
                value={formData.icdCode}
                onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
              />
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="severe">Severo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : diagnosis ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{diagnosis.description}</span>
                  {diagnosis.aiGenerated && <AIBadge confidence={diagnosis.confidence} />}
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  {diagnosis.icdCode && <span>ICD: {diagnosis.icdCode}</span>}
                  {diagnosis.severity && <span>Severidad: {getSeverityLabel(diagnosis.severity)}</span>}
                </div>
              </div>
              {!disabled && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            No hay diagnóstico registrado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 7: Create Prescriptions Section Component
Create `packages/frontend/src/components/medical-record/PrescriptionsSection.tsx`:

```typescript
import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Pill } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AIBadge } from '../ui/ai-badge';
import { Prescription, CreatePrescriptionRequest } from '../../types/medical-records.types';

interface PrescriptionsSectionProps {
  prescriptions: Prescription[];
  onAdd: (data: CreatePrescriptionRequest) => Promise<void>;
  onUpdate: (prescriptionId: string, data: Partial<CreatePrescriptionRequest>) => Promise<void>;
  onDelete: (prescriptionId: string) => Promise<void>;
  disabled?: boolean;
}

export function PrescriptionsSection({
  prescriptions,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false,
}: PrescriptionsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrescription, setNewPrescription] = useState<CreatePrescriptionRequest>({
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  const handleAdd = async () => {
    if (!newPrescription.medication.trim() || !newPrescription.dosage.trim()) return;
    await onAdd(newPrescription);
    setNewPrescription({ medication: '', dosage: '', frequency: '', duration: '', instructions: '' });
    setIsAdding(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Recetas
        </CardTitle>
        {!disabled && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new prescription form */}
        {isAdding && (
          <div className="p-3 border rounded-lg space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Medicamento *"
                value={newPrescription.medication}
                onChange={(e) => setNewPrescription({ ...newPrescription, medication: e.target.value })}
                autoFocus
              />
              <Input
                placeholder="Dosis * (ej: 500mg)"
                value={newPrescription.dosage}
                onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Frecuencia * (ej: Cada 8 horas)"
                value={newPrescription.frequency}
                onChange={(e) => setNewPrescription({ ...newPrescription, frequency: e.target.value })}
              />
              <Input
                placeholder="Duración * (ej: 7 días)"
                value={newPrescription.duration}
                onChange={(e) => setNewPrescription({ ...newPrescription, duration: e.target.value })}
              />
            </div>
            <Input
              placeholder="Instrucciones adicionales"
              value={newPrescription.instructions}
              onChange={(e) => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Prescriptions list */}
        {prescriptions.length === 0 && !isAdding ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No hay recetas registradas
          </p>
        ) : (
          <ul className="space-y-2">
            {prescriptions.map((prescription) => (
              <li
                key={prescription.id}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{prescription.medication}</span>
                      <span className="text-gray-600">- {prescription.dosage}</span>
                      {prescription.aiGenerated && <AIBadge />}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {prescription.frequency} por {prescription.duration}
                    </p>
                    {prescription.instructions && (
                      <p className="text-sm text-gray-500 mt-1 italic">
                        {prescription.instructions}
                      </p>
                    )}
                  </div>
                  {!disabled && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => onDelete(prescription.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 8: Create Appointment Page with Medical Record
Create `packages/frontend/src/pages/appointments/AppointmentPage.tsx`:

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { SymptomsSection } from '../../components/medical-record/SymptomsSection';
import { DiagnosisSection } from '../../components/medical-record/DiagnosisSection';
import { PrescriptionsSection } from '../../components/medical-record/PrescriptionsSection';
import {
  useMedicalRecord,
  useAddSymptom,
  useUpdateSymptom,
  useDeleteSymptom,
  useSetDiagnosis,
  useDeleteDiagnosis,
  useAddPrescription,
  useDeletePrescription,
} from '../../hooks/useMedicalRecord';
import { useUpdateAppointmentStatus } from '../../hooks/useAppointments';

export function AppointmentPage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useMedicalRecord(appointmentId!);
  const updateStatus = useUpdateAppointmentStatus();

  // Mutation hooks
  const addSymptom = useAddSymptom();
  const updateSymptom = useUpdateSymptom(appointmentId!);
  const deleteSymptom = useDeleteSymptom(appointmentId!);
  const setDiagnosis = useSetDiagnosis();
  const deleteDiagnosis = useDeleteDiagnosis(appointmentId!);
  const addPrescription = useAddPrescription();
  const deletePrescription = useDeletePrescription(appointmentId!);

  const isCompleted = data?.status === 'COMPLETED' || data?.status === 'CANCELLED';

  const handleStartAppointment = async () => {
    await updateStatus.mutateAsync({ id: appointmentId!, status: 'IN_PROGRESS' });
    refetch();
  };

  const handleCompleteAppointment = async () => {
    await updateStatus.mutateAsync({ id: appointmentId!, status: 'COMPLETED' });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-red-500">
        Cita no encontrada
      </div>
    );
  }

  const { patient, medicalRecord } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-gray-600">
            {new Date(data.scheduledAt).toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {data.status === 'SCHEDULED' && (
            <Button onClick={handleStartAppointment}>
              Iniciar Consulta
            </Button>
          )}
          {data.status === 'IN_PROGRESS' && (
            <Button onClick={handleCompleteAppointment}>
              Finalizar Consulta
            </Button>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Fecha de nacimiento:</span>{' '}
            {new Date(patient.dateOfBirth).toLocaleDateString('es-MX')}
          </div>
          <div>
            <span className="text-gray-500">Género:</span> {patient.gender}
          </div>
          {data.reasonForVisit && (
            <div className="col-span-2">
              <span className="text-gray-500">Motivo de consulta:</span> {data.reasonForVisit}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Record Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <SymptomsSection
            symptoms={medicalRecord?.symptoms || []}
            onAdd={async (symptomData) => {
              await addSymptom.mutateAsync({ appointmentId: appointmentId!, data: symptomData });
            }}
            onUpdate={async (symptomId, symptomData) => {
              await updateSymptom.mutateAsync({ symptomId, data: symptomData });
            }}
            onDelete={async (symptomId) => {
              await deleteSymptom.mutateAsync(symptomId);
            }}
            disabled={isCompleted}
          />

          <DiagnosisSection
            diagnosis={medicalRecord?.diagnosis}
            onSet={async (diagnosisData) => {
              await setDiagnosis.mutateAsync({ appointmentId: appointmentId!, data: diagnosisData });
            }}
            onDelete={async () => {
              await deleteDiagnosis.mutateAsync();
            }}
            disabled={isCompleted}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PrescriptionsSection
            prescriptions={medicalRecord?.prescriptions || []}
            onAdd={async (prescriptionData) => {
              await addPrescription.mutateAsync({ appointmentId: appointmentId!, data: prescriptionData });
            }}
            onUpdate={async () => {}}
            onDelete={async (prescriptionId) => {
              await deletePrescription.mutateAsync(prescriptionId);
            }}
            disabled={isCompleted}
          />
        </div>
      </div>
    </div>
  );
}

export default AppointmentPage;
```

---

## Step 9: Update Router
Update `packages/frontend/src/router/index.tsx` to add the appointment page:

```typescript
// Add import
import { AppointmentPage } from '../pages/appointments/AppointmentPage';

// Add route inside the protected children array:
{
  path: 'appointments/:id',
  element: <AppointmentPage />,
},
```

---

## Testing & Verification

### Run Frontend Tests
```bash
cd packages/frontend
pnpm test
```

### Start Services
```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend
cd packages/frontend && pnpm dev
```

### Manual Verification Checklist

**Medical Record:**
- [ ] Navigate to an appointment page
- [ ] Add a symptom with severity
- [ ] Edit a symptom
- [ ] Delete a symptom
- [ ] Add diagnosis with ICD code
- [ ] Edit diagnosis
- [ ] Delete diagnosis
- [ ] Add prescription with all fields
- [ ] Delete prescription
- [ ] AI badge shows on AI-generated items
- [ ] Form disabled after completing appointment
- [ ] Start/Complete appointment buttons work

### TypeScript Check
```bash
cd packages/frontend && pnpm tsc --noEmit
```

---

## Definition of Done Checklist

- [ ] Medical record types defined
- [ ] API service for all operations
- [ ] React Query hooks for all mutations
- [ ] AIBadge component for AI indicators
- [ ] SymptomsSection with add/edit/delete
- [ ] DiagnosisSection with set/delete
- [ ] PrescriptionsSection with add/delete
- [ ] AppointmentPage with full integration
- [ ] Router updated
- [ ] Disabled state for completed appointments
- [ ] TypeScript compiles without errors

---

## Commit (Only After ALL Tests Pass)

```bash
git add .
git commit -m "feat: implement medical records management (TICKET-008, TICKET-009)

Backend:
- Add medical record validator with Zod schemas
- Create medical records service with CRUD operations
- Add symptoms add/update/delete operations
- Add diagnosis set/delete (one per record)
- Add prescriptions add/update/delete operations
- Support aiGenerated field for AI-extracted data
- Add bulk operations for AI auto-fill
- Add comprehensive integration tests

Frontend:
- Create medical record types
- Create API service for medical records
- Create React Query hooks for all operations
- Create AIBadge component for AI indicators
- Create SymptomsSection with add/edit/delete
- Create DiagnosisSection with set/delete
- Create PrescriptionsSection with add/delete
- Create AppointmentPage with full medical record
- Add disabled state for completed appointments

TICKET-008, TICKET-009"
```

---

## Next Prompt
Proceed to `18a-implement-ticket-010-transcription-backend.md` for AI transcription backend implementation.
