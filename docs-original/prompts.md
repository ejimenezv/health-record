# Prompts Utilizados - MedRecord AI

Este documento registra los prompts más relevantes utilizados durante el desarrollo del proyecto con asistentes de IA.

---

## 1. Definición del Producto

### Prompt 1.1: Investigación de campos médicos
```
Investiga los campos estándar utilizados en sistemas de registros médicos electrónicos (EMR/EHR).
Enfócate en:
- Información del paciente
- Formato de notas SOAP
- Campos de recetas
- Documentación de síntomas y diagnósticos

Identifica los campos MÍNIMOS necesarios para un MVP funcional.
```

**Resultado:** Se identificaron campos esenciales para el modelo de datos, priorizando simplicidad sobre completitud. Se adoptó el formato SOAP (Subjetivo, Objetivo, Evaluación, Plan) como estructura estándar para registros médicos.

### Prompt 1.2: Definición de features
```
Define las características principales para un sistema de historial médico con:
- Gestión de pacientes
- Gestión de citas
- Registro médico por cita
- Transcripción con IA de la consulta
- Auto-llenado de campos en tiempo real

Separa en Must-Have y Should-Have para MVP.
```

**Ajuste humano:** Se simplificaron algunos campos y se priorizó la experiencia de transcripción sobre otras features como reportes o estadísticas.

---

## 2. Arquitectura

### Prompt 2.1: Diseño de arquitectura
```
Diseña la arquitectura para una aplicación web con:
- Frontend React + TypeScript
- Backend Node.js + Express
- Base de datos PostgreSQL
- Integración con OpenAI (Whisper y GPT-4)
- Comunicación en tiempo real para transcripción

Requisitos:
- Arquitectura simple para MVP
- Despliegue en servidor Ubuntu único
- Costo de infraestructura < $30/mes

Incluye diagrama y justificación de decisiones.
```

**Resultado:** Arquitectura monolítica en capas con WebSockets para tiempo real. Se descartó microservicios por complejidad innecesaria para MVP.

### Prompt 2.2: Estructura de monorepo
```
Configura un monorepo con pnpm workspaces para:
- packages/backend: Express + TypeScript + Prisma
- packages/frontend: React + Vite + TypeScript

Incluye:
- Scripts compartidos en raíz
- Configuración de TypeScript base
- ESLint y Prettier compartidos
- Docker Compose para desarrollo
```

**Resultado:** Estructura de monorepo funcional con scripts que permiten ejecutar ambos proyectos simultáneamente.

---

## 3. Modelo de Datos

### Prompt 3.1: Diseño del schema
```
Crea un schema de Prisma para PostgreSQL con las siguientes entidades:
- Provider (médico/usuario)
- Patient
- Appointment
- MedicalRecord (formato SOAP)
- Symptom, Prescription
- Allergy, ChronicCondition
- VitalSigns

Requisitos:
- Relaciones correctas (1:N, 1:1)
- Índices para queries comunes
- Campos para marcar datos generados por IA
- Soft delete donde sea apropiado
```

**Ajuste humano:** Se añadió campo `aiGenerated` a entidades relevantes (Symptom, Prescription, MedicalRecord) para diferenciar datos sugeridos por IA vs entrada manual.

---

## 4. API

### Prompt 4.1: Especificación de endpoints
```
Genera la especificación de endpoints REST para:
- Autenticación (login, register, me)
- CRUD de pacientes con búsqueda
- CRUD de citas con cambio de estado
- Gestión de registros médicos
- Endpoints de transcripción (start, audio chunk, stop, extract)

Para cada endpoint incluye:
- Método HTTP y path
- Request body con tipos
- Response con tipos
- Códigos de error posibles
```

**Resultado:** 33 endpoints documentados con schemas de request/response.

### Prompt 4.2: Implementación de controladores
```
Implementa el controlador de pacientes en Express con TypeScript:
- CRUD completo
- Búsqueda por nombre, email, teléfono
- Paginación con limit/offset
- Validación con Zod
- Manejo de errores consistente

Sigue el patrón: Route -> Controller -> Service -> Prisma
```

---

## 5. Frontend

### Prompt 5.1: Diseño de componentes
```
Define los componentes React necesarios para:
- Sistema de diseño con Tailwind + shadcn/ui
- Página de cita con formulario médico SOAP
- Panel de transcripción con grabación de audio
- Indicadores visuales para sugerencias de IA

Incluye:
- Props e interfaces TypeScript
- Estados del componente
- Hooks personalizados necesarios
```

**Ajuste humano:** Se simplificó el diseño de algunos componentes y se añadió mejor feedback visual para estados de carga y errores.

### Prompt 5.2: Implementación de grabación de audio
```
Implementa un hook useAudioRecorder en React que:
- Use MediaRecorder API del navegador
- Capture audio del micrófono
- Genere blobs de audio en formato webm
- Maneje estados: idle, recording, paused
- Proporcione duración de grabación
- Maneje permisos y errores del navegador
```

---

## 6. Integración con IA

### Prompt 6.1: Servicio de transcripción Whisper
```
Implementa un servicio de transcripción usando OpenAI Whisper API:
- Acepta audio en formato webm/mp3
- Usa el modelo whisper-1
- Incluye prompt de contexto médico en español
- Retorna texto transcrito
- Maneja archivos temporales de forma segura
- Incluye manejo de errores robusto
```

### Prompt 6.2: Extracción con GPT-4
```
Crea un servicio que use GPT-4 para extraer de una transcripción médica:
- Síntomas (descripción, ubicación, severidad, duración)
- Diagnóstico (descripción, notas)
- Recetas (medicamento, dosis, frecuencia, duración, indicaciones)

Requisitos:
- Usa JSON mode para respuesta estructurada
- Valida el JSON de respuesta
- Retorna null para campos no mencionados
- Incluye campo de confianza cuando sea posible
```

**System prompt utilizado:**
```
Eres un asistente médico especializado en extraer información estructurada
de transcripciones de consultas médicas en español. Tu tarea es identificar
y extraer síntomas, diagnósticos y prescripciones mencionados en la conversación.

Responde ÚNICAMENTE con un objeto JSON válido siguiendo el schema proporcionado.
Si algún campo no se menciona en la transcripción, omítelo del JSON.
No inventes información que no esté explícitamente mencionada.
```

**Ajuste humano:** Se refinó el prompt de sistema múltiples veces para mejorar la precisión de extracción y reducir hallucinations.

---

## 7. Testing

### Prompt 7.1: Configuración de tests
```
Configura Vitest para testing en el monorepo:
- Tests unitarios para backend services
- Tests de integración para API endpoints
- Tests de componentes React con Testing Library
- Mocking de Prisma y OpenAI
- Coverage reporting
```

### Prompt 7.2: Tests de servicio
```
Escribe tests unitarios para AuthService:
- Test de login exitoso
- Test de login con credenciales inválidas
- Test de registro de nuevo usuario
- Test de registro con email duplicado
- Test de verificación de token

Usa Vitest y mocks para Prisma.
```

---

## 8. Despliegue

### Prompt 8.1: Dockerfiles
```
Crea Dockerfiles optimizados para:
1. Backend Node.js:
   - Multi-stage build
   - Node 20 Alpine
   - Solo dependencias de producción
   - Health check incluido

2. Frontend React:
   - Build con Vite
   - Servir con Nginx
   - Configuración de SPA (history fallback)
```

### Prompt 8.2: Docker Compose producción
```
Crea docker-compose.prod.yml con:
- Servicio PostgreSQL con volumen persistente
- Servicio backend con variables de entorno
- Servicio frontend con Nginx
- Red interna entre servicios
- Health checks
- Restart policies
```

---

## Herramientas de IA Utilizadas

| Herramienta | Uso |
|-------------|-----|
| **Claude Code (Anthropic)** | Desarrollo principal, generación de código, debugging, documentación |
| **OpenAI Whisper API** | Transcripción de audio en producción |
| **OpenAI GPT-4** | Extracción de campos médicos en producción |

---

## Métricas de Uso de IA

| Fase | Prompts Principales | Iteraciones |
|------|---------------------|-------------|
| Planificación | 5 | 2-3 por prompt |
| Arquitectura | 4 | 1-2 por prompt |
| Modelo de datos | 3 | 3-4 refinamientos |
| Backend | 15 | Variable |
| Frontend | 20 | Variable |
| Testing | 5 | 2-3 por prompt |
| Despliegue | 4 | 1-2 por prompt |
| Documentación | 8 | 1-2 por prompt |

---

## Conclusiones

### Beneficios del uso de IA
- **Velocidad de desarrollo**: Generación rápida de boilerplate y estructuras
- **Consistencia**: Patrones aplicados uniformemente en el código
- **Documentación**: Generación de documentación técnica completa
- **Debugging**: Identificación rápida de problemas y soluciones

### Áreas donde la revisión humana fue crucial
- **Coherencia arquitectónica**: Asegurar que las piezas encajen correctamente
- **Seguridad**: Validar que no se introduzcan vulnerabilidades
- **Edge cases**: Manejar casos límite no considerados inicialmente
- **UX**: Ajustar interacciones y feedback al usuario
- **Prompts de IA**: Refinar prompts para extracción médica precisa

### Lecciones aprendidas
1. Los prompts iniciales rara vez son perfectos - iterar es normal
2. Dividir tareas grandes en subtareas específicas produce mejores resultados
3. Incluir contexto y restricciones mejora la calidad del output
4. La revisión humana sigue siendo esencial para código de calidad
5. Documentar los prompts facilita reproducibilidad y aprendizaje

---

*Documentación generada para el proyecto MedRecord AI MVP - AI4Devs*
