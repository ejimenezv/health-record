# Medical Record Fields Research

## Overview

This document contains comprehensive research on standard fields used in Electronic Medical Records (EMR) and Electronic Health Records (EHR) systems. The research is based on industry standards, regulatory requirements (including ONC 2026 certification requirements), and best practices from commercial systems.

---

## 1. Patient Information (Demographics)

### Core Patient Demographics

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `patient_id` | UUID/String | Yes | Unique identifier for the patient | `PAT-2024-001234` |
| `first_name` | String | Yes | Patient's legal first name | `John` |
| `middle_name` | String | No | Patient's middle name(s) | `Michael` |
| `last_name` | String | Yes | Patient's legal last name | `Smith` |
| `preferred_name` | String | No | Name patient prefers to be called (ONC 2026 requirement) | `Johnny` |
| `date_of_birth` | Date | Yes | Patient's birth date | `1985-03-15` |
| `sex_at_birth` | Enum | Yes | Biological sex assigned at birth | `Male`, `Female`, `Intersex`, `Unknown` |
| `sex_for_clinical_use` | Enum | No | Sex parameter for clinical decision-making (ONC 2026) | `Male`, `Female`, `Specified` |
| `gender_identity` | String | No | Patient's self-identified gender | `Male`, `Female`, `Non-binary`, `Other` |
| `pronouns` | String | No | Patient's preferred pronouns (ONC 2026, SNOMED CT standard) | `he/him`, `she/her`, `they/them` |
| `marital_status` | Enum | No | Current marital status | `Single`, `Married`, `Divorced`, `Widowed` |
| `race` | String | No | Patient's race (CDC Race/Ethnicity Code Set v1.2) | `White`, `Black`, `Asian`, `Mixed` |
| `ethnicity` | String | No | Patient's ethnicity | `Hispanic`, `Non-Hispanic` |
| `primary_language` | String | No | Primary spoken language | `English`, `Spanish`, `Mandarin` |
| `ssn` | String (encrypted) | No | Social Security Number (US) | `***-**-1234` |

### Contact Information

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `address_line_1` | String | Yes | Primary street address | `123 Main Street` |
| `address_line_2` | String | No | Apartment, suite, unit | `Apt 4B` |
| `city` | String | Yes | City name | `New York` |
| `state` | String | Yes | State/Province | `NY` |
| `postal_code` | String | Yes | ZIP/Postal code | `10001` |
| `country` | String | Yes | Country | `USA` |
| `phone_home` | String | No | Home phone number | `+1 (555) 123-4567` |
| `phone_mobile` | String | Yes | Mobile phone number | `+1 (555) 987-6543` |
| `phone_work` | String | No | Work phone number | `+1 (555) 456-7890` |
| `email` | String | Yes | Email address | `john.smith@email.com` |
| `preferred_contact_method` | Enum | No | Preferred way to reach patient | `Phone`, `Email`, `SMS` |

### Emergency Contact

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `emergency_contact_name` | String | Yes | Full name of emergency contact | `Jane Smith` |
| `emergency_contact_relationship` | String | Yes | Relationship to patient | `Spouse`, `Parent`, `Sibling` |
| `emergency_contact_phone` | String | Yes | Emergency contact phone | `+1 (555) 111-2222` |
| `emergency_contact_email` | String | No | Emergency contact email | `jane.smith@email.com` |

### Insurance Information

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `insurance_provider` | String | No | Name of insurance company | `Blue Cross Blue Shield` |
| `policy_number` | String | No | Insurance policy number | `BCB123456789` |
| `group_number` | String | No | Insurance group number | `GRP-001234` |
| `policy_holder_name` | String | No | Name of policy holder | `John Smith` |
| `policy_holder_dob` | Date | No | Policy holder's date of birth | `1985-03-15` |
| `policy_holder_relationship` | String | No | Relationship to patient | `Self`, `Spouse`, `Parent` |

---

## 2. Medical History

### Allergies

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `allergy_id` | UUID | Yes | Unique identifier for allergy record | `ALL-001234` |
| `allergen` | String | Yes | Name of allergen | `Penicillin`, `Peanuts`, `Latex` |
| `allergen_type` | Enum | Yes | Category of allergen | `Drug`, `Food`, `Environmental`, `Other` |
| `reaction` | String | Yes | Description of allergic reaction | `Hives`, `Anaphylaxis`, `Rash` |
| `severity` | Enum | Yes | Severity level | `Mild`, `Moderate`, `Severe`, `Life-threatening` |
| `onset_date` | Date | No | When allergy was first identified | `2010-05-20` |
| `status` | Enum | Yes | Current status of allergy | `Active`, `Inactive`, `Resolved` |
| `verified_by` | String | No | Who verified the allergy | `Dr. Johnson` |
| `verification_date` | Date | No | When allergy was verified | `2024-01-15` |

### Chronic Conditions

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `condition_id` | UUID | Yes | Unique identifier | `CON-001234` |
| `condition_name` | String | Yes | Name of chronic condition | `Type 2 Diabetes`, `Hypertension` |
| `icd_code` | String | No | ICD-10-CM code | `E11.9`, `I10` |
| `diagnosis_date` | Date | Yes | When condition was diagnosed | `2015-08-10` |
| `diagnosed_by` | String | No | Provider who made diagnosis | `Dr. Williams` |
| `status` | Enum | Yes | Current status | `Active`, `Controlled`, `In Remission`, `Resolved` |
| `severity` | Enum | No | Condition severity | `Mild`, `Moderate`, `Severe` |
| `notes` | Text | No | Additional clinical notes | `Well-controlled with medication` |

### Previous Surgeries/Procedures

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `procedure_id` | UUID | Yes | Unique identifier | `PROC-001234` |
| `procedure_name` | String | Yes | Name of surgery/procedure | `Appendectomy`, `Knee Replacement` |
| `procedure_code` | String | No | CPT or ICD-10-PCS code | `44950`, `0SR90JZ` |
| `procedure_date` | Date | Yes | When procedure was performed | `2018-06-15` |
| `surgeon` | String | No | Name of performing surgeon | `Dr. Martinez` |
| `facility` | String | No | Where procedure was performed | `General Hospital` |
| `outcome` | String | No | Result of procedure | `Successful`, `With complications` |
| `complications` | Text | No | Any complications noted | `None` |
| `notes` | Text | No | Additional notes | `Routine appendectomy, no complications` |

### Family Medical History

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `family_history_id` | UUID | Yes | Unique identifier | `FH-001234` |
| `relationship` | String | Yes | Relationship to patient | `Father`, `Mother`, `Sibling` |
| `condition` | String | Yes | Medical condition | `Heart Disease`, `Diabetes`, `Cancer` |
| `age_at_onset` | Integer | No | Age when relative developed condition | `55` |
| `age_at_death` | Integer | No | Age at death (if deceased) | `72` |
| `cause_of_death` | String | No | If deceased, cause of death | `Heart Attack` |
| `notes` | Text | No | Additional information | `Paternal grandmother also had diabetes` |

### Immunizations

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `immunization_id` | UUID | Yes | Unique identifier | `IMM-001234` |
| `vaccine_name` | String | Yes | Name of vaccine | `Influenza`, `COVID-19`, `Tdap` |
| `vaccine_code` | String | No | CVX code | `158`, `213` |
| `lot_number` | String | No | Vaccine lot number | `ABC123` |
| `manufacturer` | String | No | Vaccine manufacturer | `Pfizer`, `Moderna` |
| `administration_date` | Date | Yes | When vaccine was given | `2024-10-15` |
| `expiration_date` | Date | No | Vaccine expiration date | `2025-03-01` |
| `site` | String | No | Injection site | `Left Deltoid` |
| `administered_by` | String | No | Who administered vaccine | `RN Johnson` |
| `dose_number` | Integer | No | Dose number in series | `2` |

---

## 3. Appointment Records

### Appointment Information

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `appointment_id` | UUID | Yes | Unique identifier | `APT-001234` |
| `patient_id` | UUID | Yes | Reference to patient | `PAT-001234` |
| `provider_id` | UUID | Yes | Reference to healthcare provider | `PRV-001234` |
| `appointment_date` | DateTime | Yes | Date and time of appointment | `2024-11-15T09:30:00` |
| `appointment_type` | Enum | Yes | Type of visit | `New Patient`, `Follow-up`, `Annual Physical`, `Sick Visit`, `Telehealth` |
| `reason_for_visit` | String | Yes | Chief complaint or reason | `Annual checkup`, `Chest pain` |
| `status` | Enum | Yes | Appointment status | `Scheduled`, `Checked-in`, `In-Progress`, `Completed`, `Cancelled`, `No-Show` |
| `duration_minutes` | Integer | Yes | Expected/actual duration | `30`, `60` |
| `location` | String | No | Office/room location | `Room 204`, `Telehealth` |
| `notes` | Text | No | Pre-appointment notes | `Patient requested early morning slot` |
| `check_in_time` | DateTime | No | Actual check-in time | `2024-11-15T09:25:00` |
| `check_out_time` | DateTime | No | Actual check-out time | `2024-11-15T10:15:00` |

---

## 4. SOAP Notes Format

The SOAP note format is the standard method for clinical documentation, developed by Dr. Lawrence Weed as part of the Problem-Oriented Medical Record (POMR).

### Subjective (S)

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `chief_complaint` | String | Yes | Main reason for visit in patient's words | `"I've had a headache for 3 days"` |
| `history_of_present_illness` | Text | Yes | Detailed description of current illness | See HPI elements below |
| `onset` | String | No | When symptoms started | `3 days ago`, `Gradual over 2 weeks` |
| `location` | String | No | Where symptoms are felt | `Frontal`, `Bilateral`, `Left knee` |
| `duration` | String | No | How long symptoms last | `Constant`, `Intermittent`, `30 minutes` |
| `character` | String | No | Quality/nature of symptoms | `Sharp`, `Dull`, `Throbbing`, `Burning` |
| `aggravating_factors` | String | No | What makes it worse | `Light`, `Movement`, `Eating` |
| `relieving_factors` | String | No | What makes it better | `Rest`, `Ibuprofen`, `Ice` |
| `timing` | String | No | Pattern of symptoms | `Morning`, `After meals`, `At night` |
| `severity` | Integer | No | Pain scale (0-10) | `7` |
| `associated_symptoms` | Text | No | Other related symptoms | `Nausea, light sensitivity` |
| `review_of_systems` | Text | No | Systematic review by body system | `Constitutional: No fever, no weight loss...` |
| `current_medications` | Text | No | Medications patient reports taking | `Lisinopril 10mg daily` |
| `medication_allergies` | Text | No | Allergies reported by patient | `Penicillin - causes rash` |
| `social_history` | Text | No | Lifestyle factors | `Non-smoker, occasional alcohol` |
| `family_history_relevant` | Text | No | Relevant family history | `Father had migraines` |

### Objective (O)

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `vital_signs` | Object | Yes | Measured vital signs | See Vital Signs section |
| `general_appearance` | String | No | Overall patient appearance | `Alert, oriented, no acute distress` |
| `physical_exam_findings` | Text | Yes | Findings from physical examination | `HEENT: Normocephalic, pupils equal...` |
| `lab_results` | Text | No | Relevant laboratory results | `CBC within normal limits` |
| `imaging_results` | Text | No | Radiology/imaging findings | `Chest X-ray: No acute findings` |
| `diagnostic_test_results` | Text | No | Other test results | `ECG: Normal sinus rhythm` |

### Assessment (A)

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `primary_diagnosis` | String | Yes | Main diagnosis | `Tension headache` |
| `primary_diagnosis_icd` | String | No | ICD-10-CM code for primary diagnosis | `G44.209` |
| `differential_diagnoses` | Array[String] | No | Other possible diagnoses | `[Migraine, Sinusitis, HTN headache]` |
| `secondary_diagnoses` | Array[String] | No | Additional diagnoses | `[Hypertension, controlled]` |
| `secondary_diagnoses_icd` | Array[String] | No | ICD codes for secondary diagnoses | `[I10]` |
| `clinical_impression` | Text | No | Provider's overall assessment | `Likely tension headache, rule out migraine` |
| `prognosis` | String | No | Expected outcome | `Good with treatment` |

### Plan (P)

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `treatment_plan` | Text | Yes | Overview of treatment approach | `Conservative management with medications` |
| `medications_prescribed` | Array[Object] | No | New prescriptions | See Prescription section |
| `procedures_ordered` | Array[String] | No | Procedures to be performed | `[Blood draw, EKG]` |
| `labs_ordered` | Array[String] | No | Laboratory tests ordered | `[CBC, BMP, Lipid panel]` |
| `imaging_ordered` | Array[String] | No | Imaging studies ordered | `[CT Head without contrast]` |
| `referrals` | Array[String] | No | Specialist referrals | `[Neurology consultation]` |
| `patient_education` | Text | No | Information given to patient | `Discussed headache triggers and management` |
| `follow_up` | String | Yes | Follow-up instructions | `Return in 2 weeks if not improved` |
| `activity_restrictions` | String | No | Activity limitations | `No heavy lifting for 1 week` |
| `dietary_recommendations` | String | No | Diet advice | `Reduce caffeine intake` |

---

## 5. Vital Signs

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `vital_signs_id` | UUID | Yes | Unique identifier | `VS-001234` |
| `recorded_at` | DateTime | Yes | When vitals were taken | `2024-11-15T09:35:00` |
| `recorded_by` | String | Yes | Who recorded vitals | `RN Smith` |
| `blood_pressure_systolic` | Integer | Yes | Systolic BP (mmHg) | `120` |
| `blood_pressure_diastolic` | Integer | Yes | Diastolic BP (mmHg) | `80` |
| `heart_rate` | Integer | Yes | Pulse (beats per minute) | `72` |
| `respiratory_rate` | Integer | No | Breaths per minute | `16` |
| `temperature` | Decimal | Yes | Body temperature | `98.6` (°F) or `37.0` (°C) |
| `temperature_unit` | Enum | Yes | Temperature unit | `Fahrenheit`, `Celsius` |
| `temperature_site` | Enum | No | Where temperature was taken | `Oral`, `Tympanic`, `Axillary`, `Rectal` |
| `oxygen_saturation` | Integer | No | SpO2 percentage | `98` |
| `height` | Decimal | No | Patient height | `70` (inches) or `178` (cm) |
| `height_unit` | Enum | No | Height unit | `inches`, `cm` |
| `weight` | Decimal | Yes | Patient weight | `180` (lbs) or `82` (kg) |
| `weight_unit` | Enum | Yes | Weight unit | `lbs`, `kg` |
| `bmi` | Decimal | No | Body Mass Index (calculated) | `25.8` |
| `pain_level` | Integer | No | Pain scale (0-10) | `3` |
| `pain_location` | String | No | Where pain is located | `Lower back` |

---

## 6. Prescription/Medication Fields

### Prescription Record

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `prescription_id` | UUID | Yes | Unique identifier | `RX-001234` |
| `patient_id` | UUID | Yes | Reference to patient | `PAT-001234` |
| `prescriber_id` | UUID | Yes | Reference to prescribing provider | `PRV-001234` |
| `appointment_id` | UUID | No | Associated appointment | `APT-001234` |
| `medication_name` | String | Yes | Drug name (generic or brand) | `Amoxicillin`, `Lipitor` |
| `medication_generic` | String | No | Generic name | `Amoxicillin`, `Atorvastatin` |
| `medication_brand` | String | No | Brand name | `Amoxil`, `Lipitor` |
| `rxnorm_code` | String | No | RxNorm Concept Unique Identifier | `723` |
| `ndc_code` | String | No | National Drug Code | `0781-1965-01` |
| `strength` | String | Yes | Medication strength | `500mg`, `10mg` |
| `form` | Enum | Yes | Medication form | `Tablet`, `Capsule`, `Liquid`, `Injection`, `Cream`, `Inhaler` |
| `dosage` | String | Yes | Amount per dose | `1 tablet`, `5ml`, `2 puffs` |
| `route` | Enum | Yes | Administration route | `Oral`, `Topical`, `IV`, `IM`, `SC`, `Inhalation` |
| `frequency` | String | Yes | How often to take | `Once daily`, `Twice daily`, `Every 8 hours`, `As needed` |
| `duration` | String | No | How long to take | `10 days`, `30 days`, `Ongoing` |
| `quantity` | Integer | Yes | Total quantity prescribed | `30`, `60`, `90` |
| `refills` | Integer | Yes | Number of refills authorized | `0`, `3`, `11` |
| `daw` | Boolean | No | Dispense as Written (no substitution) | `true`, `false` |
| `instructions` | Text | Yes | Patient instructions (Sig) | `Take one tablet by mouth twice daily with food` |
| `indication` | String | No | Reason for prescription | `Bacterial infection`, `Cholesterol` |
| `start_date` | Date | Yes | When to start medication | `2024-11-15` |
| `end_date` | Date | No | When to stop medication | `2024-11-25` |
| `prescribed_date` | DateTime | Yes | When prescription was written | `2024-11-15T10:00:00` |
| `status` | Enum | Yes | Prescription status | `Active`, `Completed`, `Discontinued`, `On Hold` |
| `pharmacy` | String | No | Preferred pharmacy | `CVS Pharmacy #1234` |
| `notes` | Text | No | Additional prescriber notes | `Monitor for GI side effects` |

### Drug Interaction Warnings

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `interaction_id` | UUID | Yes | Unique identifier | `INT-001234` |
| `drug_1` | String | Yes | First medication | `Warfarin` |
| `drug_2` | String | Yes | Interacting medication | `Aspirin` |
| `severity` | Enum | Yes | Interaction severity | `Minor`, `Moderate`, `Major`, `Contraindicated` |
| `description` | Text | Yes | Description of interaction | `Increased bleeding risk` |
| `recommendation` | Text | No | Clinical recommendation | `Monitor INR closely` |

---

## 7. Diagnosis Fields

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `diagnosis_id` | UUID | Yes | Unique identifier | `DX-001234` |
| `patient_id` | UUID | Yes | Reference to patient | `PAT-001234` |
| `encounter_id` | UUID | No | Associated encounter/appointment | `APT-001234` |
| `diagnosis_description` | String | Yes | Text description of diagnosis | `Type 2 Diabetes Mellitus` |
| `icd_10_code` | String | No | ICD-10-CM code | `E11.9` |
| `icd_10_description` | String | No | Official ICD-10 description | `Type 2 diabetes mellitus without complications` |
| `snomed_code` | String | No | SNOMED CT code | `44054006` |
| `diagnosis_type` | Enum | Yes | Classification of diagnosis | `Primary`, `Secondary`, `Admitting`, `Working` |
| `diagnosis_status` | Enum | Yes | Current status | `Active`, `Resolved`, `Chronic`, `Recurrence` |
| `severity` | Enum | No | Severity level | `Mild`, `Moderate`, `Severe` |
| `onset_date` | Date | No | When condition began | `2024-01-15` |
| `diagnosis_date` | Date | Yes | When diagnosis was made | `2024-11-15` |
| `diagnosed_by` | String | Yes | Provider who made diagnosis | `Dr. Johnson` |
| `clinical_notes` | Text | No | Additional clinical notes | `Initial diagnosis, A1C elevated at 8.2%` |
| `is_chronic` | Boolean | No | Whether condition is chronic | `true`, `false` |
| `is_principal` | Boolean | No | Principal diagnosis for billing | `true`, `false` |

---

## 8. Symptoms Documentation

| Field Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `symptom_id` | UUID | Yes | Unique identifier | `SYM-001234` |
| `encounter_id` | UUID | Yes | Associated encounter | `APT-001234` |
| `symptom_name` | String | Yes | Name of symptom | `Headache`, `Fatigue`, `Cough` |
| `snomed_code` | String | No | SNOMED CT code for symptom | `25064002` (Headache) |
| `body_site` | String | No | Location of symptom | `Head`, `Chest`, `Abdomen` |
| `laterality` | Enum | No | Which side | `Left`, `Right`, `Bilateral`, `N/A` |
| `onset_date` | Date | No | When symptom started | `2024-11-12` |
| `onset_description` | String | No | How symptom began | `Sudden`, `Gradual` |
| `duration` | String | No | How long symptom has been present | `3 days`, `2 weeks` |
| `frequency` | String | No | How often symptom occurs | `Constant`, `Intermittent`, `Daily` |
| `severity` | Integer | No | Severity scale (1-10) | `7` |
| `severity_description` | Enum | No | Qualitative severity | `Mild`, `Moderate`, `Severe` |
| `character` | String | No | Quality of symptom | `Sharp`, `Dull`, `Burning`, `Throbbing` |
| `aggravating_factors` | Text | No | What makes it worse | `Light, noise, movement` |
| `relieving_factors` | Text | No | What makes it better | `Rest, dark room, ibuprofen` |
| `associated_symptoms` | Array[String] | No | Related symptoms | `[Nausea, Photophobia]` |
| `patient_description` | Text | No | Patient's own words | `"It feels like a tight band around my head"` |
| `progression` | Enum | No | How symptom is changing | `Improving`, `Worsening`, `Stable`, `Fluctuating` |
| `impact_on_function` | Text | No | Effect on daily activities | `Unable to work, difficulty concentrating` |
| `prior_treatment` | Text | No | What patient has tried | `OTC ibuprofen with minimal relief` |

---

## References

- [Electronic Health Records - Wikipedia](https://en.wikipedia.org/wiki/Electronic_health_record)
- [HealthIT.gov - Patient Demographics and Observations](https://healthit.gov/test-method/patient-demographics-and-observations/)
- [NCBI - SOAP Notes](https://www.ncbi.nlm.nih.gov/books/NBK482263/)
- [ICD-10-CM 2026](https://www.icd10data.com/)
- [CDC - ICD-10-CM](https://www.cdc.gov/nchs/icd/icd-10-cm/index.html)
- [NCBI - Obtaining Data From Electronic Health Records](https://www.ncbi.nlm.nih.gov/books/NBK551878/)
