/**
 * HTTP client for the Python AI service.
 *
 * Auth model: the Python service validates a JWT signed with `AI_SERVICE_JWT_SECRET`
 * (HS256, claim `sub`, claim `exp`). Node mints a short-lived service token for each
 * request rather than logging in via a `/auth/token` endpoint (the Python service
 * does not expose one).
 *
 * Contract differences vs. the Prompt 26 spec, observed against the live container:
 *  - POST /api/v1/sessions takes {appointment_id?, patient_id?, doctor_id?, specialty, metadata?}
 *    and returns {session: SessionStatus, message?} — no `websocket_url` field; we synthesize
 *    the Node-gateway URL ourselves at the controller layer.
 *  - There is no /api/v1/sessions/:id/finalize. Session lifecycle is create / get / DELETE,
 *    with the final summary delivered via the WebSocket `session_complete` event and
 *    persisted into Postgres by the gateway.
 */

import jwt from 'jsonwebtoken';

export interface CreateSessionRequest {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  specialty?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionStatus {
  sessionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  specialty: string;
  audioDurationSeconds: number;
  transcriptionChunks: number;
  entitiesExtracted: number;
  validationsPerformed: number;
}

export interface RAGQueryRequest {
  query: string;
  sessionId?: string;
  contextFilter?: Record<string, unknown>;
  includeSources?: boolean;
}

export interface RAGQueryResponse {
  response: string;
  sources: Array<{
    documentId: string;
    chunkText: string;
    similarityScore: number;
    metadata?: Record<string, unknown>;
  }>;
  tokensUsed: number;
  latencyMs: number;
  sessionId?: string;
}

export interface IngestRequest {
  documents: Array<{
    content: string;
    metadata: Record<string, unknown>;
    docId?: string;
  }>;
  sourceType: 'text' | 'pdf' | 'url';
}

export interface IngestResponse {
  status: 'success' | 'partial' | 'failed';
  indexedDocs: number;
  chunksCreated?: number;
  errors?: string[];
}

interface RawSessionStatus {
  session_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  appointment_id?: string | null;
  patient_id?: string | null;
  doctor_id?: string | null;
  specialty: string;
  audio_duration_seconds: number;
  transcription_chunks: number;
  entities_extracted: number;
  validations_performed: number;
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export interface AIServiceClientOptions {
  baseUrl?: string;
  jwtSecret?: string;
  serviceSubject?: string;
  tokenTtlSeconds?: number;
}

export class AIServiceClient {
  private readonly baseUrl: string;
  private readonly jwtSecret: string | null;
  private readonly serviceSubject: string;
  private readonly tokenTtlSeconds: number;

  constructor(options: AIServiceClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.AI_SERVICE_URL ??
      'http://localhost:8000'
    ).replace(/\/$/, '');
    this.jwtSecret = options.jwtSecret ?? process.env.AI_SERVICE_JWT_SECRET ?? null;
    this.serviceSubject = options.serviceSubject ?? process.env.AI_SERVICE_SUBJECT ?? 'node-backend';
    this.tokenTtlSeconds = options.tokenTtlSeconds ?? 300;
  }

  // ----- Sessions -----

  async createSession(req: CreateSessionRequest, userSubject?: string): Promise<SessionStatus> {
    const data = await this.request<{ session: RawSessionStatus; message?: string }>(
      'POST',
      '/api/v1/sessions',
      {
        appointment_id: req.appointmentId,
        patient_id: req.patientId,
        doctor_id: req.doctorId,
        specialty: req.specialty ?? 'medicina general',
        metadata: req.metadata ?? {},
      },
      userSubject
    );
    return this.unwrapSession(data.session);
  }

  async getSession(sessionId: string, userSubject?: string): Promise<SessionStatus> {
    const data = await this.request<{ session: RawSessionStatus }>(
      'GET',
      `/api/v1/sessions/${sessionId}`,
      undefined,
      userSubject
    );
    return this.unwrapSession(data.session);
  }

  /**
   * Closes an upstream session. The Python service has no /finalize endpoint;
   * DELETE is the lifecycle terminator. The final cost summary, transcript,
   * etc. arrive via the WebSocket `session_complete` event and are already
   * persisted in our DB by the gateway.
   */
  async closeSession(sessionId: string, userSubject?: string): Promise<SessionStatus> {
    const data = await this.request<{ session: RawSessionStatus }>(
      'DELETE',
      `/api/v1/sessions/${sessionId}`,
      undefined,
      userSubject
    );
    return this.unwrapSession(data.session);
  }

  // ----- RAG -----

  async query(req: RAGQueryRequest, userSubject?: string): Promise<RAGQueryResponse> {
    const data = await this.request<{
      response: string;
      sources: Array<{
        document_id: string;
        chunk_text: string;
        similarity_score: number;
        metadata?: Record<string, unknown>;
      }>;
      tokens_used: number;
      latency_ms: number;
      session_id?: string;
    }>(
      'POST',
      '/api/v1/query',
      {
        query: req.query,
        session_id: req.sessionId,
        context_filter: req.contextFilter,
        include_sources: req.includeSources ?? true,
      },
      userSubject
    );
    return {
      response: data.response,
      sources: data.sources.map((s) => ({
        documentId: s.document_id,
        chunkText: s.chunk_text,
        similarityScore: s.similarity_score,
        metadata: s.metadata,
      })),
      tokensUsed: data.tokens_used,
      latencyMs: data.latency_ms,
      sessionId: data.session_id,
    };
  }

  async ingest(req: IngestRequest, userSubject?: string): Promise<IngestResponse> {
    const data = await this.request<{
      status: 'success' | 'partial' | 'failed';
      indexed_docs: number;
      chunks_created?: number;
      errors?: string[];
    }>(
      'POST',
      '/api/v1/ingest',
      {
        documents: req.documents.map((d) => ({
          content: d.content,
          metadata: d.metadata,
          doc_id: d.docId,
        })),
        source_type: req.sourceType,
      },
      userSubject
    );
    return {
      status: data.status,
      indexedDocs: data.indexed_docs,
      chunksCreated: data.chunks_created,
      errors: data.errors,
    };
  }

  async checkHealth(): Promise<{
    status: string;
    components?: Array<{ name: string; status: string; message?: string }>;
  }> {
    return this.request('GET', '/health');
  }

  // ----- internals -----

  private unwrapSession(raw: RawSessionStatus): SessionStatus {
    return {
      sessionId: raw.session_id,
      status: raw.status,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      appointmentId: raw.appointment_id ?? undefined,
      patientId: raw.patient_id ?? undefined,
      doctorId: raw.doctor_id ?? undefined,
      specialty: raw.specialty,
      audioDurationSeconds: raw.audio_duration_seconds,
      transcriptionChunks: raw.transcription_chunks,
      entitiesExtracted: raw.entities_extracted,
      validationsPerformed: raw.validations_performed,
    };
  }

  /**
   * Mint a service JWT for connecting to the Python AI service over WebSocket.
   * Uses the same `AI_SERVICE_JWT_SECRET` as REST calls — the Python service
   * accepts any caller whose token is signed with that key.
   */
  mintWebSocketToken(subject: string): string {
    return this.mintServiceToken(subject);
  }

  private mintServiceToken(subject: string): string {
    if (!this.jwtSecret) {
      throw new AIServiceError(
        'AI_SERVICE_JWT_SECRET is not configured; cannot authenticate with the Python AI service'
      );
    }
    return jwt.sign({ sub: subject }, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.tokenTtlSeconds,
    });
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
    userSubject?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // /health is the only unauthenticated endpoint we hit; everything else needs a Bearer.
    if (path !== '/health' && this.jwtSecret) {
      headers.Authorization = `Bearer ${this.mintServiceToken(userSubject ?? this.serviceSubject)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = res.statusText;
        try {
          const errBody = (await res.json()) as { detail?: string };
          if (errBody.detail) detail = errBody.detail;
        } catch {
          /* ignore */
        }
        const msg =
          res.status === 401
            ? 'AI Service authentication failed'
            : res.status === 422
              ? `Validation error: ${detail}`
              : res.status === 429
                ? 'Rate limit exceeded'
                : res.status >= 500
                  ? 'AI Service unavailable'
                  : `AI Service request failed: ${detail}`;
        throw new AIServiceError(msg, res.status, url);
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof AIServiceError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new AIServiceError(`AI Service request failed: ${message}`, undefined, url);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const aiService = new AIServiceClient();
