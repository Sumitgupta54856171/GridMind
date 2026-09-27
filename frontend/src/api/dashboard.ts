import api from '@/lib/api';

export interface DashboardMetrics {
  utilities: number;
  projects: number;
  conflicts: number;
  highPriority: number;
  estimatedAICost: number;
}

export interface DashboardStatsResponse {
  status: string;
  metrics: DashboardMetrics;
  latestAnalysis: any;
  recentAudits: any[];
}

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const res = await api.get<DashboardStatsResponse>('/dashboard/stats');
  return res.data;
}
