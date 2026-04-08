# MedRecord - Medical Records System

Sistema de registros medicos con transcripcion de consultas mediante IA.

## Project Structure

This project consists of three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| `frontend/` | React + TypeScript | User interface for medical records |
| `backend/` | Node.js + Express | API and data persistence |
| `ai-service/` | Python + FastAPI | AI transcription and extraction |

### Documentation

- `docs/` - BSG course documentation (architecture, ADRs, API specs)
- `docs-original/` - Original AI4Devs course documentation

### Quick Start

```bash
# Start all services
docker-compose up -d

# Or start individually
cd ai-service && docker-compose up -d
cd ../backend && npm run dev
cd ../frontend && npm run dev
```

## Features

- Patient registration and management
- Appointment scheduling
- Medical records with SOAP notes
- AI-powered consultation transcription (Spanish)
- Automatic medical data extraction
- RAG-based knowledge validation

## Requirements

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL
- OpenAI API Key

## License

MIT
