## Índice

0. [Ficha del proyecto](#0-ficha-del-proyecto)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

Eduardo Jiménez Vázquez - enrique.jimenez@sicuentame.com

### **0.2. Nombre del proyecto:**

MedRecord AI - Sistema de Historial Médico con IA

### **0.3. Descripción breve del proyecto:**

Sistema de gestión de historiales médicos diseñado para médicos generales y consultorios pequeños. Permite registrar citas, documentar síntomas, diagnósticos y recetas en formato SOAP, y utiliza inteligencia artificial para transcribir consultas de hasta 60 minutos y auto-llenar campos médicos en tiempo real, reduciendo el tiempo de documentación hasta en un 50%.

### **0.4. URL del proyecto:**

> https://medrecord.enjimenez.com

### 0.5. URL o archivo comprimido del repositorio

https://github.com/ejimenezv/health-record

---

## 1. Descripción general del producto

### **1.1. Objetivo:**

**MedRecord AI** resuelve uno de los mayores desafíos que enfrentan los profesionales de la salud: la carga administrativa de la documentación clínica.

#### El Problema

Los médicos dedican en promedio **2 horas diarias** a documentación por cada hora de atención directa al paciente. Esta carga administrativa:

- Reduce el tiempo de interacción con pacientes
- Contribuye al agotamiento profesional (burnout)
- Genera retrasos en la documentación de expedientes
- Aumenta el riesgo de errores por transcripción manual
- Afecta la calidad de atención cuando detalles importantes se olvidan o registran imprecisamente

#### La Solución

MedRecord AI utiliza inteligencia artificial para transformar las conversaciones médico-paciente en expedientes clínicos estructurados automáticamente:

1. **Graba** la consulta médica (audio)
2. **Transcribe** la conversación usando IA (speech-to-text con OpenAI Whisper)
3. **Extrae** información estructurada (síntomas, diagnósticos, prescripciones) con GPT-4
4. **Pre-llena** el formulario de expediente médico
5. **Permite al médico revisar**, editar y confirmar antes de guardar

#### Propuesta de Valor

> **MedRecord AI reduce el tiempo de documentación hasta en un 50%, permitiendo a los médicos enfocarse en lo que realmente importa: la atención al paciente.**

#### Usuarios Objetivo

| Tipo de Usuario | Descripción |
|-----------------|-------------|
| **Usuario Primario** | Médicos generales y de familia en consultorios privados o clínicas pequeñas |
| **Usuario Secundario** | Administradores de clínicas que gestionan expedientes y citas |

---

### **1.2. Características y funcionalidades principales:**

#### Funcionalidades Core (MVP)

##### 1. Gestión de Pacientes

- **Crear perfiles de pacientes**: Registro con datos demográficos esenciales (nombre, fecha de nacimiento, sexo, contacto, contacto de emergencia)
- **Editar información**: Actualización de datos cuando cambian
- **Buscar pacientes**: Búsqueda rápida por nombre, teléfono o correo electrónico
- **Ver historial**: Acceso al perfil completo con historial de citas

##### 2. Gestión de Citas

- **Crear citas**: Vinculadas a pacientes existentes con fecha, hora, tipo y motivo
- **Tipos de cita**: Paciente nuevo, seguimiento, revisión rutinaria, consulta por enfermedad, telemedicina
- **Estados de cita**: Programada, en espera, en progreso, completada, cancelada, no asistió
- **Historial cronológico**: Visualización de todas las citas de un paciente ordenadas por fecha

##### 3. Documentación Clínica (Formato SOAP)

- **Subjetivo (S)**: Queja principal, historia de enfermedad actual, medicamentos actuales, alergias
- **Objetivo (O)**: Notas del examen físico, signos vitales
- **Evaluación (A)**: Diagnóstico, notas adicionales
- **Plan (P)**: Plan de tratamiento, instrucciones de seguimiento, educación al paciente

##### 4. Registro de Síntomas

- Múltiples síntomas por cita
- Campos: nombre del síntoma, ubicación corporal, severidad (1-10), duración, notas adicionales

##### 5. Gestión de Prescripciones

- Múltiples prescripciones por cita
- Campos: nombre del medicamento, concentración, dosis, frecuencia, duración, cantidad, indicaciones
- Estado de prescripción: activa, completada, discontinuada

##### 6. Transcripción con IA

- **Grabación de audio**: Captura desde el navegador durante la consulta (hasta 60 minutos)
- **Transcripción automática**: Conversión de voz a texto usando OpenAI Whisper
- **Extracción inteligente**: Identificación automática de campos médicos usando GPT-4
- **Auto-llenado de formularios**: Población automática de campos del expediente
- **Indicadores de confianza**: Señalización visual de extracciones con diferente nivel de certeza

##### 7. Interfaz de Revisión Humana

- **Vista lado a lado**: Transcripción junto al formulario de expediente
- **Campos editables**: Todos los campos pueden ser modificados
- **Trazabilidad**: Identificación clara de qué campos fueron llenados por IA vs. manualmente
- **Confirmación explícita**: Nada se guarda sin revisión y confirmación del médico

---

### **1.3. Diseño y experiencia de usuario:**

La aplicación está diseñada siguiendo principios de usabilidad médica, priorizando la eficiencia del flujo de trabajo y la reducción de carga cognitiva durante las consultas.

#### Flujo Principal del Usuario

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE CONSULTA COMPLETA                       │
└─────────────────────────────────────────────────────────────────────────┘

1. INICIO
   └── Dashboard principal con acciones rápidas y pacientes recientes

2. BÚSQUEDA/REGISTRO DE PACIENTE
   ├── Buscar paciente existente por nombre/teléfono
   └── O crear nuevo perfil de paciente

3. CREAR CITA
   └── Seleccionar fecha, tipo y motivo de consulta

4. INICIAR CONSULTA
   ├── Revisar historial del paciente
   ├── Ver alergias y condiciones crónicas
   └── Iniciar grabación de audio

5. GRABAR CONSULTA
   └── Indicador visual de grabación activa durante la conversación

6. PROCESAR CON IA
   ├── Transcripción del audio (15-60 segundos)
   └── Extracción de información estructurada

7. REVISAR Y EDITAR
   ├── Vista de transcripción con texto fuente resaltado
   ├── Formulario pre-llenado con sugerencias de IA
   ├── Editar cualquier campo
   └── Agregar información faltante

8. GUARDAR
   └── Confirmación y actualización del estado de cita a "Completada"
```

#### Características de UX Destacadas

| Característica | Descripción |
|----------------|-------------|
| **Transcripción en Tiempo Real** | Panel lateral con transcripción mientras el médico habla, indicador de grabación pulsante |
| **Auto-llenado con IA** | Campos con badge púrpura (✨) para sugerencias de IA, animación de resaltado |
| **Guardado Automático** | Cambios guardados cada 30 segundos, indicador de estado visible |
| **Diseño Responsivo** | Desktop, tablet y móvil soportados |

#### Paleta de Colores

| Color | Uso | Código |
|-------|-----|--------|
| Azul primario | Acciones principales, enlaces | `#3b82f6` |
| Verde | Confirmaciones, éxito | `#10b981` |
| Púrpura | Indicadores de IA | `#8b5cf6` |
| Rojo | Errores, eliminación | `#ef4444` |
| Grises neutros | Texto, fondos, bordes | `#374151` - `#f9fafb` |

#### Pantallas Principales

| Pantalla | Descripción |
|----------|-------------|
| **Login** | Autenticación con formulario centrado |
| **Dashboard** | Vista inicial con métricas, accesos rápidos y pacientes recientes |
| **Lista de Pacientes** | Grid de tarjetas con búsqueda y filtros |
| **Detalle de Paciente** | Información completa, alergias, condiciones e historial de citas |
| **Consulta Médica** | Interfaz dividida: formulario SOAP + panel de transcripción |

> **Nota**: Las capturas de pantalla están disponibles en `docs/screenshots/`. Para un videotutorial completo, contactar al autor.

---

### **1.4. Instrucciones de instalación:**

#### Requisitos Previos

| Requisito | Versión | Notas |
|-----------|---------|-------|
| Node.js | 20.x LTS | Requerido para ejecutar el proyecto |
| pnpm | 9.x | Gestor de paquetes (`npm i -g pnpm`) |
| Docker Desktop | Última versión | Para PostgreSQL en desarrollo |
| Navegador moderno | Chrome/Firefox/Safari/Edge | Últimas 2 versiones |

#### Claves de API Requeridas

| Servicio | Variable de Entorno | Obtención |
|----------|---------------------|-----------|
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| JWT Secret | `JWT_SECRET` | Generar con `openssl rand -base64 32` |

#### Pasos de Instalación

##### 1. Clonar el repositorio

```bash
git clone https://github.com/Darkvaz/health-record.git
cd health-record
```

##### 2. Configurar variables de entorno

```bash
# Copiar archivos de ejemplo
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Editar packages/backend/.env con tus valores
```

**Contenido de `packages/backend/.env`:**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://healthrecord:healthrecord_dev@localhost:5432/healthrecord"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
OPENAI_API_KEY="sk-your-openai-api-key"
FRONTEND_URL="http://localhost:5173"
LOG_LEVEL="debug"
```

**Contenido de `packages/frontend/.env`:**
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001
```

##### 3. Instalar dependencias

```bash
pnpm install
```

##### 4. Iniciar base de datos con Docker

```bash
docker-compose -f docker/docker-compose.yml up -d
docker ps  # Verificar que el contenedor está ejecutándose
```

##### 5. Ejecutar migraciones y seed

```bash
pnpm db:generate   # Generar cliente Prisma
pnpm db:migrate    # Ejecutar migraciones
pnpm db:seed       # Cargar datos de prueba
```

##### 6. Iniciar la aplicación

```bash
pnpm dev           # Inicia frontend y backend simultáneamente
```

##### 7. Acceder a la aplicación

| Servicio | URL | Credenciales de prueba |
|----------|-----|------------------------|
| Frontend | http://localhost:5173 | `doctor@medrecord.com` / `password123` |
| Backend API | http://localhost:3001 | - |
| Prisma Studio | `pnpm db:studio` | - |

#### Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Iniciar frontend y backend
pnpm dev:backend      # Solo backend
pnpm dev:frontend     # Solo frontend

# Base de datos
pnpm db:migrate       # Ejecutar migraciones
pnpm db:seed          # Cargar datos de prueba
pnpm db:studio        # Abrir Prisma Studio (GUI para BD)
pnpm db:generate      # Regenerar cliente Prisma

# Calidad de código
pnpm test             # Ejecutar tests
pnpm lint             # Verificar linting
pnpm lint:fix         # Corregir errores de linting
pnpm format           # Formatear código con Prettier
pnpm type-check       # Verificación de tipos TypeScript

# Build
pnpm build            # Compilar para producción
```

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

```mermaid
graph TB
    subgraph Cliente["Capa Cliente (Navegador)"]
        A[Frontend React<br/>TypeScript SPA]
        B[Módulo de Captura<br/>de Audio]
        C[Gestión de Estado<br/>React Query + Context]
    end

    subgraph Servidor["Capa Servidor (Node.js)"]
        D[Servidor API Express]
        E[Middleware Auth<br/>Validación JWT]
        F[Capa de Rutas API]

        subgraph Servicios["Capa de Servicios"]
            G[AuthService]
            H[PatientService]
            I[AppointmentService]
            J[MedicalRecordService]
            K[AIService]
        end

        L[Capa de Acceso a Datos<br/>Prisma ORM]
    end

    subgraph Externos["Servicios Externos"]
        M[OpenAI Whisper API<br/>Transcripción]
        N[OpenAI GPT-4 API<br/>Extracción de Datos]
    end

    subgraph Datos["Capa de Datos"]
        O[(PostgreSQL<br/>Base de Datos)]
        P[Almacenamiento<br/>Archivos de Audio]
    end

    A -->|HTTPS/REST| D
    B -->|Subida de Audio| D
    C --> A

    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K

    G --> L
    H --> L
    I --> L
    J --> L

    K -->|Solicitud de Transcripción| M
    K -->|Solicitud de Extracción| N

    L --> O
    K --> P
```

**Patrón arquitectónico**: Arquitectura Monolítica en Capas con Límites de Servicio

**Justificación**:

| Aspecto | Decisión |
|---------|----------|
| **Velocidad de desarrollo** | Un único código base permite iteración rápida, ideal para MVP |
| **Simplicidad operacional** | Despliegue simple en un único servidor Ubuntu |
| **Depuración eficiente** | Debugging directo sin complejidad de sistemas distribuidos |
| **Costo optimizado** | Hosting económico (~$24/mes) al ejecutar todo en un servidor |
| **Preparado para escalar** | Los límites claros entre servicios permiten evolución a microservicios |

**Trade-offs**:
- Escalabilidad horizontal limitada (aceptable para MVP)
- Punto único de fallo (aceptable para demostración)
- Requiere refactorización para multi-tenancy verdadero

---

### **2.2. Descripción de componentes principales:**

#### Frontend (React/TypeScript)

Single Page Application (SPA) construida con React 18 y TypeScript.

| Tecnología | Propósito |
|------------|-----------|
| React 18 con Hooks | Framework UI |
| TypeScript 5 | Type safety |
| Vite | Build tool |
| Tailwind CSS | Estilos |
| React Query | Estado del servidor |
| React Hook Form + Zod | Formularios y validación |
| Zustand | Estado global |

#### Backend (Node.js/Express)

Servidor API RESTful con lógica de negocio y orquestación de integraciones.

| Capa | Propósito |
|------|-----------|
| **Rutas (Routes)** | Definición de endpoints, manejo de HTTP |
| **Middleware** | Autenticación, validación, rate limiting |
| **Servicios** | Lógica de negocio, orquestación |
| **Acceso a Datos** | Operaciones de base de datos via Prisma |

**Endpoints Principales**:
```
/api/auth/*        - Autenticación (login, logout, verificación)
/api/patients/*    - Gestión de pacientes (CRUD, búsqueda)
/api/appointments/*- Gestión de citas (crear, actualizar, listar)
/api/records/*     - Registros médicos (guardar, obtener)
/api/ai/*          - Servicios de IA (transcribir, extraer)
```

#### Base de Datos (PostgreSQL)

| Aspecto | Valor |
|---------|-------|
| **Base de datos** | PostgreSQL 15 |
| **ORM** | Prisma 5 |
| **Formato de IDs** | UUID v4 |

#### Servicios de IA (OpenAI)

| Servicio | API | Propósito |
|----------|-----|-----------|
| **Whisper** | OpenAI Audio API | Conversión de audio a texto |
| **GPT-4** | OpenAI Chat API | Extracción de datos estructurados |

---

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

El proyecto sigue una arquitectura de monorepo usando pnpm workspaces.

```
health-record/
├── packages/
│   ├── backend/                      # API Node.js + Express
│   │   ├── src/
│   │   │   ├── app.ts               # Configuración Express
│   │   │   ├── index.ts             # Entry point
│   │   │   ├── config/              # Configuración
│   │   │   ├── controllers/         # Controladores HTTP
│   │   │   ├── middleware/          # Auth, validación, errores
│   │   │   ├── routes/              # Definición de endpoints
│   │   │   ├── services/            # Lógica de negocio
│   │   │   │   └── ai/              # Servicios de IA
│   │   │   ├── validators/          # Schemas Zod
│   │   │   ├── websocket/           # Handlers tiempo real
│   │   │   ├── types/               # TypeScript types
│   │   │   └── utils/               # Utilidades (JWT)
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Esquema de BD
│   │   │   ├── seed.ts              # Datos de prueba
│   │   │   └── migrations/          # Migraciones
│   │   └── package.json
│   │
│   └── frontend/                    # App React + Vite
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── components/
│       │   │   ├── appointments/    # Componentes de citas
│       │   │   ├── auth/            # Autenticación
│       │   │   ├── layout/          # Layout principal
│       │   │   ├── medical-record/  # Registros médicos
│       │   │   ├── transcription/   # Panel de transcripción
│       │   │   └── ui/              # Componentes shadcn/ui
│       │   ├── pages/               # Páginas de la aplicación
│       │   ├── hooks/               # Custom hooks
│       │   ├── services/            # API clients
│       │   ├── store/               # Zustand stores
│       │   ├── types/               # TypeScript types
│       │   └── router/              # React Router config
│       └── package.json
│
├── docker/                          # Configuración Docker
│   ├── docker-compose.yml           # Desarrollo
│   ├── docker-compose.prod.yml      # Producción
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
│
├── docs/                            # Documentación completa
│   ├── product/                     # Definición del producto
│   ├── architecture/                # Arquitectura del sistema
│   ├── data-model/                  # Modelo de datos
│   ├── api/                         # Documentación API
│   ├── tickets/                     # Tickets de implementación
│   ├── deployment/                  # Guía de despliegue
│   └── deliverables/                # Entregables finales
│
├── prompts/                         # Prompts de desarrollo
├── prompts.md                       # Documentación de prompts IA
└── README.md                        # Documentación principal
```

---

### **2.4. Infraestructura y despliegue**

```mermaid
graph TB
    subgraph Internet
        Usuario[Navegador del Doctor]
        OpenAI[API de OpenAI]
    end

    subgraph VPS["Servidor Ubuntu (VPS)"]
        subgraph Docker["Entorno Docker"]
            Nginx[Nginx:443/80<br/>Proxy Inverso]

            subgraph App["Stack de Aplicación"]
                Frontend[Contenedor Frontend<br/>React Build]
                Backend[Contenedor Backend<br/>Node.js]
            end

            Postgres[(PostgreSQL<br/>Contenedor)]
        end

        subgraph Storage["Almacenamiento Persistente"]
            DBData[Volumen BD]
            AudioFiles[Volumen Audios]
        end
    end

    Usuario -->|HTTPS| Nginx
    Nginx -->|/| Frontend
    Nginx -->|/api| Backend
    Backend --> Postgres
    Backend -->|HTTPS| OpenAI
    Postgres --> DBData
    Backend --> AudioFiles
```

#### Especificaciones del Servidor

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Almacenamiento | 50 GB SSD | 100 GB SSD |
| SO | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

#### Proceso de Despliegue

1. Push a rama `main`
2. SSH al servidor
3. Pull del código actualizado
4. Build de contenedores Docker
5. Reinicio de servicios con `docker compose`
6. Ejecución de migraciones Prisma
7. Verificación de health check

---

### **2.5. Seguridad**

#### Autenticación
- **Método**: JWT (JSON Web Tokens)
- **Algoritmo**: HS256 con secreto de 256 bits
- **Expiración**: 24 horas
- **Almacenamiento**: localStorage del navegador
- **Transmisión**: Header Authorization Bearer

#### Protección de Datos
- **En tránsito**: HTTPS obligatorio (TLS 1.2+)
- **Contraseñas**: Hash con bcrypt (12 rounds)
- **Archivos de audio**: UUIDs aleatorios sin PII en nombres

#### Seguridad de API
- **CORS**: Configurado solo para dominio frontend
- **Rate Limiting**: 100 req/15min general, 5 intentos/15min login, 10 req/min IA
- **Validación**: Zod schemas en todos los endpoints
- **Headers**: Helmet para headers de seguridad (HSTS, XSS, etc.)

> **Aviso**: Este MVP es para demostración y propósitos educativos. NO es compatible con HIPAA y NO debe usarse con datos reales de pacientes.

---

### **2.6. Tests**

La suite de tests sigue la pirámide de tests: muchos tests unitarios rápidos, tests de integración para endpoints, y E2E para flujos críticos.

#### Tests Unitarios (Backend)

| Servicio | Tests | Descripción |
|----------|-------|-------------|
| AuthService | 10 | Registro, login, validación de tokens |
| PatientsService | 12 | CRUD de pacientes, búsqueda, paginación |
| AppointmentsService | 8 | Gestión de citas, cambios de estado |
| MedicalRecordsService | 10 | Registros médicos, síntomas, recetas |
| ExtractionService | 10 | Extracción de datos médicos con IA |

**Ejemplo de Test:**

```typescript
describe('PatientsService', () => {
  describe('create', () => {
    it('debe crear paciente con todos los campos requeridos', async () => {
      const patientData = {
        firstName: 'Juan',
        lastName: 'García',
        dateOfBirth: '1985-03-15',
        sex: 'male',
        phone: '+34612345678',
        emergencyContactName: 'María García',
        emergencyContactPhone: '+34612345679',
      };

      const result = await patientsService.create(patientData, userId);

      expect(result.id).toBeDefined();
      expect(result.firstName).toBe('Juan');
    });
  });
});
```

#### Tests de Integración

| Categoría | Endpoints | Tests |
|-----------|-----------|-------|
| Autenticación | 4 | 12 |
| Pacientes | 8 | 15 |
| Citas | 6 | 14 |
| Registros Médicos | 10 | 10 |

#### Herramientas

| Herramienta | Uso |
|-------------|-----|
| Vitest | Test runner |
| Supertest | Tests de integración API |
| React Testing Library | Tests de componentes |
| MSW | Mocking de APIs |

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

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

### **3.2. Descripción de entidades principales:**

#### Proveedor (Provider)

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

**Relaciones:** Un proveedor crea muchas citas (1:N)

---

#### Paciente (Patient)

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

**Relaciones:**
- Un paciente tiene muchas alergias (1:N)
- Un paciente tiene muchas condiciones crónicas (1:N)
- Un paciente tiene muchas citas (1:N)

---

#### Cita (Appointment)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| patientId | UUID | FK, NOT NULL | Referencia al paciente |
| providerId | UUID | FK, NOT NULL | Referencia al proveedor |
| appointmentDate | DateTime | NOT NULL | Fecha y hora de la cita |
| appointmentType | Enum | NOT NULL | Tipo de cita |
| reasonForVisit | String | NULL | Motivo de consulta |
| durationMinutes | Int | DEFAULT 30 | Duración esperada |
| status | Enum | DEFAULT 'scheduled' | Estado de la cita |

**Valores de appointmentType:** new_patient, follow_up, routine_checkup, sick_visit, telehealth

**Valores de status:** scheduled, checked_in, in_progress, completed, cancelled, no_show

**Relaciones:**
- Una cita tiene un registro médico (1:1)
- Una cita tiene signos vitales (1:1, opcional)

---

#### Registro Médico (MedicalRecord)

| Atributo | Tipo | Restricciones | Descripción |
|----------|------|---------------|-------------|
| id | UUID | PK | Identificador único |
| appointmentId | UUID | FK, UNIQUE | Referencia a la cita |
| chiefComplaint | String | NULL | Queja principal |
| historyOfPresentIllness | Text | NULL | Historia de la enfermedad actual |
| physicalExamNotes | Text | NULL | Notas del examen físico |
| diagnosis | String | NULL | Diagnóstico principal |
| treatmentPlan | Text | NULL | Plan de tratamiento |
| followUpInstructions | Text | NULL | Instrucciones de seguimiento |
| audioFileUrl | String | NULL | URL del archivo de audio |
| transcript | Text | NULL | Transcripción de la conversación |
| isAIGenerated | Boolean | DEFAULT false | Indica si fue generado por IA |
| isDraft | Boolean | DEFAULT true | Indica si es borrador |

**Relaciones:**
- Un registro médico tiene muchos síntomas (1:N)
- Un registro médico tiene muchas recetas (1:N)

---

## 4. Especificación de la API

### Endpoint 1: Crear Paciente

**POST** `/api/v1/patients`

**Descripción:** Crea un nuevo paciente en el sistema con información demográfica, contacto de emergencia, alergias y condiciones crónicas.

#### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Sí |
| `Content-Type` | `application/json` | Sí |

#### Request Body

```json
{
  "firstName": "Juan",
  "lastName": "García",
  "dateOfBirth": "1985-03-15",
  "sex": "male",
  "phone": "+34612345678",
  "email": "juan.garcia@email.com",
  "address": "Calle Mayor 123, Madrid, 28001",
  "emergencyContactName": "María García",
  "emergencyContactPhone": "+34612345679",
  "emergencyContactRelationship": "Esposa",
  "allergies": [
    {
      "allergen": "Penicilina",
      "reaction": "Urticaria",
      "severity": "moderate"
    }
  ],
  "chronicConditions": [
    {
      "conditionName": "Diabetes tipo 2",
      "diagnosisDate": "2020-05-10",
      "status": "active",
      "notes": "Controlada con metformina"
    }
  ]
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "firstName": "Juan",
    "lastName": "García",
    "dateOfBirth": "1985-03-15",
    "sex": "male",
    "phone": "+34612345678",
    "email": "juan.garcia@email.com",
    "allergies": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440010",
        "allergen": "Penicilina",
        "reaction": "Urticaria",
        "severity": "moderate"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Paciente creado exitosamente"
}
```

#### Posibles Errores

| Código | Descripción |
|--------|-------------|
| 401 | Token inválido o expirado |
| 409 | Paciente duplicado |
| 422 | Error de validación |

---

### Endpoint 2: Obtener Historial de Citas del Paciente

**GET** `/api/v1/patients/{id}/appointments`

**Descripción:** Obtiene el historial completo de citas y registros médicos de un paciente.

#### Parámetros de Query

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `status` | string | - | Filtrar por estado |
| `page` | integer | 1 | Número de página |
| `limit` | integer | 10 | Elementos por página |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "appointmentDate": "2024-01-20T14:30:00.000Z",
      "appointmentType": "sick_visit",
      "reasonForVisit": "Dolor de cabeza persistente",
      "status": "completed",
      "medicalRecord": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "diagnosis": "Cefalea tensional",
        "symptomsCount": 2,
        "prescriptionsCount": 1,
        "isAIGenerated": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### Endpoint 3: Iniciar Transcripción de Cita

**POST** `/api/v1/appointments/{appointmentId}/transcription/start`

**Descripción:** Inicia una sesión de transcripción en tiempo real para una cita médica.

#### Request Body (Opcional)

```json
{
  "language": "es",
  "realTimeExtraction": true
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "sessionId": "ts_abc123xyz789",
    "wsUrl": "wss://api.medrecord.app/api/v1/transcription/ts_abc123xyz789",
    "expiresAt": "2024-01-20T16:30:00.000Z",
    "config": {
      "sampleRate": 16000,
      "channelCount": 1,
      "mimeType": "audio/webm;codecs=opus",
      "maxDuration": 3600000
    }
  },
  "message": "Sesión de transcripción iniciada"
}
```

---

## 5. Historias de Usuario

El proyecto define 11 historias de usuario organizadas por prioridad. A continuación se muestra el índice completo, seguido del detalle de 3 historias representativas que cubren el flujo principal de documentación médica.

### Índice Completo de Historias de Usuario

| ID | Título | Prioridad | Puntos | Categoría |
|----|--------|-----------|--------|-----------|
| US-001 | Patient Registration | P0-Must Have | 5 | Patient Management |
| US-002 | Patient Listing and Search | P0-Must Have | 3 | Patient Management |
| US-003 | View Patient Medical History | P0-Must Have | 5 | Patient Management |
| US-004 | Create New Appointment | P0-Must Have | 3 | Appointment Management |
| US-005 | Manual Medical Record Entry | P0-Must Have | 8 | Medical Records |
| US-006 | AI Transcription Recording | P0-Must Have | 8 | AI Integration |
| US-007 | AI Auto-Fill Medical Record | P0-Must Have | 13 | AI Integration |
| US-008 | Appointment Summary Generation | P1-Should Have | 5 | AI Integration |
| US-009 | Export Medical Record to PDF | P1-Should Have | 3 | Medical Records |
| US-010 | User Authentication | P0-Must Have | 5 | Infrastructure |
| US-011 | Data Persistence | P0-Must Have | 3 | Infrastructure |

**Total: 11 historias | 61 story points**

**Distribución por Prioridad:**
- P0-Must Have: 9 historias (53 puntos)
- P1-Should Have: 2 historias (8 puntos)

---

### Detalle de 3 Historias Representativas

### **Historia de Usuario 1: Ver Historial Médico del Paciente**

**Como** médico
**Quiero** ver el historial completo de citas de un paciente
**Para** tener contexto de su historia médica antes de la consulta actual

#### Descripción

Cuando el médico revisa el perfil de un paciente o se prepara para una consulta, necesita ver todas las citas pasadas en orden cronológico. Cada cita debe mostrar un resumen que incluya fecha, tipo, motivo, diagnóstico e información clave.

#### Criterios de Aceptación

- [ ] Dado que estoy en la página de perfil de un paciente, cuando la página carga, entonces veo una lista cronológica de todas las citas pasadas (más recientes primero)
- [ ] Dado que un paciente tiene citas, cuando veo el historial, entonces cada cita muestra: fecha, tipo, motivo de visita, estado y resumen del diagnóstico
- [ ] Dado que hago clic en una cita pasada, entonces navego a la vista completa del registro médico
- [ ] Dado que un paciente no tiene citas, entonces veo un estado vacío con opción de crear la primera cita
- [ ] Dado que existen múltiples citas, las citas completadas muestran su diagnóstico y cantidad de recetas

**Prioridad:** Must-Have (P0) | **Puntos:** 5

---

### **Historia de Usuario 2: Entrada Manual de Registro Médico**

**Como** médico
**Quiero** ingresar manualmente síntomas, diagnóstico y recetas para una cita
**Para** documentar la visita incluso cuando no uso transcripción con IA

#### Descripción

El médico necesita documentar encuentros clínicos usando un formato estructurado. Esto incluye registrar síntomas del paciente (con detalles como severidad y duración), ingresar un diagnóstico y agregar recetas.

#### Criterios de Aceptación

- [ ] Dado que estoy en la página de registro médico, cuando veo el formulario, entonces veo secciones para: Motivo Principal, Síntomas, Diagnóstico, Plan de Tratamiento y Recetas
- [ ] Dado que quiero agregar un síntoma, cuando hago clic en "Agregar Síntoma", puedo ingresar: nombre del síntoma (requerido), ubicación corporal, severidad (1-10), duración y notas
- [ ] Dado que he agregado síntomas, puedo editar o eliminar cualquier síntoma
- [ ] Dado que quiero agregar una receta, cuando hago clic en "Agregar Receta", puedo ingresar: nombre del medicamento, concentración, dosis, frecuencia, duración, cantidad, instrucciones
- [ ] Dado que he ingresado datos del registro, cuando hago clic en "Guardar", todos los datos se persisten
- [ ] Dado que quiero completar la cita, cuando hago clic en "Completar Cita", el estado cambia a "Completada"

**Prioridad:** Must-Have (P0) | **Puntos:** 8

---

### **Historia de Usuario 3: Auto-llenado con IA del Registro Médico**

**Como** médico
**Quiero** que la IA extraiga y llene automáticamente los campos del registro médico desde la transcripción
**Para** ahorrar tiempo en documentación mientras mantengo la precisión a través de la revisión

#### Descripción

Después de que la transcripción se completa, la IA analiza la conversación para identificar y extraer información médica relevante. El sistema llena automáticamente los campos del formulario con datos extraídos. Todos los campos llenados por IA están claramente marcados y son editables.

#### Criterios de Aceptación

- [ ] Dado que hay una transcripción disponible, cuando el procesamiento de IA se completa, los campos del formulario se llenan automáticamente con datos extraídos
- [ ] Dado que la IA extrae síntomas, cada síntoma incluye detalles disponibles (nombre, severidad, duración)
- [ ] Dado que la IA extrae recetas, cada una incluye detalles del medicamento (nombre, dosis, frecuencia, instrucciones)
- [ ] Dado que los campos son llenados por IA, tienen un indicador visual (badge púrpura con ✨)
- [ ] Dado un campo llenado por IA, puedo modificar o limpiar la sugerencia
- [ ] Dado las sugerencias de IA, puedo "Aceptar Todo" o "Limpiar Todo" con una acción
- [ ] Dado que la extracción de IA falla o tiene baja confianza, los campos quedan vacíos requiriendo entrada manual

**Prioridad:** Must-Have (P0) | **Puntos:** 13

---

## 6. Tickets de Trabajo

El proyecto se dividió en 13 tickets de trabajo organizados en 6 fases de desarrollo. A continuación se muestra el índice completo de tickets, seguido del detalle de 3 tickets representativos (uno de backend, uno de frontend, y uno de base de datos).

### Índice Completo de Tickets

| ID | Título | Tipo | Prioridad | Puntos | Fase |
|----|--------|------|-----------|--------|------|
| TICKET-000 | Project Setup and Configuration | Technical | P0-Critical | 5 | 1. Foundation |
| TICKET-001 | Database Schema Implementation | Technical | P0-Critical | 3 | 1. Foundation |
| TICKET-002 | Authentication Backend | Feature | P0-Critical | 5 | 1. Foundation |
| TICKET-003 | Authentication Frontend | Feature | P0-Critical | 5 | 1. Foundation |
| TICKET-004 | Patients Backend | Feature | P0-Critical | 5 | 2. Patient Management |
| TICKET-005 | Patients Frontend | Feature | P0-Critical | 8 | 2. Patient Management |
| TICKET-006 | Appointments Backend | Feature | P0-Critical | 5 | 3. Appointment Management |
| TICKET-007 | Appointments Frontend | Feature | P0-Critical | 5 | 3. Appointment Management |
| TICKET-008 | Medical Records Backend | Feature | P0-Critical | 8 | 4. Medical Records |
| TICKET-009 | Medical Records Frontend | Feature | P0-Critical | 8 | 4. Medical Records |
| TICKET-010 | AI Transcription Backend | Feature | P1-High | 8 | 5. AI Integration |
| TICKET-011 | AI Transcription Frontend | Feature | P1-High | 8 | 5. AI Integration |
| TICKET-012 | Appointment Summary Generation | Feature | P2-Medium | 3 | 6. Enhancements |

**Total: 13 tickets | 76 story points | 6 sprints estimados (12 semanas)**

---

### Detalle de 3 Tickets Representativos

### **Ticket 1: Backend - Gestión de Pacientes**

**ID:** TICKET-004

**Título:** Patients Backend - API CRUD de Pacientes

**Tipo:** Feature | **Prioridad:** P0-Critical

**Referencia de Historia:** US-001 (Patient Registration), US-002 (Patient Listing & Search)

**Descripción:**
Implementar la API backend para la gestión de pacientes incluyendo operaciones CRUD, funcionalidad de búsqueda y recuperación del historial del paciente. Los pacientes están asociados al proveedor autenticado.

**Criterios de Aceptación:**
- [ ] Crear paciente con todos los campos requeridos
- [ ] Listar todos los pacientes del proveedor autenticado
- [ ] Buscar pacientes por nombre, teléfono o email
- [ ] Obtener un paciente por ID con detalles completos
- [ ] Actualizar información del paciente
- [ ] Eliminar paciente (eliminación en cascada de citas)
- [ ] Agregar/eliminar alergias del paciente
- [ ] Agregar/eliminar condiciones crónicas del paciente
- [ ] Obtener historial de citas del paciente
- [ ] Soporte de paginación para lista de pacientes

**Tareas Técnicas:**

1. **Patient Service (`src/services/patient.service.ts`)**
   - `create(providerId, data)` - Crear nuevo paciente
   - `findAll(providerId, options)` - Listar con búsqueda/paginación
   - `findById(id, providerId)` - Obtener paciente con relaciones
   - `update(id, providerId, data)` - Actualizar paciente
   - `delete(id, providerId)` - Eliminar paciente
   - `addAllergy(patientId, data)` - Agregar alergia
   - `removeAllergy(patientId, allergyId)` - Eliminar alergia
   - `getAppointments(patientId, providerId)` - Obtener historial de citas

2. **Patient Controller (`src/controllers/patient.controller.ts`)**
   - Handler para POST /patients
   - Handler para GET /patients
   - Handler para GET /patients/:id
   - Handler para PUT /patients/:id
   - Handler para DELETE /patients/:id
   - Handler para POST /patients/:id/allergies
   - Handler para DELETE /patients/:id/allergies/:allergyId

3. **Patient Validator (`src/validators/patient.validator.ts`)**
   - `createPatientSchema`: firstName, lastName, dateOfBirth, sex, phone (requeridos)
   - `updatePatientSchema`: Todos los campos opcionales
   - `allergySchema`: allergen, severity (requeridos), reaction (opcional)
   - `searchQuerySchema`: search, page, limit

**Endpoints:**
```
GET    /api/v1/patients
POST   /api/v1/patients
GET    /api/v1/patients/:id
PUT    /api/v1/patients/:id
DELETE /api/v1/patients/:id
GET    /api/v1/patients/:id/appointments
POST   /api/v1/patients/:id/allergies
DELETE /api/v1/patients/:id/allergies/:allergyId
```

**Archivos a Crear/Modificar:**
- `src/routes/patient.routes.ts`
- `src/controllers/patient.controller.ts`
- `src/services/patient.service.ts`
- `src/validators/patient.validator.ts`
- `tests/unit/services/patient.service.test.ts`
- `tests/integration/routes/patient.routes.test.ts`

**Estimación:** 5 story points

**Dependencias:** TICKET-001 (Database Schema), TICKET-002 (Auth Backend)

---

### **Ticket 2: Frontend - Transcripción con IA**

**ID:** TICKET-011

**Título:** AI Transcription Frontend - Grabación y Auto-llenado

**Tipo:** Feature | **Prioridad:** P1-High

**Referencia de Historia:** US-006 (AI Transcription Recording), US-007 (AI Auto-Fill Medical Record)

**Descripción:**
Implementar los componentes frontend para grabación de audio, visualización de transcripción en tiempo real e integración de auto-llenado con IA. Incluye controles de grabación, panel de transcripción en vivo, visualización de extracción de IA e integración con el formulario de registro médico.

**Criterios de Aceptación:**
- [ ] Botón de Iniciar/Detener grabación visible
- [ ] Solicitud de permiso de micrófono al iniciar
- [ ] Indicador visual (punto rojo pulsante) durante grabación
- [ ] Temporizador de duración de grabación (MM:SS)
- [ ] Transcripción aparece en tiempo real mientras se procesa el audio
- [ ] Indicadores de estado de extracción de IA
- [ ] Auto-población de campos del registro médico desde extracción
- [ ] Campos llenados por IA tienen indicador visual (badge púrpura)
- [ ] Puntuaciones de confianza mostradas para extracciones
- [ ] Botones Aceptar/Rechazar para sugerencias de IA
- [ ] Opciones de Aceptar Todo / Limpiar Todo
- [ ] Soporta grabaciones de hasta 60 minutos
- [ ] Manejo de errores para fallos de audio/API

**Tareas Técnicas:**

1. **TranscriptionPanel (`src/components/transcription/TranscriptionPanel.tsx`)**
   - Contenedor para todos los componentes de transcripción
   - Sección de controles de grabación
   - Sección de visualización de transcripción
   - Sección de estado de extracción de IA
   - Panel colapsable/expandible

2. **AudioRecorder (`src/components/transcription/AudioRecorder.tsx`)**
   - Botón Iniciar/Detener grabación
   - Integración con MediaRecorder API
   - Indicador de grabación (punto rojo pulsante)
   - Temporizador de grabación (MM:SS)

3. **useAudioRecorder Hook (`src/hooks/useAudioRecorder.ts`)**
   - `startRecording()` - Iniciar MediaRecorder
   - `stopRecording()` - Detener y retornar audio blob
   - `isRecording` - Estado de grabación
   - `duration` - Duración de grabación
   - `error` - Errores de permiso/grabación

4. **useTranscription Hook (`src/hooks/useTranscription.ts`)**
   - Gestión de conexión WebSocket
   - `startSession(appointmentId)` - Iniciar sesión
   - `sendAudioChunk(chunk)` - Enviar audio
   - `transcript` - Texto de transcripción actual
   - `extraction` - Campos extraídos
   - `status` - Estado de sesión

5. **Transcription Store (`src/store/transcription.store.ts`)**
   - `transcript` - Texto completo de transcripción
   - `extraction` - Campos extraídos
   - `pendingSuggestions` - Sugerencias sin aplicar
   - `acceptSuggestion(field, value)` - Aceptar sugerencia
   - `rejectSuggestion(field)` - Rechazar sugerencia

**Componentes:** TranscriptionPanel, AudioRecorder, TranscriptionDisplay, AIExtractionStatus, AISuggestionBadge, RecordingIndicator, RecordingTimer

**Archivos a Crear/Modificar:**
- `src/components/transcription/TranscriptionPanel.tsx`
- `src/components/transcription/AudioRecorder.tsx`
- `src/components/transcription/TranscriptionDisplay.tsx`
- `src/components/transcription/AIExtractionStatus.tsx`
- `src/hooks/useAudioRecorder.ts`
- `src/hooks/useTranscription.ts`
- `src/store/transcription.store.ts`
- `src/services/transcription.api.ts`

**Estimación:** 8 story points

**Dependencias:** TICKET-009 (Medical Records Frontend), TICKET-010 (Transcription Backend)

---

### **Ticket 3: Base de Datos - Esquema Completo**

**ID:** TICKET-001

**Título:** Database Schema Implementation - Prisma ORM

**Tipo:** Technical | **Prioridad:** P0-Critical

**Referencia de Historia:** US-011 (Data Persistence)

**Descripción:**
Implementar el esquema completo de base de datos usando Prisma ORM, incluyendo todas las entidades, relaciones, enums, índices y datos semilla para desarrollo y pruebas. Este esquema soporta toda la funcionalidad de registros médicos incluyendo pacientes, citas, registros médicos en formato SOAP, síntomas, recetas y datos de transcripción de IA.

**Criterios de Aceptación:**
- [ ] Las 9 entidades principales definidas en el esquema Prisma
- [ ] Todos los enums creados (Sex, AllergySeverity, AppointmentType, AppointmentStatus)
- [ ] Relaciones correctamente definidas con eliminación en cascada apropiada
- [ ] Índices creados para campos frecuentemente consultados
- [ ] Migración inicial generada y aplicada
- [ ] Script de seed crea datos de prueba realistas
- [ ] Base de datos conecta y queries funcionan correctamente

**Tareas Técnicas:**

1. **Definir Modelos Prisma**
   - **Provider**: id, email, passwordHash, firstName, lastName, specialty, licenseNumber, phone, timestamps
   - **Patient**: id, providerId, firstName, lastName, dateOfBirth, sex, phone, email, address, emergencyContact, timestamps
   - **Allergy**: id, patientId, allergen, severity, reaction, timestamps
   - **ChronicCondition**: id, patientId, condition, diagnosedDate, notes, timestamps
   - **Appointment**: id, patientId, providerId, appointmentDate, appointmentType, status, reason, timestamps
   - **MedicalRecord**: id, appointmentId, chiefComplaint, subjective, objective, assessment, plan, aiTranscript, timestamps
   - **Symptom**: id, medicalRecordId, name, severity, duration, notes, aiGenerated, timestamps
   - **Prescription**: id, medicalRecordId, medication, dosage, frequency, duration, instructions, aiGenerated, timestamps
   - **VitalSigns**: id, appointmentId, bloodPressure, heartRate, temperature, weight, height, timestamps

2. **Definir Enums**
   - `Sex`: male, female, other
   - `AllergySeverity`: mild, moderate, severe, life_threatening
   - `AppointmentType`: new_patient, follow_up, routine_checkup, sick_visit, telehealth
   - `AppointmentStatus`: scheduled, checked_in, in_progress, completed, cancelled, no_show

3. **Crear Índices de Optimización**
   - Patient: `@@index([lastName, firstName])`, `@@index([phone])`, `@@index([email])`
   - Appointment: `@@index([patientId])`, `@@index([providerId])`, `@@index([appointmentDate])`, `@@index([status])`
   - Symptom, Prescription: `@@index([medicalRecordId])`

4. **Configurar Relaciones y Cascadas**
   - Provider → Patient (1:N)
   - Patient → Allergy, ChronicCondition, Appointment (1:N, cascade delete)
   - Appointment → MedicalRecord, VitalSigns (1:1, cascade delete)
   - MedicalRecord → Symptom, Prescription (1:N, cascade delete)

5. **Crear Script de Seed (`prisma/seed.ts`)**
   - 1 Provider (Dr. Demo)
   - 5 Patients con demografía variada
   - 2-3 Alergias por paciente
   - 1-2 Condiciones crónicas por paciente
   - 3-5 Citas por paciente (varios estados)
   - Registros médicos para citas completadas
   - Síntomas y recetas de ejemplo

**Archivos a Crear:**
- `packages/backend/prisma/schema.prisma`
- `packages/backend/prisma/seed.ts`
- `packages/backend/prisma/migrations/[initial]/`

**Comandos de Verificación:**
```bash
pnpm db:migrate    # Ejecutar migraciones
pnpm db:seed       # Poblar datos de prueba
pnpm db:studio     # Verificar en Prisma Studio
```

**Estimación:** 3 story points

**Dependencias:** TICKET-000 (Project Setup)

---

## 7. Pull Requests

### **Pull Request 1: Sistema de Autenticación**

**Commit:** `4d8e5a1`

**Título:** feat: implement authentication system (TICKET-002, TICKET-003)

**Descripción:**
Sistema completo de autenticación JWT:

**Backend (TICKET-002):**
- Servicio de autenticación con login/registro
- Middleware de protección de rutas
- Generación y validación de tokens JWT
- Validación con Zod
- Hash de contraseñas con bcrypt

**Frontend (TICKET-003):**
- Página de login con formulario
- Store de autenticación con Zustand
- Componente ProtectedRoute
- Interceptor de Axios para tokens
- Persistencia de sesión en localStorage

**Archivos principales:**
```
packages/backend/
├── src/services/auth.service.ts
├── src/controllers/auth.controller.ts
├── src/routes/auth.routes.ts
├── src/middleware/auth.middleware.ts
├── src/validators/auth.validator.ts
└── src/utils/jwt.ts

packages/frontend/
├── src/pages/auth/LoginPage.tsx
├── src/services/auth.api.ts
├── src/store/auth.store.ts
└── src/components/auth/ProtectedRoute.tsx
```

**Testing:**
- Login con credenciales válidas funciona
- Rutas protegidas redirigen a login
- Token se almacena y envía correctamente

---

### **Pull Request 2: Gestión de Pacientes y Citas**

**Commit:** `e97e882`

**Título:** feat: implement patient and appointment management (TICKET-004 to TICKET-007)

**Descripción:**
Implementación completa de CRUD de pacientes y citas:

**Backend Pacientes (TICKET-004):**
- CRUD completo de pacientes
- Búsqueda por nombre, email, teléfono
- Paginación de resultados
- Gestión de alergias y condiciones crónicas

**Frontend Pacientes (TICKET-005):**
- Lista de pacientes con búsqueda
- Formulario de nuevo paciente
- Página de detalle con historial
- Edición de paciente

**Backend Citas (TICKET-006):**
- CRUD completo de citas
- Cambio de estados
- Vinculación con pacientes

**Frontend Citas (TICKET-007):**
- Lista de citas del día
- Formulario de nueva cita
- Detalle de cita
- Navegación a registro médico

**Archivos principales:**
```
packages/backend/
├── src/services/patient.service.ts
├── src/services/appointment.service.ts
├── src/controllers/patient.controller.ts
├── src/controllers/appointment.controller.ts
├── src/routes/patient.routes.ts
├── src/routes/appointment.routes.ts

packages/frontend/
├── src/pages/patients/
│   ├── PatientsListPage.tsx
│   ├── PatientDetailPage.tsx
│   ├── NewPatientPage.tsx
│   └── EditPatientPage.tsx
├── src/pages/appointments/
│   ├── AppointmentsListPage.tsx
│   ├── AppointmentDetailPage.tsx
│   └── NewAppointmentPage.tsx
├── src/hooks/usePatients.ts
├── src/hooks/useAppointments.ts
```

**Testing:**
- CRUD de pacientes funcional
- Búsqueda de pacientes opera correctamente
- Citas se crean y muestran correctamente

---

### **Pull Request 3: Transcripción con IA y Registros Médicos**

**Commit:** `61cc3b0`

**Título:** feat: implement AI transcription and medical record management (TICKET-010, TICKET-011)

**Descripción:**
Funcionalidad principal de transcripción con IA:

**Backend (TICKET-010):**
- Integración con OpenAI Whisper para transcripción
- Integración con GPT-4 para extracción de campos
- WebSocket para comunicación en tiempo real
- Servicio de transcripción con manejo de audio
- Extracción estructurada de síntomas, diagnóstico y recetas

**Frontend (TICKET-011):**
- Panel de transcripción con grabación de audio
- Visualización de transcripción en tiempo real
- Componentes de registro médico (SOAP)
- Auto-llenado de campos con sugerencias de IA
- Indicadores visuales para campos generados por IA

**Archivos principales:**
```
packages/backend/
├── src/services/ai/
│   ├── whisper.service.ts
│   └── gpt.service.ts
├── src/services/transcription.service.ts
├── src/services/medical-record.service.ts
├── src/routes/transcription.routes.ts
├── src/websocket/transcription.handler.ts

packages/frontend/
├── src/components/transcription/
│   ├── TranscriptionPanel.tsx
│   ├── AudioRecorder.tsx
│   ├── TranscriptionDisplay.tsx
│   └── AIExtractionStatus.tsx
├── src/components/medical-record/
│   ├── SymptomsSection.tsx
│   ├── DiagnosisSection.tsx
│   └── PrescriptionsSection.tsx
├── src/pages/appointments/MedicalRecordPage.tsx
├── src/hooks/useTranscription.ts
├── src/hooks/useAudioRecorder.ts
```

**Consideraciones técnicas:**
- Audio se procesa en chunks para streaming
- GPT-4 extrae campos en formato JSON estructurado
- WebSocket mantiene conexión para actualizaciones en tiempo real
- Campos AI tienen indicador visual distintivo (badge púrpura)

**Testing:**
- Transcripción de audio funciona con API key válida
- Extracción de campos produce resultados correctos
- UI se actualiza en tiempo real
- Formulario permite edición manual de sugerencias

---

*Documentación generada para el proyecto MedRecord AI MVP - AI4Devs*
