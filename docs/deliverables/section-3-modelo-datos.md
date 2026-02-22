# 3. Modelo de Datos

## 3.1. Diagrama del modelo de datos

```mermaid
erDiagram
    Provider ||--o{ Appointment : crea
    Patient ||--o{ Appointment : tiene
    Patient ||--o{ Allergy : tiene
    Patient ||--o{ ChronicCondition : tiene
    Appointment ||--|| MedicalRecord : contiene
    Appointment ||--o| VitalSigns : tiene
    MedicalRecord ||--o{ Symptom : incluye
    MedicalRecord ||--o{ Prescription : incluye

    Provider {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        string specialty
        string licenseNumber
        string phone
        datetime createdAt
        datetime updatedAt
    }

    Patient {
        uuid id PK
        string firstName
        string lastName
        date dateOfBirth
        enum sex
        string phone
        string email
        string address
        string emergencyContactName
        string emergencyContactPhone
        string emergencyContactRelationship
        datetime createdAt
        datetime updatedAt
    }

    Allergy {
        uuid id PK
        uuid patientId FK
        string allergen
        string reaction
        enum severity
        date onsetDate
        datetime createdAt
    }

    ChronicCondition {
        uuid id PK
        uuid patientId FK
        string conditionName
        date diagnosisDate
        string status
        text notes
        datetime createdAt
    }

    Appointment {
        uuid id PK
        uuid patientId FK
        uuid providerId FK
        datetime appointmentDate
        enum appointmentType
        string reasonForVisit
        int durationMinutes
        enum status
        datetime createdAt
        datetime updatedAt
    }

    MedicalRecord {
        uuid id PK
        uuid appointmentId FK UK
        string chiefComplaint
        text historyOfPresentIllness
        text physicalExamNotes
        string diagnosis
        text diagnosisNotes
        text treatmentPlan
        text followUpInstructions
        text patientEducation
        string audioFileUrl
        text transcript
        boolean isAIGenerated
        boolean isDraft
        datetime createdAt
        datetime updatedAt
    }

    Symptom {
        uuid id PK
        uuid medicalRecordId FK
        string symptomName
        string bodySite
        int severity
        string duration
        text notes
        boolean isAIExtracted
        datetime createdAt
    }

    Prescription {
        uuid id PK
        uuid medicalRecordId FK
        string medicationName
        string strength
        string dosage
        string frequency
        string duration
        int quantity
        int refills
        text instructions
        string indication
        boolean isAIExtracted
        datetime createdAt
    }

    VitalSigns {
        uuid id PK
        uuid appointmentId FK UK
        int bloodPressureSystolic
        int bloodPressureDiastolic
        int heartRate
        decimal temperature
        int respiratoryRate
        int oxygenSaturation
        decimal weight
        decimal height
        decimal bmi
        int painLevel
        datetime recordedAt
    }
```

---

## 3.2. Descripción de entidades principales

### Proveedor (Provider)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| email | String | UNIQUE, NOT NULL | Correo electrónico para inicio de sesión |
| passwordHash | String | NOT NULL | Hash de contraseña (bcrypt) |
| firstName | String | NOT NULL | Nombre del proveedor |
| lastName | String | NOT NULL | Apellido del proveedor |
| specialty | String | NULL | Especialidad médica |
| licenseNumber | String | NULL | Número de licencia médica |
| phone | String | NULL | Teléfono de contacto |
| createdAt | DateTime | NOT NULL | Fecha de creación del registro |
| updatedAt | DateTime | NOT NULL | Fecha de última actualización |

**Relaciones:**
- Un proveedor crea muchas citas (1:N)

---

### Paciente (Patient)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| firstName | String | NOT NULL | Nombre del paciente |
| lastName | String | NOT NULL | Apellido del paciente |
| dateOfBirth | Date | NOT NULL | Fecha de nacimiento |
| sex | Enum | NOT NULL | Sexo biológico (male, female, other) |
| phone | String | NOT NULL | Teléfono principal |
| email | String | NULL | Correo electrónico |
| address | String | NULL | Dirección completa |
| emergencyContactName | String | NOT NULL | Nombre del contacto de emergencia |
| emergencyContactPhone | String | NOT NULL | Teléfono del contacto de emergencia |
| emergencyContactRelationship | String | NULL | Relación con el paciente |
| createdAt | DateTime | NOT NULL | Fecha de creación |
| updatedAt | DateTime | NOT NULL | Fecha de actualización |

**Relaciones:**
- Un paciente tiene muchas alergias (1:N)
- Un paciente tiene muchas condiciones crónicas (1:N)
- Un paciente tiene muchas citas (1:N)

---

### Alergia (Allergy)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| patientId | UUID | FK, NOT NULL | Referencia al paciente |
| allergen | String | NOT NULL | Sustancia alergénica |
| reaction | String | NULL | Descripción de la reacción |
| severity | Enum | NULL | Severidad (mild, moderate, severe, life_threatening) |
| onsetDate | Date | NULL | Fecha de inicio conocida |
| createdAt | DateTime | NOT NULL | Fecha de creación |

**Relaciones:**
- Una alergia pertenece a un paciente (N:1)

---

### Condición Crónica (ChronicCondition)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| patientId | UUID | FK, NOT NULL | Referencia al paciente |
| conditionName | String | NOT NULL | Nombre de la condición |
| diagnosisDate | Date | NULL | Fecha de diagnóstico |
| status | String | DEFAULT 'active' | Estado (active, resolved) |
| notes | Text | NULL | Notas adicionales |
| createdAt | DateTime | NOT NULL | Fecha de creación |

**Relaciones:**
- Una condición crónica pertenece a un paciente (N:1)

---

### Cita (Appointment)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| patientId | UUID | FK, NOT NULL | Referencia al paciente |
| providerId | UUID | FK, NOT NULL | Referencia al proveedor |
| appointmentDate | DateTime | NOT NULL | Fecha y hora de la cita |
| appointmentType | Enum | NOT NULL | Tipo de cita |
| reasonForVisit | String | NULL | Motivo de consulta |
| durationMinutes | Int | DEFAULT 30 | Duración esperada en minutos |
| status | Enum | DEFAULT 'scheduled' | Estado de la cita |
| createdAt | DateTime | NOT NULL | Fecha de creación |
| updatedAt | DateTime | NOT NULL | Fecha de actualización |

**Valores del Enum appointmentType:**
- `new_patient`: Paciente nuevo
- `follow_up`: Seguimiento
- `routine_checkup`: Chequeo de rutina
- `sick_visit`: Visita por enfermedad
- `telehealth`: Consulta remota

**Valores del Enum status:**
- `scheduled`: Programada
- `checked_in`: Paciente registrado
- `in_progress`: En progreso
- `completed`: Completada
- `cancelled`: Cancelada
- `no_show`: No se presentó

**Relaciones:**
- Una cita pertenece a un paciente (N:1)
- Una cita pertenece a un proveedor (N:1)
- Una cita tiene un registro médico (1:1)
- Una cita tiene signos vitales (1:1, opcional)

---

### Registro Médico (MedicalRecord)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| appointmentId | UUID | FK, UNIQUE | Referencia a la cita |
| chiefComplaint | String | NULL | Queja principal |
| historyOfPresentIllness | Text | NULL | Historia de la enfermedad actual |
| physicalExamNotes | Text | NULL | Notas del examen físico |
| diagnosis | String | NULL | Diagnóstico principal |
| diagnosisNotes | Text | NULL | Notas del diagnóstico |
| treatmentPlan | Text | NULL | Plan de tratamiento |
| followUpInstructions | Text | NULL | Instrucciones de seguimiento |
| patientEducation | Text | NULL | Educación al paciente |
| audioFileUrl | String | NULL | URL del archivo de audio |
| transcript | Text | NULL | Transcripción de la conversación |
| isAIGenerated | Boolean | DEFAULT false | Indica si fue generado por IA |
| isDraft | Boolean | DEFAULT true | Indica si es borrador |
| createdAt | DateTime | NOT NULL | Fecha de creación |
| updatedAt | DateTime | NOT NULL | Fecha de actualización |

**Relaciones:**
- Un registro médico pertenece a una cita (1:1)
- Un registro médico tiene muchos síntomas (1:N)
- Un registro médico tiene muchas recetas (1:N)

---

### Síntoma (Symptom)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| medicalRecordId | UUID | FK, NOT NULL | Referencia al registro médico |
| symptomName | String | NOT NULL | Nombre del síntoma |
| bodySite | String | NULL | Ubicación corporal |
| severity | SmallInt | NULL | Severidad (1-10) |
| duration | String | NULL | Duración del síntoma |
| notes | Text | NULL | Notas adicionales |
| isAIExtracted | Boolean | DEFAULT false | Indica si fue extraído por IA |
| createdAt | DateTime | NOT NULL | Fecha de creación |

**Relaciones:**
- Un síntoma pertenece a un registro médico (N:1)

---

### Diagnóstico (Diagnosis)

El diagnóstico está embebido en el modelo `MedicalRecord` para el MVP:

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| diagnosis | String | NULL | Descripción del diagnóstico |
| diagnosisNotes | Text | NULL | Notas adicionales del diagnóstico |

**Nota:** En futuras versiones, el diagnóstico podría extraerse a una entidad separada para soportar múltiples diagnósticos por cita.

---

### Receta (Prescription)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| medicalRecordId | UUID | FK, NOT NULL | Referencia al registro médico |
| medicationName | String | NOT NULL | Nombre del medicamento |
| strength | String | NOT NULL | Concentración (ej: "400mg") |
| dosage | String | NOT NULL | Dosis por toma (ej: "1 tableta") |
| frequency | String | NOT NULL | Frecuencia (ej: "cada 8 horas") |
| duration | String | NULL | Duración del tratamiento |
| quantity | Int | NULL | Cantidad total a dispensar |
| refills | Int | DEFAULT 0 | Número de recargas autorizadas |
| instructions | Text | NOT NULL | Instrucciones para el paciente |
| indication | String | NULL | Indicación del medicamento |
| isAIExtracted | Boolean | DEFAULT false | Indica si fue extraído por IA |
| createdAt | DateTime | NOT NULL | Fecha de creación |

**Relaciones:**
- Una receta pertenece a un registro médico (N:1)

---

### Transcripción (Transcription)

La transcripción está embebida en el modelo `MedicalRecord` para el MVP:

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| audioFileUrl | String | NULL | Ruta/URL del archivo de audio |
| transcript | Text | NULL | Texto completo de la transcripción |
| isAIGenerated | Boolean | DEFAULT false | Indica si el registro fue asistido por IA |

**Nota:** En futuras versiones, la transcripción podría extraerse a una entidad separada con información adicional como segmentos con timestamps.

---

### Signos Vitales (VitalSigns)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| appointmentId | UUID | FK, UNIQUE | Referencia a la cita |
| bloodPressureSystolic | Int | NULL | Presión sistólica (mmHg) |
| bloodPressureDiastolic | Int | NULL | Presión diastólica (mmHg) |
| heartRate | Int | NULL | Frecuencia cardíaca (lpm) |
| temperature | Decimal(4,1) | NULL | Temperatura corporal |
| respiratoryRate | Int | NULL | Frecuencia respiratoria (rpm) |
| oxygenSaturation | Int | NULL | Saturación de oxígeno (%) |
| weight | Decimal(5,2) | NULL | Peso (lbs o kg) |
| height | Decimal(5,2) | NULL | Altura (in o cm) |
| bmi | Decimal(4,1) | NULL | Índice de masa corporal |
| painLevel | SmallInt | NULL | Nivel de dolor (0-10) |
| recordedAt | DateTime | NOT NULL | Fecha y hora de registro |

**Relaciones:**
- Los signos vitales pertenecen a una cita (1:1)

---

## 3.3. Resumen de Relaciones

| Entidad A | Relación | Entidad B | Cardinalidad |
|-----------|----------|-----------|--------------|
| Provider | crea | Appointment | 1:N |
| Patient | tiene | Appointment | 1:N |
| Patient | tiene | Allergy | 1:N |
| Patient | tiene | ChronicCondition | 1:N |
| Appointment | contiene | MedicalRecord | 1:1 |
| Appointment | tiene | VitalSigns | 1:0..1 |
| MedicalRecord | incluye | Symptom | 1:N |
| MedicalRecord | incluye | Prescription | 1:N |

---

## 3.4. Tecnología de Base de Datos

| Aspecto | Valor |
|---------|-------|
| **Base de datos** | PostgreSQL 15 |
| **ORM** | Prisma |
| **Migraciones** | Prisma Migrate |
| **Formato de IDs** | UUID v4 |

---

## 3.5. Índices Principales

| Tabla | Índice | Propósito |
|-------|--------|-----------|
| patients | `[lastName, firstName]` | Búsqueda por nombre |
| patients | `[phone]` | Búsqueda por teléfono |
| patients | `[email]` | Búsqueda por email |
| appointments | `[patientId]` | Historial del paciente |
| appointments | `[appointmentDate]` | Filtrado por fecha |
| appointments | `[status]` | Filtrado por estado |
| medical_records | `[appointmentId]` | Relación 1:1 |
| symptoms | `[medicalRecordId]` | Síntomas del registro |
| prescriptions | `[medicalRecordId]` | Recetas del registro |
