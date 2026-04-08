# MedRecord AI Service

Servicio de IA para transcripcion y extraccion de datos medicos de consultas en espanol.

## Caracteristicas

- **Transcripcion de Audio**: OpenAI Whisper optimizado para espanol medico
- **Diarizacion de Hablantes**: Identificacion automatica de doctor/paciente
- **Extraccion Medica**: Notas SOAP, sintomas, diagnosticos, prescripciones
- **RAG Integrado**: Base de conocimiento medico en espanol para validacion
- **Optimizacion de Costos**: VAD, chunking inteligente, cache

## Requisitos

- Python 3.11+
- Docker y Docker Compose
- OpenAI API Key

## Inicio Rapido

```bash
# Clonar y navegar al servicio
cd ai-service

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar con Docker
docker-compose up -d

# O ejecutar localmente
uvicorn src.api.main:app --reload
```

## API Endpoints

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/v1/query` | POST | Consultar base de conocimiento medico |
| `/api/v1/ingest` | POST | Ingestar documentos al RAG |
| `/api/v1/transcription/sessions` | POST | Crear sesion de transcripcion |
| `/api/v1/transcription/sessions/{id}/audio` | POST | Subir audio |
| `/api/v1/transcription/sessions/{id}/finalize` | POST | Finalizar y extraer |
| `/health` | GET | Health check |

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │
│   (React)       │────▶│   (Node.js)     │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   AI Service (Python)  │
                    │   - Transcription      │
                    │   - Extraction         │
                    │   - RAG                │
                    └────────────────────────┘
```

## Documentacion

- [Documentacion del Proyecto](../docs/)
- [API OpenAPI Spec](../docs/api/openapi.yaml)
- [Guia de Usuario](../docs/guides/user-guide.md)
