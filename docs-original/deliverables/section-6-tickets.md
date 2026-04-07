# 6. Tickets de Trabajo

## Resumen del Proyecto

El proyecto Medical Record System MVP se divide en **13 tickets de trabajo** organizados en 6 fases de implementación, con un total estimado de **76 story points**.

| Fase | Tickets | Story Points |
|------|---------|--------------|
| 1. Fundación | 4 | 18 |
| 2. Gestión de Pacientes | 2 | 13 |
| 3. Gestión de Citas | 2 | 10 |
| 4. Registros Médicos | 2 | 16 |
| 5. Integración IA | 2 | 16 |
| 6. Mejoras | 1 | 3 |

---

## Ticket 1: Backend - Implementación de Autenticación

**ID:** TICKET-002

**Título:** Autenticación Backend con JWT

**Descripción:**
Implementar sistema de autenticación basado en JWT incluyendo registro de usuarios (proveedores de salud), inicio de sesión, validación de tokens y middleware de protección de rutas. Este componente es crítico ya que protege todos los endpoints de la API y asegura que solo usuarios autorizados puedan acceder a los datos médicos.

**Criterios de Aceptación:**
- El usuario puede registrarse con email y contraseña
- El usuario puede iniciar sesión y recibir un token JWT
- Las rutas protegidas requieren un JWT válido en el header Authorization
- El token incluye ID del proveedor, email y fecha de expiración
- La contraseña se almacena hasheada con bcrypt (12 rounds)
- Credenciales inválidas retornan error 401 Unauthorized
- Email duplicado en registro retorna error 409 Conflict
- Endpoint GET /auth/me retorna información del usuario autenticado

**Tareas Técnicas:**

1. **Servicio de Autenticación (`auth.service.ts`)**
   - Método `register(data)` - Crear proveedor con contraseña hasheada
   - Método `login(email, password)` - Validar credenciales y retornar JWT
   - Método `validateToken(token)` - Verificar JWT y retornar payload
   - Método `hashPassword(password)` - Hash con bcrypt
   - Método `comparePassword(plain, hashed)` - Verificar contraseña

2. **Controlador de Autenticación (`auth.controller.ts`)**
   - Handler para POST /auth/register
   - Handler para POST /auth/login
   - Handler para GET /auth/me

3. **Middleware de Autenticación (`auth.middleware.ts`)**
   - Extraer y validar JWT del header Authorization
   - Adjuntar datos del usuario a req.provider
   - Retornar 401 si token falta, es inválido o expiró

4. **Validadores con Zod (`auth.validator.ts`)**
   - Schema de registro (email, password, firstName, lastName, specialty)
   - Schema de login (email, password)

5. **Utilidad JWT (`jwt.ts`)**
   - `generateToken(payload)` - Crear JWT firmado
   - `verifyToken(token)` - Verificar y decodificar JWT

6. **Tests unitarios e integración**
   - Tests para auth.service (hashing, tokens, validación)
   - Tests para auth.routes (registro, login, /me)

**Endpoints:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me (protegido)
```

**Estimación:** 5 story points

**Dependencias:** TICKET-001 (Database Schema)

---

## Ticket 2: Frontend - Página de Cita Médica con Transcripción

**ID:** TICKET-011

**Título:** Frontend de Transcripción con IA

**Descripción:**
Implementar la interfaz de usuario para la grabación de audio durante consultas médicas, visualización de transcripción en tiempo real, y auto-llenado inteligente de campos del registro médico. Esta funcionalidad representa el valor diferenciador principal del sistema, permitiendo a los médicos documentar consultas de manera eficiente mediante IA.

**Criterios de Aceptación:**
- Botón de grabación visible (Iniciar/Detener)
- Solicitud de permiso de micrófono al iniciar
- Indicador visual (punto rojo pulsante) durante la grabación
- Temporizador de duración de grabación (MM:SS)
- Transcripción aparece en tiempo real durante el procesamiento
- Indicadores de estado de extracción de IA
- Campos del registro médico se llenan automáticamente con sugerencias de IA
- Campos llenados por IA tienen indicador visual (badge)
- Puntuaciones de confianza mostradas para cada extracción
- Botones de Aceptar/Rechazar para sugerencias individuales
- Opciones "Aceptar Todo" y "Limpiar Todo"
- Texto fuente resaltado al pasar el cursor (opcional)
- Soporte para grabaciones de hasta 60 minutos
- Manejo de errores para fallos de audio/API

**Tareas Técnicas:**

1. **Panel de Transcripción (`TranscriptionPanel.tsx`)**
   - Contenedor para todos los componentes de transcripción
   - Sección de controles de grabación
   - Sección de visualización de transcripción
   - Sección de estado de extracción de IA
   - Panel colapsable/expandible

2. **Grabador de Audio (`AudioRecorder.tsx`)**
   - Botón Iniciar/Detener grabación
   - Integración con MediaRecorder API
   - Indicador de grabación (punto rojo pulsante)
   - Temporizador de grabación
   - Estado de error para permiso denegado

3. **Visualización de Transcripción (`TranscriptionDisplay.tsx`)**
   - Área de texto con scroll
   - Actualizaciones de texto en tiempo real
   - Auto-scroll hacia abajo
   - Indicador de carga durante procesamiento
   - Botón de copiar transcripción

4. **Estado de Extracción IA (`AIExtractionStatus.tsx`)**
   - Indicador de procesamiento
   - Categorías de extracción (síntomas, diagnóstico, prescripciones)
   - Conteo de elementos extraídos
   - Indicadores de confianza
   - Botón "Aplicar al Formulario"

5. **Hook useAudioRecorder (`useAudioRecorder.ts`)**
   - `startRecording()` - Iniciar MediaRecorder
   - `stopRecording()` - Detener y retornar audio
   - `isRecording` - Estado de grabación
   - `duration` - Duración de grabación
   - `error` - Errores de permiso/grabación

6. **Hook useTranscription (`useTranscription.ts`)**
   - Gestión de conexión WebSocket
   - `startSession(appointmentId)` - Iniciar sesión
   - `sendAudioChunk(chunk)` - Enviar audio
   - `transcript` - Texto de transcripción actual
   - `extraction` - Campos extraídos

7. **Store de Transcripción (`transcription.store.ts`)**
   - Estado de transcripción y grabación
   - Sugerencias pendientes
   - Métodos para aceptar/rechazar sugerencias

8. **Integración con Formulario Médico**
   - Actualizar SymptomsSection para mostrar sugerencias IA
   - Actualizar PrescriptionsSection para sugerencias IA
   - Destacar campos llenados por IA

**Componentes:**
- TranscriptionPanel
- AudioRecorder
- TranscriptionDisplay
- AIExtractionStatus
- RecordingIndicator
- RecordingTimer
- AISuggestionBadge

**Estimación:** 8 story points

**Dependencias:** TICKET-009 (Medical Records Frontend), TICKET-010 (Transcription Backend)

---

## Ticket 3: Base de Datos - Esquema y Migraciones

**ID:** TICKET-001

**Título:** Implementación del Esquema de Base de Datos

**Descripción:**
Definir el esquema completo de la base de datos usando Prisma ORM, incluyendo todas las entidades, relaciones, enums, índices optimizados y script de datos semilla para desarrollo y pruebas. Este esquema soporta toda la funcionalidad de registros médicos incluyendo pacientes, citas, registros médicos en formato SOAP, síntomas, prescripciones y datos de transcripción de IA.

**Criterios de Aceptación:**
- Las 9 entidades principales definidas en el esquema Prisma
- Todos los enums creados (Sex, AllergySeverity, AppointmentType, AppointmentStatus)
- Relaciones correctamente definidas con eliminación en cascada apropiada
- Índices creados para campos frecuentemente consultados
- Migración inicial generada y aplicable
- Script de seed crea datos de prueba realistas
- Conexión a base de datos funciona correctamente

**Tareas Técnicas:**

1. **Definir Modelos Prisma**
   - **Provider** - Cuenta de proveedor de salud
     - id, email (único), passwordHash, firstName, lastName
     - specialty, licenseNumber, phone, timestamps

   - **Patient** - Demografía de paciente
     - id, providerId (FK), firstName, lastName, dateOfBirth
     - sex (enum), phone, email, dirección completa
     - contacto de emergencia, información de seguro

   - **Allergy** - Alergias del paciente
     - id, patientId (FK), allergen, severity (enum), reaction

   - **ChronicCondition** - Condiciones crónicas
     - id, patientId (FK), condition, diagnosedDate, notes

   - **Appointment** - Citas médicas
     - id, patientId (FK), providerId (FK)
     - appointmentDate, appointmentType (enum), status (enum)
     - reason, notes

   - **MedicalRecord** - Documentación clínica (formato SOAP)
     - id, appointmentId (FK, único)
     - chiefComplaint, subjective, objective, assessment, plan
     - aiTranscript, aiSummary

   - **Symptom** - Síntomas documentados
     - id, medicalRecordId (FK), name, severity, duration
     - notes, aiGenerated (boolean)

   - **Prescription** - Medicamentos prescritos
     - id, medicalRecordId (FK), medication, dosage
     - frequency, duration, quantity, refills, instructions
     - aiGenerated (boolean)

   - **VitalSigns** - Signos vitales
     - id, appointmentId (FK, único)
     - presión arterial, frecuencia cardíaca, temperatura
     - frecuencia respiratoria, saturación O2, peso, altura

2. **Definir Enums**
   - `Sex`: male, female, other
   - `AllergySeverity`: mild, moderate, severe, life_threatening
   - `AppointmentType`: new_patient, follow_up, routine_checkup, sick_visit, telehealth
   - `AppointmentStatus`: scheduled, checked_in, in_progress, completed, cancelled, no_show

3. **Crear Índices de Optimización**
   - Patient: (lastName, firstName), phone, email, providerId
   - Appointment: patientId, providerId, appointmentDate, status
   - Symptom, Prescription: medicalRecordId

4. **Configurar Eliminación en Cascada**
   - Eliminar Patient → elimina Appointments, Allergies, Conditions
   - Eliminar Appointment → elimina MedicalRecord, VitalSigns
   - Eliminar MedicalRecord → elimina Symptoms, Prescriptions

5. **Crear Script de Seed**
   - 1 Provider (Dr. Demo)
   - 5 Patients con demografía variada
   - 2-3 Alergias por paciente
   - 1-2 Condiciones crónicas por paciente
   - 3-5 Citas por paciente (varios estados)
   - Registros médicos para citas completadas
   - Síntomas y prescripciones de ejemplo

**Entidades:**
```
Provider, Patient, Allergy, ChronicCondition,
Appointment, MedicalRecord, Symptom, Prescription, VitalSigns
```

**Archivos a Crear:**
- `packages/backend/prisma/schema.prisma`
- `packages/backend/prisma/seed.ts`
- `packages/backend/prisma/migrations/[initial]/`

**Estimación:** 3 story points

**Dependencias:** TICKET-000 (Project Setup)

---

## Índice Completo de Tickets

| ID | Título | Tipo | Prioridad | Puntos |
|----|--------|------|-----------|--------|
| 000 | Configuración del Proyecto | Técnico | P0 | 5 |
| 001 | Esquema de Base de Datos | Técnico | P0 | 3 |
| 002 | Autenticación Backend | Feature | P0 | 5 |
| 003 | Autenticación Frontend | Feature | P0 | 5 |
| 004 | Pacientes Backend | Feature | P0 | 5 |
| 005 | Pacientes Frontend | Feature | P0 | 8 |
| 006 | Citas Backend | Feature | P0 | 5 |
| 007 | Citas Frontend | Feature | P0 | 5 |
| 008 | Registros Médicos Backend | Feature | P0 | 8 |
| 009 | Registros Médicos Frontend | Feature | P0 | 8 |
| 010 | Transcripción Backend | Feature | P1 | 8 |
| 011 | Transcripción Frontend | Feature | P1 | 8 |
| 012 | Generación de Resúmenes | Feature | P2 | 3 |

**Total: 13 tickets | 76 story points**

---

## Orden de Implementación

```
Fase 1: Fundación
├── TICKET-000: Project Setup
├── TICKET-001: Database Schema
├── TICKET-002: Auth Backend
└── TICKET-003: Auth Frontend

Fase 2: Pacientes
├── TICKET-004: Patients Backend
└── TICKET-005: Patients Frontend

Fase 3: Citas
├── TICKET-006: Appointments Backend
└── TICKET-007: Appointments Frontend

Fase 4: Registros Médicos
├── TICKET-008: Medical Records Backend
└── TICKET-009: Medical Records Frontend

Fase 5: IA
├── TICKET-010: Transcription Backend
└── TICKET-011: Transcription Frontend

Fase 6: Mejoras
└── TICKET-012: Summary Generation
```

---

## Estimación de Sprints

Asumiendo sprints de 2 semanas con capacidad de 20-25 story points:

| Sprint | Tickets | Puntos |
|--------|---------|--------|
| 1 | 000, 001, 002, 003 | 18 |
| 2 | 004, 005 | 13 |
| 3 | 006, 007, 008 (parcial) | 18 |
| 4 | 008 (completo), 009 | 16 |
| 5 | 010, 011 | 16 |
| 6 | 012, Buffer/Pulido | 3+ |

**Duración Estimada Total: 6 Sprints (12 semanas)**
