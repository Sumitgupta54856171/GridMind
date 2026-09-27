import api from '@/lib/api';

export interface AIPreferences {
  privacyMode: 'public_only' | 'redacted' | 'standard';
  lowCost: boolean;
  costVisible: boolean;
}

export interface AIStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
}

export interface AIRequestLog {
  _id: string;
  provider: string;
  model: string;
  purpose: string;
  privacyMode: string;
  dataPolicy: {
    allowedFields: string[];
    redactedFields: string[];
  };
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  createdAt: string;
}

export interface AIStatsResponse {
  status: string;
  preferences: AIPreferences;
  stats: AIStats;
  requests: AIRequestLog[];
}

export async function getAIStats(): Promise<AIStatsResponse> {
  const res = await api.get<AIStatsResponse>('/ai/stats');
  return res.data;
}

export async function updateAISettings(data: Partial<AIPreferences>): Promise<{ status: string; preferences: AIPreferences }> {
  const res = await api.patch<{ status: string; preferences: AIPreferences }>('/ai/settings', data);
  return res.data;
}

export async function runAITest(data?: { privacyMode?: string; lowCost?: boolean }): Promise<any> {
  const res = await api.post('/ai/test', data || {});
  return res.data;
}
