# MedRecord AI - Sistema de Historial Médico con IA

Sistema de gestión de historiales médicos con transcripción de citas mediante IA para médicos.

## Características Principales

- **Gestión de Pacientes**: CRUD completo de pacientes con historial médico
- **Gestión de Citas**: Programación y seguimiento de citas médicas
- **Registros Médicos**: Documentación de síntomas, diagnósticos y recetas (formato SOAP)
- **Transcripción con IA**: Grabación y transcripción automática de consultas (hasta 60 min)
- **Auto-llenado Inteligente**: Extracción automática de campos médicos desde la transcripción
- **Tiempo Real**: Actualización en tiempo real durante la consulta

## Stack Tecnológico

### Backend
- Node.js 20 + Express + TypeScript
- Prisma ORM + PostgreSQL
- Socket.io para comunicación en tiempo real
- OpenAI Whisper (transcripción) + GPT-4 (extracción)

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Query + Zustand
- Socket.io-client

### Infraestructura
- Docker + Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)

## Instalación Local

### Requisitos
- Node.js 20+
- pnpm 9+
- Docker Desktop
- OpenAI API Key

### Pasos

1. **Clonar repositorio**
```bash
git clone https://github.com/YOUR_USERNAME/health-record.git
cd health-record
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
# Editar archivos con tus valores (especialmente OPENAI_API_KEY)
```

3. **Instalar dependencias**
```bash
pnpm install
```

4. **Iniciar base de datos**
```bash
docker-compose -f docker/docker-compose.yml up -d
```

5. **Ejecutar migraciones y seed**
```bash
pnpm db:migrate
pnpm db:seed
```

6. **Iniciar aplicación**
```bash
pnpm dev
```

7. **Acceder**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Credenciales de prueba: `doctor@medrecord.com` / `password123`

## Scripts Disponibles

```bash
pnpm dev              # Inicia frontend y backend en modo desarrollo
pnpm dev:backend      # Solo backend
pnpm dev:frontend     # Solo frontend
pnpm build            # Compila ambos proyectos
pnpm test             # Ejecuta todos los tests
pnpm lint             # Ejecuta linter
pnpm lint:fix         # Corrige errores de linter
pnpm format           # Formatea código con Prettier
pnpm type-check       # Verificación de tipos TypeScript
pnpm db:migrate       # Ejecuta migraciones de Prisma
pnpm db:seed          # Llena la base de datos con datos de prueba
pnpm db:studio        # Abre Prisma Studio
pnpm db:generate      # Genera cliente Prisma
```

## Estructura del Proyecto

```
health-record/
├── packages/
│   ├── backend/              # API Node.js + Express
│   │   ├── src/
│   │   │   ├── controllers/  # Controladores de endpoints
│   │   │   ├── services/     # Lógica de negocio
│   │   │   │   └── ai/       # Servicios de IA (Whisper, GPT)
│   │   │   ├── routes/       # Definición de rutas
│   │   │   ├── middleware/   # Auth, validación, errores
│   │   │   ├── validators/   # Schemas Zod
│   │   │   ├── websocket/    # WebSocket handlers
│   │   │   ├── config/       # Configuración
│   │   │   ├── types/        # TypeScript types
│   │   │   └── utils/        # Utilidades (JWT)
│   │   ├── prisma/
│   │   │   ├── schema.prisma # Esquema de BD
│   │   │   └── seed.ts       # Datos de prueba
│   │   └── tests/
│   │
│   └── frontend/             # App React + Vite
│       ├── src/
│       │   ├── components/
│       │   │   ├── appointments/   # Componentes de citas
│       │   │   ├── auth/           # Autenticación
│       │   │   ├── layout/         # Layout principal
│       │   │   ├── medical-record/ # Registros médicos
│       │   │   ├── transcription/  # Panel de transcripción
│       │   │   └── ui/             # Componentes UI (shadcn)
│       │   ├── pages/
│       │   │   ├── appointments/   # Páginas de citas
│       │   │   ├── auth/           # Login
│       │   │   ├── dashboard/      # Dashboard
│       │   │   └── patients/       # Páginas de pacientes
│       │   ├── hooks/          # Custom hooks
│       │   ├── services/       # API clients
│       │   ├── store/          # Zustand stores
│       │   ├── types/          # TypeScript types
│       │   └── router/         # React Router config
│       └── tests/
│
├── docker/                   # Configuración Docker
│   ├── docker-compose.yml    # Desarrollo
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
│
├── docs/                     # Documentación
│   ├── product/              # Definición del producto
│   ├── architecture/         # Arquitectura del sistema
│   ├── data-model/           # Modelo de datos
│   ├── api/                  # Documentación API
│   ├── frontend/             # Especificaciones frontend
│   ├── testing/              # Estrategia de tests
│   ├── tickets/              # Tickets de implementación
│   ├── deployment/           # Guía de despliegue
│   └── deliverables/         # Entregables finales
│
├── prompts/                  # Prompts de desarrollo
└── scripts/                  # Scripts de utilidad
```

## API Documentation

La API sigue el estándar RESTful. Documentación completa en `docs/api/`.

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Iniciar sesión |
| POST | /api/v1/auth/register | Registrar usuario |
| GET | /api/v1/auth/me | Obtener usuario actual |
| GET | /api/v1/patients | Listar pacientes |
| POST | /api/v1/patients | Crear paciente |
| GET | /api/v1/patients/:id | Obtener paciente con historial |
| PUT | /api/v1/patients/:id | Actualizar paciente |
| GET | /api/v1/appointments | Listar citas |
| POST | /api/v1/appointments | Crear cita |
| GET | /api/v1/appointments/:id | Obtener cita con registro médico |
| POST | /api/v1/transcription/:appointmentId/start | Iniciar transcripción |
| POST | /api/v1/transcription/:appointmentId/audio | Enviar chunk de audio |
| POST | /api/v1/transcription/:appointmentId/extract | Extraer campos con IA |

## Variables de Entorno

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/healthrecord"
JWT_SECRET="your-secret-key"
OPENAI_API_KEY="sk-..."
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001
```

## Despliegue

Ver `docs/deployment/deployment-guide.md` para instrucciones de despliegue en Ubuntu con Docker.

### Resumen de Despliegue
1. Servidor Ubuntu 22.04 con Docker instalado
2. Clonar repositorio y configurar variables de entorno
3. Ejecutar `docker-compose -f docker/docker-compose.prod.yml up -d`
4. Configurar Nginx como reverse proxy con SSL

## Notas Importantes

> **Aviso**: Este MVP es para demostración y propósitos educativos.
> NO es compatible con HIPAA y NO debe usarse con datos reales de pacientes.
> Para uso en producción con PHI, se requieren medidas de seguridad adicionales.

## Licencia

MIT

## Autor

Eduardo Jiménez Vázquez - AI4Devs Final Project
