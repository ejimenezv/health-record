import api from './api';
import { ApiResponse } from '../types/auth.types';

export interface CreateAiSessionRequest {
  patientId?: string;
  appointmentId?: string;
  appointmentType?: string;
  specialty?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAiSessionResponse {
  id: string;
  sessionId: string;
  websocketUrl: string;
  status: string;
  specialty?: string;
  createdAt: string;
}

export interface FinalizeAiSessionResponse {
  sessionId: string;
  status?: string;
  finalTranscript?: string | null;
  totalCostUsd: number;
  audioDurationSeconds: number;
  completedAt?: string | null;
  events: unknown[];
}

export const aiSessionApi = {
  createSession: async (
    data: CreateAiSessionRequest
  ): Promise<CreateAiSessionResponse> => {
    const response = await api.post<ApiResponse<CreateAiSessionResponse>>(
      '/ai/sessions',
      data
    );
    return response.data.data!;
  },

  finalizeSession: async (sessionId: string): Promise<FinalizeAiSessionResponse> => {
    const response = await api.post<ApiResponse<FinalizeAiSessionResponse>>(
      `/ai/sessions/${sessionId}/finalize`
    );
    return response.data.data!;
  },

  acknowledgeAlert: async (alertId: string): Promise<void> => {
    await api.post(`/ai/alerts/${alertId}/acknowledge`);
  },

  getSessionEvents: async (sessionId: string): Promise<unknown[]> => {
    const response = await api.get<ApiResponse<unknown[]>>(
      `/ai/sessions/${sessionId}/events`
    );
    return response.data.data!;
  },
};
