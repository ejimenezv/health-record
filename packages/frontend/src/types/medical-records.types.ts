export interface Symptom {
  id: string;
  symptomName: string;
  bodySite?: string | null;
  severity?: number | null;
  duration?: string | null;
  notes?: string | null;
  isAIExtracted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  medicationName: string;
  strength?: string | null;
  dosage: string;
  frequency: string;
  duration?: string | null;
  quantity?: number | null;
  refills: number;
  instructions: string;
  indication?: string | null;
  isAIExtracted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  chiefComplaint?: string | null;
  historyOfPresentIllness?: string | null;
  physicalExamNotes?: string | null;
  diagnosis?: string | null;
  diagnosisNotes?: string | null;
  treatmentPlan?: string | null;
  followUpInstructions?: string | null;
  patientEducation?: string | null;
  isAIGenerated: boolean;
  isDraft: boolean;
  symptoms: Symptom[];
  prescriptions: Prescription[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithMedicalRecord {
  id: string;
  patientId: string;
  providerId: string;
  appointmentDate: string;
  appointmentType: string;
  reasonForVisit?: string | null;
  durationMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
  };
  medicalRecord?: MedicalRecord | null;
}

// Request types
export interface CreateSymptomRequest {
  symptomName: string;
  bodySite?: string;
  severity?: number;
  duration?: string;
  notes?: string;
  isAIExtracted?: boolean;
}

export interface UpdateSymptomRequest {
  symptomName?: string;
  bodySite?: string;
  severity?: number;
  duration?: string;
  notes?: string;
  isAIExtracted?: boolean;
}

export interface CreatePrescriptionRequest {
  medicationName: string;
  strength?: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions: string;
  indication?: string;
  isAIExtracted?: boolean;
}

export interface UpdatePrescriptionRequest {
  medicationName?: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  indication?: string;
  isAIExtracted?: boolean;
}

export interface UpdateMedicalRecordRequest {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  physicalExamNotes?: string;
  diagnosis?: string;
  diagnosisNotes?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  patientEducation?: string;
  isAIGenerated?: boolean;
  isDraft?: boolean;
}

export interface PatchMedicalRecordRequest {
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  physicalExamNotes?: string;
  diagnosis?: string;
  diagnosisNotes?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  patientEducation?: string;
  isAIGenerated?: boolean;
}

// Transcription types
export interface Transcription {
  id: string;
  appointmentId: string;
  fullText: string;
  durationSeconds?: number;
  status: 'recording' | 'processing' | 'completed' | 'error' | 'cancelled';
  startedAt: string;
  completedAt?: string;
}

export interface AIExtractionResult {
  symptoms: Array<{
    description: string;
    severity?: 'mild' | 'moderate' | 'severe';
    duration?: string;
    onset?: string;
  }>;
  diagnosis: {
    description: string;
    icdCode?: string;
    confidence: number;
  } | null;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  chiefComplaint?: string;
  summary?: string;
}
