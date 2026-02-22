# 5. Historias de Usuario

Este documento presenta las 3 historias de usuario principales que representan el núcleo funcional de MedRecord AI: un sistema de registro médico con asistencia de IA.

---

## Historia de Usuario 1: Ver Historial Médico del Paciente

**Como** médico
**Quiero** ver el historial completo de citas de un paciente
**Para** tener contexto de su historia médica antes de la consulta actual

### Descripción

Cuando el médico revisa el perfil de un paciente o se prepara para una consulta, necesita ver todas las citas pasadas en orden cronológico. Cada cita debe mostrar un resumen que incluya fecha, tipo, motivo, diagnóstico e información clave. El médico debe poder navegar a cualquier cita pasada para ver los detalles completos.

Esta funcionalidad es esencial para la continuidad del cuidado médico, permitiendo al médico revisar rápidamente visitas anteriores, diagnósticos y tratamientos antes o durante una consulta.

### Criterios de Aceptación

- [ ] Dado que estoy en la página de perfil de un paciente, cuando la página carga, entonces veo una lista cronológica de todas las citas pasadas (más recientes primero)
- [ ] Dado que un paciente tiene citas, cuando veo el historial, entonces cada cita muestra: fecha, tipo, motivo de visita, estado y resumen del diagnóstico
- [ ] Dado que hago clic en una cita pasada, cuando hago clic, entonces navego a la vista completa del registro médico
- [ ] Dado que estoy viendo un registro médico, cuando quiero ver otras citas, entonces puedo usar los botones de navegación Anterior/Siguiente
- [ ] Dado que un paciente no tiene citas, cuando veo el perfil, entonces veo un estado vacío con opción de crear la primera cita
- [ ] Dado que estoy viendo el historial de citas, cuando veo la lista, entonces puedo ver un breve resumen del motivo principal de consulta para cada visita
- [ ] Dado que estoy en la página de detalle de una cita, cuando quiero regresar, entonces puedo navegar de vuelta al perfil del paciente
- [ ] Dado que existen múltiples citas, cuando veo la lista, entonces las citas completadas muestran su diagnóstico y cantidad de recetas

### Notas Técnicas

- Las citas deben obtenerse con paginación (10 por página)
- Incluir datos de resumen en la consulta de lista para evitar consultas N+1
- Considerar caché para citas recientes para mejorar rendimiento
- El historial médico debe ser de solo lectura a menos que se edite un registro específico
- Usar JOINs para obtener conteo de recetas eficientemente

### Prioridad

**Must-Have (P0)**

### Puntos de Historia

**5 puntos**

---

## Historia de Usuario 2: Entrada Manual de Registro Médico

**Como** médico
**Quiero** ingresar manualmente síntomas, diagnóstico y recetas para una cita
**Para** documentar la visita incluso cuando no uso transcripción con IA

### Descripción

El médico necesita documentar encuentros clínicos usando un formato estructurado. Esto incluye registrar síntomas del paciente (con detalles como severidad y duración), ingresar un diagnóstico y agregar recetas. Todos los campos deben ser editables hasta que el registro se finalice. Esta funcionalidad sirve tanto como el flujo de trabajo manual principal como la interfaz de edición para contenido generado por IA.

Esta es la funcionalidad central de documentación y el formulario más complejo de la aplicación. Debe ser lo suficientemente flexible para manejar tanto la entrada manual como los flujos de trabajo asistidos por IA.

### Criterios de Aceptación

- [ ] Dado que estoy en la página de registro médico de una cita, cuando veo el formulario, entonces veo secciones para: Motivo Principal, Síntomas, Diagnóstico, Plan de Tratamiento y Recetas
- [ ] Dado que quiero agregar un síntoma, cuando hago clic en "Agregar Síntoma", entonces puedo ingresar: nombre del síntoma (requerido), ubicación corporal, severidad (1-10), duración y notas
- [ ] Dado que he agregado síntomas, cuando veo la lista de síntomas, entonces puedo editar o eliminar cualquier síntoma
- [ ] Dado que quiero agregar múltiples síntomas, cuando hago clic en "Agregar Síntoma" nuevamente, entonces puedo agregar síntomas adicionales
- [ ] Dado que ingreso un diagnóstico, cuando escribo en el campo de diagnóstico, entonces puedo ingresar diagnóstico en texto libre y notas opcionales
- [ ] Dado que quiero agregar una receta, cuando hago clic en "Agregar Receta", entonces puedo ingresar: nombre del medicamento, concentración, dosis, frecuencia, duración, cantidad, instrucciones (todos requeridos excepto duración/cantidad)
- [ ] Dado que he agregado recetas, cuando veo la lista de recetas, entonces puedo editar o eliminar cualquier receta
- [ ] Dado que he ingresado datos del registro, cuando hago clic en "Guardar", entonces todos los datos se persisten y aparece un mensaje de éxito
- [ ] Dado que quiero continuar editando, cuando guardo, entonces puedo seguir haciendo cambios
- [ ] Dado que quiero completar la cita, cuando hago clic en "Completar Cita", entonces el estado cambia a "Completada" y los campos se vuelven de solo lectura

### Notas Técnicas

- Usar esquema estructurado para síntomas y recetas (arrays de objetos)
- Implementar funcionalidad de auto-guardado de borrador (cada 30 segundos)
- La validación debe permitir guardados parciales pero requerir completitud para "Completar"
- Rastrear timestamps created_at y updated_at
- Usar actualizaciones optimistas para mejor UX
- Soportar deshacer para eliminaciones (borrado suave con timeout de 5 segundos)

### Prioridad

**Must-Have (P0)**

### Puntos de Historia

**8 puntos**

---

## Historia de Usuario 3: Auto-llenado con IA del Registro Médico

**Como** médico
**Quiero** que la IA extraiga y llene automáticamente los campos del registro médico desde la transcripción
**Para** ahorrar tiempo en documentación mientras mantengo la precisión a través de la revisión

### Descripción

Después de que la transcripción se completa, la IA analiza la conversación para identificar y extraer información médica relevante. El sistema llena automáticamente los campos del formulario con datos extraídos: motivo principal, síntomas, diagnóstico, recetas y plan de tratamiento. Todos los campos llenados por IA están claramente marcados y son editables, permitiendo al médico revisar, aceptar, modificar o rechazar sugerencias.

Esta es la propuesta de valor central de MedRecord AI: transformar conversaciones habladas en documentación médica estructurada.

### Criterios de Aceptación

- [ ] Dado que hay una transcripción disponible, cuando el procesamiento de IA se completa, entonces los campos del formulario se llenan automáticamente con datos extraídos
- [ ] Dado que la IA extrae un motivo principal, cuando el campo se llena, entonces refleja la razón declarada del paciente para la visita
- [ ] Dado que la IA extrae síntomas, cuando los síntomas se llenan, entonces cada síntoma incluye detalles disponibles (nombre, severidad, duración)
- [ ] Dado que la IA extrae un diagnóstico, cuando el campo se llena, entonces refleja la evaluación declarada del médico
- [ ] Dado que la IA extrae recetas, cuando las recetas se llenan, entonces cada una incluye detalles del medicamento (nombre, dosis, frecuencia, instrucciones)
- [ ] Dado que los campos son llenados por IA, cuando veo el formulario, entonces los campos llenados por IA tienen un indicador visual (ícono, resaltado, etiqueta)
- [ ] Dado un campo llenado por IA, cuando hago clic para editar, entonces puedo modificar o limpiar la sugerencia
- [ ] Dado las sugerencias de IA, cuando quiero rechazar todas, entonces puedo limpiar todas las sugerencias de IA con una acción
- [ ] Dado las sugerencias de IA, cuando las reviso y acepto, entonces el indicador de "llenado por IA" puede ser reconocido
- [ ] Dado que la extracción de IA falla o tiene baja confianza, cuando veo el formulario, entonces los campos afectados quedan vacíos requiriendo entrada manual
- [ ] Dado que se muestra la transcripción, cuando la IA extrae de una frase, entonces puedo ver qué texto de la transcripción corresponde a cada extracción (resaltado de fuente)

### Notas Técnicas

- Usar ingeniería de prompts estructurada para extraer datos en formato JSON
- Incluir contexto médico en los prompts para extracción precisa
- Implementar puntuación de confianza para extracciones
- Considerar extracción en streaming para sensación de tiempo real
- Almacenar referencias de fuente de extracción de IA (posiciones en transcripción)
- Manejar extracciones parciales con gracia
- Validar estructura de respuesta JSON antes de usar
- Implementar lógica de reintento para respuestas mal formadas

### Modelo de Datos para Extracción

```typescript
interface CampoExtraido<T> {
  valor: T;
  confianza: number;          // Puntuación de confianza 0-1
  textoFuente?: string;       // Extracto relevante de transcripción
  posicionFuente?: {          // Posición en transcripción
    inicio: number;
    fin: number;
  };
}
```

### Prioridad

**Must-Have (P0)**

### Puntos de Historia

**13 puntos**

---

## Resumen de Historias Seleccionadas

| Historia | Título | Puntos | Justificación |
|----------|--------|--------|---------------|
| US-003 | Ver Historial Médico | 5 | Esencial para continuidad del cuidado y contexto clínico |
| US-005 | Entrada Manual de Registro | 8 | Funcionalidad central de documentación clínica |
| US-007 | Auto-llenado con IA | 13 | Propuesta de valor diferenciadora del producto |

**Total**: 26 puntos de historia

Estas tres historias representan el flujo completo de documentación médica: desde revisar el historial del paciente (US-003), hasta documentar manualmente la visita actual (US-005), hasta aprovechar la IA para automatizar la documentación (US-007).
