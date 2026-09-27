import api from '@/lib/api'
import type { Project } from './projects'

export type ConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW'
export type ConflictStatus = 'new' | 'reviewed' | 'dismissed' | 'actionable'

export interface EvidenceItem {
  _id: string
  conflictId: string
  sourceId?: string
  projectId?: string
  evidenceType: 'project_field' | 'source_text' | 'spatial_calculation' | 'temporal_calculation' | 'external_data'
  field?: string
  value: unknown
  sourceReference?: {
    page?: number
    section?: string
    url?: string
  }
  confidence: number
  createdAt: string
}

export interface RecommendedAction {
  action: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
}

export interface Recommendation {
  _id: string
  conflictId: string
  summary: string
  whyItMatters: string
  recommendedActions: RecommendedAction[]
  confidence: number
  limitations?: string[]
  model?: {
    provider: string
    name: string
  }
  generatedAt: string
  status: 'draft' | 'final' | 'failed'
}

export interface Conflict {
  _id: string
  analysisRunId: string | {
    _id: string
    createdAt: string
    status: string
    configuration?: {
      spatialThresholdMeters: number
      minimumOverlapDays: number
    }
  }
  projectAId: Project
  projectBId: Project
  spatial: {
    distanceMeters: number
    intersects: boolean
    sameCorridor: boolean
    spatialScore: number
  }
  temporal: {
    overlap: boolean
    overlapStart?: string
    overlapEnd?: string
    overlapDays: number
    temporalScore: number
  }
  similarity: {
    score: number
    matchedSignals: string[]
  }
  conflictScore: number
  severity: ConflictSeverity
  status: ConflictStatus
  explanationStatus: 'pending' | 'completed' | 'failed'
  evidenceItems?: EvidenceItem[]
  recommendation?: Recommendation | null
  createdAt: string
  updatedAt: string
}

export const conflictsApi = {
  list: (params?: { analysisRunId?: string; severity?: string; status?: string }) =>
    api.get<{ conflicts: Conflict[]; count: number }>('/conflicts', { params }),

  getById: (id: string) => api.get<{ conflict: Conflict }>(`/conflicts/${id}`),

  updateStatus: (id: string, status: ConflictStatus) =>
    api.patch<{ message: string; conflict: Conflict }>(`/conflicts/${id}/status`, { status }),
}
