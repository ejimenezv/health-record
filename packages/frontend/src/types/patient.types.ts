export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  reaction?: string | null;
  severity?: AllergySeverity | null;
  onsetDate?: string | null;
  createdAt: string;
}

export interface CreateAllergyRequest {
  allergen: string;
  reaction?: string | null;
  severity?: AllergySeverity | null;
  onsetDate?: string | null;
}

export type UpdateAllergyRequest = Partial<CreateAllergyRequest>;

export type ChronicConditionStatus = 'active' | 'resolved' | 'managed';

export interface ChronicCondition {
  id: string;
  patientId: string;
  conditionName: string;
  diagnosisDate?: string | null;
  status?: ChronicConditionStatus | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateChronicConditionRequest {
  conditionName: string;
  diagnosisDate?: string | null;
  status?: ChronicConditionStatus | null;
  notes?: string | null;
}

export type UpdateChronicConditionRequest = Partial<CreateChronicConditionRequest>;

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bloodType?: BloodType | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  createdAt: string;
  updatedAt: string;
  allergies?: Allergy[];
  chronicConditions?: ChronicCondition[];
  _count?: {
    appointments: number;
  };
  appointments?: Array<{
    id: string;
    appointmentDate: string;
    status: string;
    medicalRecord?: { id: string } | null;
  }>;
}

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  phone: string;
  email?: string | null;
  address?: string | null;
  bloodType?: BloodType | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string | null;
}

export type UpdatePatientRequest = Partial<CreatePatientRequest>;

export interface PatientQuery {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
