# MedRecord - Medical Records System

> [!IMPORTANT]
> ## 📣 Aviso al profesor
>
> Estimado profesor,
>
> Dando seguimiento al comentario que le hice al final de la penúltima clase, me encuentro de viaje y no pude avanzar con el proyecto. Adicionalmente vuelvo a salir igualmente por trabajo del **lunes 4 al viernes 8 de mayo**, por lo que **desde el jueves 23 de abril** escribí a soporte BSG para solicitar una extensión de una semana, entregando el **domingo 3 de mayo a medianoche** (ya que vuelvo a salir por trabajo). Me indicaron que sí y que enviara la solicitud formal a un correo, sin embargo no me han respondido. Doy seguimiento el día **lunes 27 de abril**.
>
> En el ínter, cargo la actividad con un enlace a este repositorio, donde cargaré el proyecto a más tardar el **domingo 3 de mayo**.
>
> Por su comprensión, gracias.
>
> Atentamente,
> **Enrique Jiménez Vázquez**

---

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
