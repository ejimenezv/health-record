# MVP Fields Selection

## Overview

This document defines the minimum viable set of fields needed for the Medical Record System MVP. The selection prioritizes:

1. **Essential functionality**: Core fields required for basic patient management and appointment tracking
2. **AI transcription compatibility**: Fields that can be auto-populated from doctor-patient conversation transcripts
3. **Simplicity**: Avoiding over-engineering while maintaining clinical usefulness
4. **Data integrity**: Required fields that ensure meaningful records

---

## Selection Criteria

| Criterion | Description |
|-----------|-------------|
| **Essential** | Cannot function without this field |
| **AI-Fillable** | Can be extracted from transcribed conversations |
| **User-Friendly** | Easy for healthcare providers to complete |
| **Minimal Complexity** | Avoids complex taxonomies (like full ICD-10) in MVP |

---

## Entity: Patient

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated unique identifier |
| `first_name` | String | Yes | No | Essential for patient identification |
| `last_name` | String | Yes | No | Essential for patient identification |
| `date_of_birth` | Date | Yes | No | Essential for age-related medical decisions |
| `sex` | Enum | Yes | No | Essential for clinical decisions |
| `phone` | String | Yes | No | Primary contact method |
| `email` | String | No | No | Secondary contact, notifications |
| `address` | String | No | No | Basic location info (single field for MVP) |
| `emergency_contact_name` | String | Yes | No | Safety requirement |
| `emergency_contact_phone` | String | Yes | No | Safety requirement |
| `emergency_contact_relationship` | String | No | No | Helpful context |
| `created_at` | DateTime | Yes | No | Audit trail |
| `updated_at` | DateTime | Yes | No | Audit trail |

### Excluded Fields (with justification)

| Field | Reason for Exclusion |
|-------|---------------------|
| `ssn` | Not needed for MVP; adds security complexity |
| `insurance_*` | Billing features out of scope for MVP |
| `preferred_name`, `pronouns`, `gender_identity` | Important but not essential for MVP |
| `race`, `ethnicity`, `language` | Demographic tracking not in MVP scope |
| `middle_name`, `marital_status` | Non-essential demographic info |

---

## Entity: Medical History

### Selected Fields - Allergies

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `patient_id` | UUID | Yes | No | Links to patient |
| `allergen` | String | Yes | Yes | Can be mentioned in conversation |
| `reaction` | String | No | Yes | Often described by patient |
| `severity` | Enum | No | Yes | Can be inferred from description |
| `created_at` | DateTime | Yes | No | Audit trail |

### Selected Fields - Chronic Conditions

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `patient_id` | UUID | Yes | No | Links to patient |
| `condition_name` | String | Yes | Yes | Mentioned in medical discussions |
| `diagnosis_date` | Date | No | Yes | May be mentioned |
| `notes` | Text | No | Yes | Context from conversation |
| `status` | Enum | Yes | No | Active/Resolved |
| `created_at` | DateTime | Yes | No | Audit trail |

### Excluded Fields (with justification)

| Field | Reason for Exclusion |
|-------|---------------------|
| `icd_code` | Complex taxonomy; free-text sufficient for MVP |
| `immunizations` | Separate module, not core to appointments |
| `family_history` | Important but can be added later |
| `surgical_history` | Can be captured in notes for MVP |

---

## Entity: Appointment

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `patient_id` | UUID | Yes | No | Links to patient |
| `provider_id` | UUID | Yes | No | Links to doctor |
| `scheduled_at` | DateTime | Yes | No | When appointment occurs |
| `appointment_type` | Enum | Yes | No | New/Follow-up/Routine |
| `reason_for_visit` | String | Yes | Yes | Chief complaint |
| `status` | Enum | Yes | No | Scheduled/Completed/Cancelled |
| `duration_minutes` | Integer | No | No | Expected/actual duration |
| `notes` | Text | No | Yes | Administrative notes |
| `created_at` | DateTime | Yes | No | Audit trail |
| `updated_at` | DateTime | Yes | No | Audit trail |

### Appointment Type Enum Values
- `NEW_PATIENT`
- `FOLLOW_UP`
- `ROUTINE_CHECKUP`
- `SICK_VISIT`
- `TELEHEALTH`

### Appointment Status Enum Values
- `SCHEDULED`
- `CHECKED_IN`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

---

## Entity: Medical Record (per Appointment)

This is the core clinical documentation entity, implementing a simplified SOAP format.

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `appointment_id` | UUID | Yes | No | Links to appointment |
| `patient_id` | UUID | Yes | No | Denormalized for queries |
| `provider_id` | UUID | Yes | No | Treating physician |
| **Subjective** |
| `chief_complaint` | String | Yes | Yes | Primary reason for visit |
| `history_of_present_illness` | Text | No | Yes | Detailed symptom description |
| `current_medications` | Text | No | Yes | Patient-reported medications |
| `allergies_noted` | Text | No | Yes | Allergies mentioned in visit |
| **Objective** |
| `physical_exam_notes` | Text | No | Yes | Exam findings |
| **Assessment** |
| `diagnosis` | String | Yes | Yes | Primary diagnosis (free text) |
| `diagnosis_notes` | Text | No | Yes | Additional context |
| **Plan** |
| `treatment_plan` | Text | No | Yes | Treatment approach |
| `follow_up_instructions` | String | No | Yes | When to return |
| `patient_education` | Text | No | Yes | Information given to patient |
| **Metadata** |
| `transcription_raw` | Text | No | Yes | Raw AI transcription |
| `ai_extracted` | Boolean | Yes | No | Whether record was AI-generated |
| `created_at` | DateTime | Yes | No | Audit trail |
| `updated_at` | DateTime | Yes | No | Audit trail |

### Excluded Fields (with justification)

| Field | Reason for Exclusion |
|-------|---------------------|
| `icd_10_code` | Complex; free-text diagnosis sufficient for MVP |
| `differential_diagnoses` | Adds complexity without essential value |
| `lab_results`, `imaging_results` | External system integrations out of scope |
| `referrals` | Can be noted in treatment_plan for MVP |

---

## Entity: Vital Signs

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `appointment_id` | UUID | Yes | No | Links to appointment |
| `patient_id` | UUID | Yes | No | Denormalized for queries |
| `blood_pressure_systolic` | Integer | No | Yes | Common vital sign |
| `blood_pressure_diastolic` | Integer | No | Yes | Common vital sign |
| `heart_rate` | Integer | No | Yes | Pulse |
| `temperature` | Decimal | No | Yes | Body temperature |
| `temperature_unit` | Enum | No | No | F or C |
| `respiratory_rate` | Integer | No | Yes | Breaths per minute |
| `oxygen_saturation` | Integer | No | Yes | SpO2 percentage |
| `weight` | Decimal | No | Yes | Current weight |
| `weight_unit` | Enum | No | No | lbs or kg |
| `height` | Decimal | No | No | Usually from patient record |
| `height_unit` | Enum | No | No | inches or cm |
| `pain_level` | Integer | No | Yes | 0-10 scale |
| `recorded_at` | DateTime | Yes | No | When vitals taken |
| `recorded_by` | String | No | No | Staff who recorded |

### Excluded Fields (with justification)

| Field | Reason for Exclusion |
|-------|---------------------|
| `bmi` | Can be calculated from height/weight |
| `temperature_site` | Detail not essential for MVP |

---

## Entity: Prescription

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `appointment_id` | UUID | Yes | No | Links to appointment |
| `patient_id` | UUID | Yes | No | Denormalized for queries |
| `prescriber_id` | UUID | Yes | No | Prescribing doctor |
| `medication_name` | String | Yes | Yes | Drug name |
| `strength` | String | Yes | Yes | Dosage strength |
| `form` | String | No | Yes | Tablet, capsule, etc. |
| `dosage` | String | Yes | Yes | Amount per dose |
| `frequency` | String | Yes | Yes | How often |
| `duration` | String | No | Yes | How long to take |
| `quantity` | Integer | No | Yes | Total amount |
| `refills` | Integer | No | Yes | Number of refills |
| `instructions` | Text | Yes | Yes | Patient instructions |
| `indication` | String | No | Yes | Reason for medication |
| `start_date` | Date | No | No | When to start |
| `end_date` | Date | No | No | When to stop |
| `status` | Enum | Yes | No | Active/Completed/Discontinued |
| `created_at` | DateTime | Yes | No | Audit trail |

### Prescription Status Enum Values
- `ACTIVE`
- `COMPLETED`
- `DISCONTINUED`
- `ON_HOLD`

### Excluded Fields (with justification)

| Field | Reason for Exclusion |
|-------|---------------------|
| `rxnorm_code`, `ndc_code` | Standardized codes not needed for MVP |
| `daw` | Pharmacy integration out of scope |
| `pharmacy` | E-prescribing out of scope |
| `drug_interactions` | Complex feature for future version |

---

## Entity: Provider (Doctor)

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `first_name` | String | Yes | No | Provider identification |
| `last_name` | String | Yes | No | Provider identification |
| `title` | String | No | No | Dr., NP, PA, etc. |
| `specialty` | String | No | No | Medical specialty |
| `email` | String | Yes | No | Login/contact |
| `phone` | String | No | No | Contact number |
| `license_number` | String | No | No | Medical license |
| `is_active` | Boolean | Yes | No | Active in system |
| `created_at` | DateTime | Yes | No | Audit trail |

---

## Entity: Symptoms (for Appointment)

### Selected Fields

| Field Name | Data Type | Required | AI-Fillable | Justification |
|------------|-----------|----------|-------------|---------------|
| `id` | UUID | Yes | No | System-generated |
| `appointment_id` | UUID | Yes | No | Links to appointment |
| `symptom_name` | String | Yes | Yes | Name of symptom |
| `body_site` | String | No | Yes | Location |
| `severity` | Integer | No | Yes | 1-10 scale |
| `duration` | String | No | Yes | How long present |
| `notes` | Text | No | Yes | Additional details |
| `created_at` | DateTime | Yes | No | Audit trail |

---

## Database Relationships Summary

```
Patient (1) ──────┬──── (N) Allergy
                  ├──── (N) ChronicCondition
                  ├──── (N) Appointment
                  └──── (N) Prescription

Appointment (1) ──┬──── (1) MedicalRecord
                  ├──── (1) VitalSigns
                  ├──── (N) Prescription
                  └──── (N) Symptom

Provider (1) ─────┬──── (N) Appointment
                  └──── (N) Prescription
```

---

## AI Transcription Field Mapping

The following fields are designed to be auto-filled from AI transcription:

### High Confidence Extraction
- `chief_complaint` - Usually stated clearly at start
- `symptom_name` - Explicitly mentioned
- `medication_name`, `dosage`, `frequency` - Prescription details
- `diagnosis` - Doctor's stated conclusion

### Medium Confidence Extraction
- `history_of_present_illness` - Requires synthesis of conversation
- `treatment_plan` - Synthesized from discussion
- `vital_signs` - May be stated aloud
- `severity`, `duration` - Often mentioned but varied formats

### Low Confidence (Manual Review Recommended)
- `follow_up_instructions` - Context-dependent
- `physical_exam_notes` - May be sparse in transcription
- `patient_education` - Often informal

---

## MVP Scope Summary

| Entity | Fields Selected | Fields Excluded | Reason |
|--------|----------------|-----------------|--------|
| Patient | 12 | 15+ | Focus on essentials |
| Allergies | 6 | 5 | Simplified tracking |
| Chronic Conditions | 6 | 4 | Free-text over codes |
| Appointment | 11 | 5 | Core scheduling |
| Medical Record | 14 | 10+ | Simplified SOAP |
| Vital Signs | 15 | 2 | Comprehensive basics |
| Prescription | 17 | 5 | Core Rx info |
| Provider | 10 | Many | Essential info only |
| Symptoms | 7 | 10+ | Key symptom data |

**Total MVP Fields: ~98 fields across 9 entities**

This represents approximately 40-50% reduction from a full commercial EHR field set while maintaining core clinical documentation functionality.
