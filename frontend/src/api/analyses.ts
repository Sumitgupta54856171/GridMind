import api from '@/lib/api'
import type { Conflict } from './conflicts'

export type AnalysisStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed'

export interface AnalysisRun {
  _id: string
  ownerId: string
  utilityIds: {
    _id: string
    name: string
    color?: string
    serviceAreaText?: string
  }[]
  projectIds: string[]
  status: AnalysisStatus
  stages: {
    extraction: string
    geospatial: string
    temporal: string
    conflict: string
    evidence: string
    ai: string
    transportation: string
  }
  configuration: {
    spatialThresholdMeters: number
    minimumOverlapDays: number
    enableAI: boolean
    enableTransportation: boolean
  }
  startedAt?: string
  completedAt?: string
  totalConflicts?: number
  highSeverityCount?: number
  mediumSeverityCount?: number
  lowSeverityCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateAnalysisPayload {
  utilityIds: string[]
  dateRange?: string
  spatialThresholdMeters?: number
  minimumOverlapDays?: number
  enableAI?: boolean
  enableTransportation?: boolean
}

export const analysesApi = {
  list: () => api.get<{ analyses: AnalysisRun[]; count: number }>('/analyses'),

  getById: (id: string) =>
    api.get<{ analysisRun: AnalysisRun; conflicts: Conflict[]; totalConflicts: number }>(
      `/analyses/${id}`
    ),

  getConflicts: (id: string) =>
    api.get<{ conflicts: Conflict[]; count: number }>(`/analyses/${id}/conflicts`),

  create: (data: CreateAnalysisPayload) =>
    api.post<{
      analysisRun: AnalysisRun
      totalConflicts: number
      highSeverityCount: number
    }>('/analyses', data),

  delete: (id: string) => api.delete<{ message: string }>(`/analyses/${id}`),
}
