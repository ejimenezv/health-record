# Sección 1: Descripción General del Producto

> Este documento contiene el contenido para la Sección 1 de la plantilla de trabajo del proyecto final AI4Devs.

---

## 1. Descripción General del Producto

### 1.1. Objetivo

**MedRecord AI** es un sistema de gestión de expedientes médicos diseñado para médicos generales y consultorios pequeños. El producto resuelve uno de los mayores desafíos que enfrentan los profesionales de la salud hoy en día: la carga administrativa de la documentación clínica.

#### El Problema

Los médicos dedican en promedio **2 horas diarias** a documentación por cada hora de atención directa al paciente. Esta carga administrativa:

- Reduce el tiempo de interacción con pacientes
- Contribuye al agotamiento profesional (burnout)
- Genera retrasos en la documentación de expedientes
- Aumenta el riesgo de errores por transcripción manual
- Afecta la calidad de atención cuando detalles importantes se olvidan o registran imprecisamente

#### La Solución

MedRecord AI utiliza inteligencia artificial para transformar las conversaciones médico-paciente en expedientes clínicos estructurados automáticamente. El sistema:

1. **Graba** la consulta médica (audio)
2. **Transcribe** la conversación usando IA (speech-to-text)
3. **Extrae** información estructurada (síntomas, diagnósticos, prescripciones)
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

### 1.2. Características y Funcionalidades Principales

#### Funcionalidades Core (MVP)

##### 1. Gestión de Pacientes

Sistema completo para administrar la información de pacientes:

- **Crear perfiles de pacientes**: Registro de nuevos pacientes con datos demográficos esenciales (nombre, fecha de nacimiento, sexo, contacto, contacto de emergencia)
- **Editar información**: Actualización de datos cuando cambian
- **Buscar pacientes**: Búsqueda rápida por nombre, teléfono o correo electrónico
- **Ver historial**: Acceso al perfil completo con historial de citas

##### 2. Gestión de Citas

Control completo del ciclo de vida de las citas médicas:

- **Crear citas**: Vinculadas a pacientes existentes con fecha, hora, tipo y motivo
- **Tipos de cita**: Paciente nuevo, seguimiento, revisión rutinaria, consulta por enfermedad, telemedicina
- **Estados de cita**: Programada, en espera, en progreso, completada, cancelada, no asistió
- **Historial cronológico**: Visualización de todas las citas de un paciente ordenadas por fecha

##### 3. Documentación Clínica (Formato SOAP)

Registro estructurado de cada consulta médica:

- **Subjetivo (S)**: Queja principal, historia de enfermedad actual, medicamentos actuales, alergias mencionadas
- **Objetivo (O)**: Notas del examen físico, signos vitales
- **Evaluación (A)**: Diagnóstico (texto libre, sin requerir códigos ICD-10), notas adicionales
- **Plan (P)**: Plan de tratamiento, instrucciones de seguimiento, educación al paciente

##### 4. Registro de Síntomas

Documentación detallada de síntomas por consulta:

- Múltiples síntomas por cita
- Campos: nombre del síntoma, ubicación corporal, severidad (1-10), duración, notas adicionales

##### 5. Gestión de Prescripciones

Control completo de medicamentos prescritos:

- Múltiples prescripciones por cita
- Campos: nombre del medicamento, concentración, dosis, frecuencia, duración, cantidad, indicaciones
- Estado de prescripción: activa, completada, discontinuada

##### 6. Transcripción con IA

Funcionalidad central del producto:

- **Grabación de audio**: Captura de audio desde el navegador durante la consulta (hasta 60 minutos)
- **Transcripción automática**: Conversión de voz a texto usando OpenAI Whisper
- **Extracción inteligente**: Identificación automática de campos médicos usando GPT-4 o Claude
- **Auto-llenado de formularios**: Población automática de campos del expediente con los datos extraídos
- **Indicadores de confianza**: Señalización visual de extracciones con diferente nivel de certeza

##### 7. Interfaz de Revisión Humana

Garantía de precisión y seguridad:

- **Vista lado a lado**: Transcripción junto al formulario de expediente
- **Campos editables**: Todos los campos pueden ser modificados independientemente de su origen
- **Trazabilidad**: Identificación clara de qué campos fueron llenados por IA vs. manualmente
- **Confirmación explícita**: Nada se guarda sin revisión y confirmación del médico

#### Funcionalidades Adicionales (Deseables)

##### 8. Signos Vitales

Registro de mediciones básicas de salud:

- Presión arterial (sistólica/diastólica)
- Frecuencia cardíaca
- Temperatura corporal
- Frecuencia respiratoria
- Saturación de oxígeno
- Peso y altura
- Nivel de dolor (escala 0-10)

---

### 1.3. Diseño y Experiencia de Usuario

La aplicación está diseñada siguiendo principios de usabilidad médica, priorizando la eficiencia del flujo de trabajo y la reducción de carga cognitiva durante las consultas.

#### Experiencia de Usuario Principal

La interfaz guía al médico a través de un flujo natural que refleja el proceso real de una consulta:

1. **Inicio de Sesión**: Pantalla simple con formulario centrado y autenticación segura
2. **Dashboard**: Vista general con estadísticas clave, accesos rápidos y pacientes recientes
3. **Gestión de Pacientes**: Lista con búsqueda en tiempo real y tarjetas interactivas
4. **Cita Médica**: Pantalla dividida con formulario SOAP a la izquierda y panel de transcripción a la derecha

#### Características de UX Destacadas

##### Transcripción en Tiempo Real
- Panel lateral que muestra la transcripción mientras el médico habla
- Indicador visual de grabación con animación pulsante
- Visualización de ondas de audio durante la grabación
- Cursor parpadeante al final del texto para indicar actividad

##### Auto-llenado con IA
- Los campos se rellenan automáticamente con la información extraída
- Indicador visual púrpura (badge con icono ✨) para campos sugeridos por IA
- Animación de resaltado cuando un campo es actualizado
- Posibilidad de aceptar o editar cada sugerencia individualmente

##### Guardado Automático
- Los cambios se guardan automáticamente cada 30 segundos
- Indicador de estado "Guardando..." / "Guardado" en el encabezado
- Sin pérdida de datos en caso de cierre accidental

##### Diseño Responsivo
- **Desktop (>1024px)**: Layout completo con sidebar expandido y paneles lado a lado
- **Tablet (768-1024px)**: Sidebar colapsable, panel de transcripción deslizable
- **Móvil (<768px)**: Navegación por menú hamburguesa, transcripción como overlay

#### Paleta de Colores

| Color | Uso | Código |
|-------|-----|--------|
| **Azul primario** | Acciones principales, enlaces | `#3b82f6` |
| **Verde** | Confirmaciones, éxito | `#10b981` |
| **Púrpura** | Indicadores de IA | `#8b5cf6` |
| **Rojo** | Errores, eliminación | `#ef4444` |
| **Grises neutros** | Texto, fondos, bordes | `#374151` - `#f9fafb` |

#### Sistema de Notificaciones

- **Toasts**: Notificaciones en esquina superior derecha para feedback de acciones
- **Alertas inline**: Mensajes contextuales dentro de formularios
- **Estados vacíos**: Ilustraciones y CTAs cuando no hay datos

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

#### Pantallas Principales

| Pantalla | Descripción |
|----------|-------------|
| **Login** | Autenticación con formulario centrado |
| **Dashboard** | Vista inicial con métricas, accesos rápidos y pacientes recientes |
| **Lista de Pacientes** | Grid de tarjetas con búsqueda y filtros |
| **Detalle de Paciente** | Información completa, alergias, condiciones e historial de citas |
| **Formulario de Paciente** | Crear o editar con validación en tiempo real |
| **Consulta Médica** | Interfaz dividida: formulario SOAP + transcripción |

#### Indicadores Visuales

- **Estado de grabación**: Botón rojo pulsante con animación durante grabación activa
- **Campos IA**: Badge púrpura [AI ✓] junto a campos auto-llenados
- **Estados de carga**: Skeletons animados para contenido, spinners para acciones
- **Validación**: Bordes rojos y mensajes de error debajo de campos inválidos
- **Estados de cita**: Badges con colores semánticos (azul=programada, verde=completada, etc.)

#### Accesibilidad

- Contraste de colores WCAG 2.1 nivel AA
- Navegación completa por teclado
- Etiquetas ARIA para lectores de pantalla
- Soporte para preferencia de movimiento reducido
- Focus visible en todos los elementos interactivos

#### Consideraciones de Diseño

- **Desktop-first**: Optimizado para uso en computadoras de escritorio
- **Responsive**: Totalmente funcional en tablets y dispositivos móviles
- **Navegadores modernos**: Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- **Sin instalación**: Aplicación web progresiva accesible desde cualquier navegador

> **Nota**: Las capturas de pantalla y videotutorial serán agregados después de la implementación del frontend. Para especificaciones detalladas de UI/UX, consultar la documentación en `docs/ui-ux/`.

---

### 1.4. Instrucciones de Instalación

> **Nota**: Estas son instrucciones preliminares que serán completadas y verificadas después de la implementación.

#### Requisitos Previos

| Requisito | Versión |
|-----------|---------|
| Node.js | 20.x LTS |
| npm o pnpm | 9.x / 8.x |
| PostgreSQL | 15.x |
| Navegador moderno | Chrome/Firefox/Safari/Edge |

#### Claves de API Requeridas

| Servicio | Variable de Entorno | Obtención |
|----------|---------------------|-----------|
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Base de datos | `DATABASE_URL` | Proveedor de hosting |

#### Pasos de Instalación

##### 1. Clonar el repositorio

```bash
git clone https://github.com/[usuario]/medrecord-ai.git
cd medrecord-ai
```

##### 2. Instalar dependencias

```bash
npm install
# o
pnpm install
```

##### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/medrecord"

# OpenAI
OPENAI_API_KEY="sk-..."

# Autenticación
NEXTAUTH_SECRET="cadena-secreta-aleatoria"
NEXTAUTH_URL="http://localhost:3000"
```

##### 4. Configurar base de datos

```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Cargar datos de prueba
npx prisma db seed
```

##### 5. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

#### Opciones de Base de Datos

##### Opción A: PostgreSQL Local

```bash
# macOS con Homebrew
brew install postgresql@15
brew services start postgresql@15
createdb medrecord
```

##### Opción B: Docker

```bash
docker run --name medrecord-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=medrecord \
  -p 5432:5432 \
  -d postgres:15
```

##### Opción C: Base de Datos en la Nube (Recomendado)

| Proveedor | Tier Gratuito |
|-----------|---------------|
| Neon | 0.5 GB |
| Supabase | 500 MB |
| Railway | $5 crédito |
| Vercel Postgres | 256 MB |

#### Despliegue en Producción

```bash
# Con Vercel
npm i -g vercel
vercel

# Variables de entorno a configurar en Vercel:
# - DATABASE_URL
# - OPENAI_API_KEY
# - NEXTAUTH_SECRET
```

#### Verificación de Instalación

1. Acceder a `http://localhost:3000`
2. Crear cuenta de prueba
3. Crear paciente de prueba
4. Crear cita y probar grabación de audio
5. Verificar transcripción y extracción de IA

---

*Este documento será actualizado con instrucciones finales y capturas de pantalla después de completar la implementación.*
