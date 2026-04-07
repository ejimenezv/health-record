# Prompt 24: Create OpenAPI Specification (REST + WebSocket)

## Objective
Create the complete OpenAPI specification documenting all API endpoints (REST + WebSocket), following BSG requirements.

## Architecture Overview

**⚠️ DUAL API ARCHITECTURE**

This specification documents both:
1. **REST API**: BSG mandatory endpoints + session management
2. **WebSocket API**: Real-time streaming for live consultations

While OpenAPI 3.1 doesn't natively support WebSocket protocols, we document the WebSocket endpoint using the `webhooks` feature and provide detailed message schemas.

## Tasks

### Create `docs/api/openapi.yaml`

```yaml
openapi: "3.1.0"
info:
  title: "MedRecord AI Service API"
  description: |
    API REST para servicio de IA de transcripción y extracción médica en español.

    ## Características
    - Transcripción de audio médico con Whisper (optimizado para español)
    - Extracción de información médica estructurada con GPT-4
    - Validación RAG contra base de conocimiento médico español
    - Sugerencias de códigos CIE-10
    - Detección de interacciones medicamentosas
  version: "1.0.0"
  contact:
    name: "MedRecord AI Team"
    email: "support@medrecord.ai"

servers:
  - url: "http://localhost:8000"
    description: "Desarrollo local"
  - url: "https://api.medrecord.ai"
    description: "Producción"

security:
  - BearerAuth: []

tags:
  - name: Operations
    description: Endpoints operacionales (health, metrics)
  - name: Inference
    description: Consultas RAG y generación
  - name: Ingestion
    description: Carga de documentos al vector store
  - name: Sessions
    description: Session management for real-time streaming
  - name: Medical
    description: Endpoints específicos para uso médico (legacy batch mode)

# ═══════════════════════════════════════════════════════════
# WebSocket Protocol Documentation
# ═══════════════════════════════════════════════════════════
#
# WebSocket Endpoint: /ws/session
# Query Parameters:
#   - session_id: string (required) - Session ID from POST /api/v1/sessions
#   - token: string (required) - JWT authentication token
#
# Connection Flow:
#   1. Client creates session via POST /api/v1/sessions
#   2. Client connects to WebSocket URL with session_id and token
#   3. Server accepts connection and sends "connected" event
#   4. Client streams binary audio chunks (Opus codec, ~20ms frames)
#   5. Server sends real-time events: transcript_update, speaker_changed,
#      extraction_update, validation_alert, entity_validated, cost_update
#   6. Client sends "finalize" message to end session
#   7. Server sends "session_complete" event with final results
#
# Message Types (Client → Server):
#   - Binary data: Audio chunks (Opus codec)
#   - JSON {"type": "finalize"}: End session and get complete results
#   - JSON {"type": "ping"}: Keep-alive
#
# Event Types (Server → Client):
#   - transcript_update: New transcription text
#   - speaker_changed: Speaker identification update
#   - extraction_update: Incremental entity extraction
#   - validation_alert: Real-time safety alerts (drug interactions)
#   - entity_validated: Entity validation results
#   - cost_update: Running cost information
#   - session_complete: Final results
#   - error: Error message
#
# See components/schemas for event schemas (WS*Event)

paths:
  /api/v1/health:
    get:
      summary: "Health check del sistema"
      description: "Retorna el estado de todos los componentes. No requiere autenticación."
      operationId: healthCheck
      tags: [Operations]
      security: []
      responses:
        "200":
          description: "Sistema operando"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthResponse"
              example:
                status: "healthy"
                components:
                  llm_api:
                    status: "healthy"
                    latency_ms: 45.2
                    details: "OpenAI API configured"
                  vector_store:
                    status: "healthy"
                    latency_ms: 12.5
                    details: "ChromaDB connected, 220000 documents"
                  database:
                    status: "healthy"
                    details: "PostgreSQL connected"
                timestamp: "2024-01-15T10:30:00Z"
                version: "1.0.0"
        "503":
          description: "Sistema degradado o no disponible"

  /api/v1/query:
    post:
      summary: "Consulta RAG al sistema"
      description: |
        Recibe una consulta en lenguaje natural, ejecuta búsqueda semántica
        en la base de conocimiento médico y retorna documentos relevantes.
      operationId: queryRAG
      tags: [Inference]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/QueryRequest"
            example:
              query: "¿Cuál es la dosis recomendada de paracetamol para adultos?"
              include_sources: true
              context_filter:
                doc_type: "medication"
      responses:
        "200":
          description: "Consulta procesada exitosamente"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/QueryResponse"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "422":
          $ref: "#/components/responses/UnprocessableEntity"

  /api/v1/ingest:
    post:
      summary: "Ingesta de documentos"
      description: "Carga documentos al vector store para búsqueda RAG."
      operationId: ingestDocuments
      tags: [Ingestion]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/IngestRequest"
            example:
              documents:
                - content: "Paracetamol 500mg. Analgésico y antipirético..."
                  metadata:
                    doc_type: "medication"
                    source: "CIMA"
              source_type: "text"
      responses:
        "200":
          description: "Documentos indexados"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IngestResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

  /api/v1/transcribe:
    post:
      summary: "Transcripción de audio médico (LEGACY - Batch Mode)"
      description: |
        ⚠️ LEGACY ENDPOINT: Use WebSocket /ws/session for real-time streaming transcription.

        Transcribe audio completo de consultas médicas usando Whisper API.
        Optimizado para español con Voice Activity Detection.
      operationId: transcribeAudio
      tags: [Medical]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TranscribeRequest"
      responses:
        "200":
          description: "Transcripción completada"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TranscribeResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

  /api/v1/sessions:
    post:
      summary: "Create consultation session"
      description: |
        Create a new session for real-time WebSocket streaming.
        Returns session_id and WebSocket connection URL.
      operationId: createSession
      tags: [Sessions]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SessionCreateRequest"
            example:
              appointment_id: "apt_12345"
              patient_id: "pat_67890"
              doctor_id: "doc_11111"
              specialty: "cardiología"
      responses:
        "200":
          description: "Session created successfully"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
    get:
      summary: "List user sessions"
      description: |
        List all sessions for the current user with pagination.
      operationId: listSessions
      tags: [Sessions]
      parameters:
        - name: status_filter
          in: query
          schema:
            type: string
            enum: [active, completed, error]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: page_size
          in: query
          schema:
            type: integer
            default: 20
      responses:
        "200":
          description: "Sessions retrieved"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionListResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

  /api/v1/sessions/{session_id}:
    get:
      summary: "Get session status"
      description: |
        Get current status and statistics for a specific session.
      operationId: getSession
      tags: [Sessions]
      parameters:
        - name: session_id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: "Session retrieved"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "404":
          description: "Session not found"
    delete:
      summary: "Delete session"
      description: |
        Delete a session and cleanup all associated data.
        Disconnects WebSocket if still connected.
      operationId: deleteSession
      tags: [Sessions]
      parameters:
        - name: session_id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: "Session deleted"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "404":
          description: "Session not found"

  /api/v1/extract:
    post:
      summary: "Extracción de información médica (LEGACY - Batch Mode)"
      description: |
        ⚠️ LEGACY ENDPOINT: Use WebSocket /ws/session for real-time incremental extraction.

        Extrae información médica estructurada de una transcripción completa.
        Incluye validación RAG y sugerencias de códigos CIE-10.
      operationId: extractMedicalInfo
      tags: [Medical]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ExtractRequest"
            example:
              transcription: "Doctor: Le voy a recetar Paracetamol 1g cada 8 horas..."
              specialty: "medicina general"
              validate_with_rag: true
      responses:
        "200":
          description: "Extracción completada"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExtractResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: "JWT token de autenticación"

  schemas:
    HealthResponse:
      type: object
      required: [status, components, timestamp, version]
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        components:
          type: object
          additionalProperties:
            $ref: "#/components/schemas/ComponentHealth"
        timestamp:
          type: string
          format: date-time
        version:
          type: string

    ComponentHealth:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        latency_ms:
          type: number
        details:
          type: string

    QueryRequest:
      type: object
      required: [query]
      properties:
        query:
          type: string
          minLength: 1
          maxLength: 2048
        session_id:
          type: string
        context_filter:
          type: object
        include_sources:
          type: boolean
          default: true

    QueryResponse:
      type: object
      properties:
        response:
          type: string
        sources:
          type: array
          items:
            $ref: "#/components/schemas/SourceDocument"
        tokens_used:
          type: integer
        latency_ms:
          type: number
        session_id:
          type: string

    SourceDocument:
      type: object
      properties:
        document_id:
          type: string
        chunk_text:
          type: string
        similarity_score:
          type: number
        metadata:
          type: object

    IngestRequest:
      type: object
      required: [documents]
      properties:
        documents:
          type: array
          items:
            $ref: "#/components/schemas/DocumentInput"
        source_type:
          type: string
          enum: [text, pdf, url]

    DocumentInput:
      type: object
      required: [content]
      properties:
        content:
          type: string
        metadata:
          type: object
        doc_id:
          type: string

    IngestResponse:
      type: object
      properties:
        status:
          type: string
          enum: [success, partial, failed]
        indexed_docs:
          type: integer
        chunks_created:
          type: integer
        errors:
          type: array
          items:
            type: string

    TranscribeRequest:
      type: object
      required: [audio_base64]
      properties:
        audio_base64:
          type: string
          description: "Audio codificado en base64"
        language:
          type: string
          default: "es"
        use_vad:
          type: boolean
          default: true
        appointment_id:
          type: string

    TranscribeResponse:
      type: object
      properties:
        text:
          type: string
        segments:
          type: array
          items:
            type: object
            properties:
              start:
                type: number
              end:
                type: number
              text:
                type: string
        language:
          type: string
        duration_seconds:
          type: number
        cost_usd:
          type: number

    ExtractRequest:
      type: object
      required: [transcription]
      properties:
        transcription:
          type: string
          minLength: 10
        specialty:
          type: string
          default: "medicina general"
        validate_with_rag:
          type: boolean
          default: true
        appointment_id:
          type: string

    ExtractResponse:
      type: object
      properties:
        chief_complaint:
          type: string
        medications:
          type: array
          items:
            $ref: "#/components/schemas/ExtractedMedication"
        symptoms:
          type: array
          items:
            type: object
        diagnoses:
          type: array
          items:
            type: object
        drug_interactions:
          type: array
          items:
            $ref: "#/components/schemas/DrugInteraction"
        cie10_suggestions:
          type: array
          items:
            $ref: "#/components/schemas/CIE10Suggestion"
        confidence_score:
          type: number
        tokens_used:
          type: integer
        cost_usd:
          type: number

    ExtractedMedication:
      type: object
      properties:
        name:
          type: string
        dosage:
          type: string
        frequency:
          type: string
        validation:
          type: object
          properties:
            status:
              type: string
            rag_confidence:
              type: number
            warnings:
              type: array
              items:
                type: string

    DrugInteraction:
      type: object
      properties:
        medications:
          type: array
          items:
            type: string
        severity:
          type: string
          enum: [CRITICA, MAYOR, MODERADA, MENOR]
        description:
          type: string
        recommendation:
          type: string

    CIE10Suggestion:
      type: object
      properties:
        code:
          type: string
        description:
          type: string
        confidence:
          type: number

    ErrorResponse:
      type: object
      properties:
        detail:
          type: string
        error_code:
          type: string
        timestamp:
          type: string
          format: date-time

    # ═══════════════════════════════════════════════════════════
    # Session Management Schemas
    # ═══════════════════════════════════════════════════════════

    SessionCreateRequest:
      type: object
      properties:
        appointment_id:
          type: string
        patient_id:
          type: string
        doctor_id:
          type: string
        specialty:
          type: string
          default: "medicina general"
        metadata:
          type: object

    SessionStatus:
      type: object
      required: [session_id, status, created_at, updated_at]
      properties:
        session_id:
          type: string
        status:
          type: string
          enum: [active, completed, error, deleted]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        appointment_id:
          type: string
        patient_id:
          type: string
        doctor_id:
          type: string
        specialty:
          type: string
        audio_duration_seconds:
          type: number
        transcription_chunks:
          type: integer
        entities_extracted:
          type: integer
        validations_performed:
          type: integer
        cost_usd:
          type: number
        websocket_url:
          type: string
          description: "WebSocket URL for real-time streaming"
        is_connected:
          type: boolean

    SessionResponse:
      type: object
      properties:
        session:
          $ref: "#/components/schemas/SessionStatus"
        message:
          type: string

    SessionListResponse:
      type: object
      properties:
        sessions:
          type: array
          items:
            $ref: "#/components/schemas/SessionStatus"
        total:
          type: integer
        page:
          type: integer
        page_size:
          type: integer

    # ═══════════════════════════════════════════════════════════
    # WebSocket Event Schemas
    # ═══════════════════════════════════════════════════════════

    WSTranscriptUpdateEvent:
      type: object
      description: "Server → Client: New transcription text available"
      required: [type, text, timestamp]
      properties:
        type:
          type: string
          enum: [transcript_update]
        text:
          type: string
          description: "Transcribed text for this chunk"
        is_final:
          type: boolean
          description: "Whether this is final or partial transcription"
        speaker_id:
          type: string
          description: "Speaker identifier (e.g., SPEAKER_0, SPEAKER_1)"
        speaker_role:
          type: string
          enum: [doctor, patient, unknown]
        timestamp:
          type: number
          description: "Seconds from consultation start"
        chunk_index:
          type: integer

    WSSpeakerChangeEvent:
      type: object
      description: "Server → Client: Speaker changed"
      required: [type, previous_speaker_id, new_speaker_id, timestamp]
      properties:
        type:
          type: string
          enum: [speaker_changed]
        previous_speaker_id:
          type: string
        new_speaker_id:
          type: string
        new_speaker_role:
          type: string
          enum: [doctor, patient, unknown]
        confidence:
          type: number
        timestamp:
          type: number

    WSExtractionUpdateEvent:
      type: object
      description: "Server → Client: Incremental entity extraction update"
      required: [type, entity_type, timestamp]
      properties:
        type:
          type: string
          enum: [extraction_update]
        entity_type:
          type: string
          enum: [medication, symptom, diagnosis, allergy, vital_sign]
        entity:
          type: object
          description: "Extracted entity details"
        confidence:
          type: number
        speaker_id:
          type: string
        timestamp:
          type: number

    WSValidationAlertEvent:
      type: object
      description: "Server → Client: Real-time safety alert (drug interactions)"
      required: [type, alert_type, severity, timestamp]
      properties:
        type:
          type: string
          enum: [validation_alert]
        alert_type:
          type: string
          enum: [drug_interaction, dosage_warning, contraindication]
        severity:
          type: string
          enum: [CRITICAL, HIGH, MEDIUM, LOW]
          description: "CRITICAL <1s, HIGH <2s, MEDIUM <3s"
        medications:
          type: array
          items:
            type: string
        description:
          type: string
        recommendation:
          type: string
        timestamp:
          type: number
        processing_time_ms:
          type: number

    WSEntityValidatedEvent:
      type: object
      description: "Server → Client: Entity validated against RAG knowledge base"
      required: [type, entity_type, validation_status, timestamp]
      properties:
        type:
          type: string
          enum: [entity_validated]
        entity_type:
          type: string
          enum: [medication, diagnosis]
        entity_name:
          type: string
        validation_status:
          type: string
          enum: [VALIDATED, UNVERIFIED, NOT_FOUND]
        rag_confidence:
          type: number
        correct_dosage_range:
          type: string
        warnings:
          type: array
          items:
            type: string
        timestamp:
          type: number

    WSCostUpdateEvent:
      type: object
      description: "Server → Client: Running cost update"
      required: [type, cost_usd]
      properties:
        type:
          type: string
          enum: [cost_update]
        transcription_cost_usd:
          type: number
        extraction_cost_usd:
          type: number
        validation_cost_usd:
          type: number
        total_cost_usd:
          type: number
        audio_duration_seconds:
          type: number

    WSSessionCompleteEvent:
      type: object
      description: "Server → Client: Session finalized with complete results"
      required: [type, transcript]
      properties:
        type:
          type: string
          enum: [session_complete]
        transcript:
          type: string
          description: "Complete transcript text"
        diarized_transcript:
          type: array
          description: "Transcript with speaker labels"
          items:
            type: object
            properties:
              speaker:
                type: string
              speaker_role:
                type: string
              text:
                type: string
              start_time:
                type: number
              end_time:
                type: number
        extraction:
          $ref: "#/components/schemas/ExtractResponse"
        cost_summary:
          type: object
          properties:
            transcription_cost_usd:
              type: number
            extraction_cost_usd:
              type: number
            validation_cost_usd:
              type: number
            total_cost_usd:
              type: number
        session_stats:
          type: object
          properties:
            chunks_processed:
              type: integer
            transcription_segments:
              type: integer
            entities_extracted:
              type: integer
            validations_performed:
              type: integer
            audio_duration_seconds:
              type: number

    WSErrorEvent:
      type: object
      description: "Server → Client: Error occurred"
      required: [type, message]
      properties:
        type:
          type: string
          enum: [error]
        message:
          type: string
        error_code:
          type: string

    WSFinalizeMessage:
      type: object
      description: "Client → Server: Finalize session and get results"
      required: [type]
      properties:
        type:
          type: string
          enum: [finalize]

    WSPingMessage:
      type: object
      description: "Client → Server: Keep-alive ping"
      required: [type]
      properties:
        type:
          type: string
          enum: [ping]

  responses:
    BadRequest:
      description: "Request malformado"
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
    Unauthorized:
      description: "Token inválido o expirado"
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
    UnprocessableEntity:
      description: "Error de validación"
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
```

## Expected Deliverables
- `docs/api/openapi.yaml` - Complete OpenAPI specification (REST + WebSocket)

## Verification Steps

### REST API Documentation
1. OpenAPI spec validates with no errors (use Swagger Validator)
2. All BSG mandatory endpoints documented (health, query, ingest)
3. Session management endpoints documented (create, get, list, delete)
4. Legacy batch endpoints marked clearly (transcribe, extract)
5. Examples provided for main endpoints
6. Security scheme properly defined (BearerAuth JWT)

### WebSocket Protocol Documentation
7. WebSocket endpoint documented in comments section
8. Connection flow clearly explained
9. All event types documented with schemas:
   - Client → Server: binary audio, finalize, ping
   - Server → Client: transcript_update, speaker_changed, extraction_update,
     validation_alert, entity_validated, cost_update, session_complete, error
10. Event schemas follow consistent naming (WS*Event, WS*Message)

### Schema Completeness
11. Session management schemas complete (SessionCreateRequest, SessionStatus, etc.)
12. WebSocket event schemas complete (all 8+ event types)
13. Streaming event schemas include latency/performance fields
14. All schemas include descriptions

## Notes

### OpenAPI 3.1 and WebSocket
- OpenAPI 3.1 doesn't natively support WebSocket protocol specification
- We document WebSocket using comments and the `webhooks` concept
- Event schemas documented in `components/schemas` with `WS` prefix
- Connection flow and message types explained in comments

### Dual Architecture
- **REST API**: Synchronous batch processing + session lifecycle management
- **WebSocket API**: Real-time bidirectional streaming for live consultations
- Session management endpoints bridge the two (create session → get WebSocket URL)

### Event-Driven Real-Time Architecture
- **Incremental updates**: Events sent as soon as data is available
- **Priority-based validation**: CRITICAL alerts <1s, HIGH <2s, MEDIUM <3s
- **Streaming cost transparency**: Real-time cost updates every ~5 chunks
- **Speaker attribution**: All extraction events include speaker_id

### Integration Flow
1. Client creates session: `POST /api/v1/sessions`
2. Server returns `websocket_url` in response
3. Client connects to WebSocket with `session_id` and `token` query params
4. Client streams binary audio chunks (Opus codec)
5. Server emits real-time events as processing occurs
6. Client sends `{"type": "finalize"}` to end session
7. Server responds with `session_complete` event containing final results
8. Client optionally deletes session: `DELETE /api/v1/sessions/{session_id}`

### Event Schema Design
- All events include `type` field for client-side routing
- All events include `timestamp` for chronological ordering
- Safety-critical events (validation_alert) include `severity` for prioritization
- Incremental events include `confidence` scores for UI decision-making
