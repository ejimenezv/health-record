# Prompt 00: Contexto del Proyecto - Medical Record System

## Instrucciones para Claude Code

Este archivo establece el contexto base del proyecto que será referenciado por todos los prompts posteriores. **NO EJECUTAR ESTE PROMPT** - es solo documentación de referencia.

---

## Descripción del Proyecto

**Nombre**: MedRecord AI - Sistema de Historias Clínicas con IA

**Objetivo**: Desarrollar un sistema de gestión de historias clínicas para médicos que permita:
1. Gestionar el historial médico de pacientes
2. Registrar citas médicas con síntomas, diagnósticos y recetas
3. Transcribir citas en tiempo real usando IA
4. Auto-completar campos del registro médico basándose en la transcripción

**Contexto Académico**: Proyecto final del curso AI4Devs - debe documentarse extensivamente el uso de IA en el desarrollo.

---

## Flujo E2E Principal

```
Registro/Login → Dashboard Médico → Seleccionar/Crear Paciente →
Nueva Cita → Iniciar Grabación IA → Transcripción en Tiempo Real →
Auto-llenado de Campos → Guardar Registro → Ver Historial
```

---

## Estructura de Documentación

Todos los prompts generarán documentación en la carpeta `/docs/`:

```
/docs/
  /01-producto/           # Descripción del producto
  /02-arquitectura/       # Arquitectura del sistema
  /03-modelo-datos/       # Modelo de datos
  /04-api/                # Especificación de la API
  /05-historias-usuario/  # User stories
  /06-tickets/            # Tickets de trabajo
  /07-frontend/           # Especificaciones frontend
  /08-testing/            # Estrategia de testing
  /09-deployment/         # Instrucciones de despliegue
  /10-ia-prompts/         # Registro de prompts de IA usados
```

---

## Convenciones

- **Idioma de documentación**: Español
- **Idioma de código**: Inglés
- **Formato de commits**: Conventional Commits en español
- **Branches**: `feature/`, `fix/`, `docs/`

---

## Archivos de Estado

Cada prompt actualizará el archivo `/docs/ESTADO_PROYECTO.md` con:
- Último prompt ejecutado
- Tareas completadas
- Siguiente paso recomendado
- Archivos generados/modificados

Este archivo permite a cada sesión de Claude Code entender el estado actual del proyecto.
