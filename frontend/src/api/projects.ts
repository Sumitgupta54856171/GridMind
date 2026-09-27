import api from '@/lib/api'

export type ProjectType =
  | 'water'
  | 'wastewater'
  | 'electric'
  | 'gas'
  | 'telecom'
  | 'fiber'
  | 'transportation'
  | 'stormwater'
  | string

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'unknown'

export interface ProjectGeometry {
  type: 'Point' | 'LineString' | 'Polygon'
  coordinates: number[] | number[][] | number[][][]
}

export interface Project {
  _id: string
  utilityId: {
    _id: string
    name: string
    serviceAreaText?: string
    serviceArea?: {
      type: string
      coordinates: number[][][]
    }
    website?: string
    color?: string
  }
  sourceId?: {
    _id: string
    name: string
    sourceType: string
    retrievedAt?: string
  }
  externalId?: string
  name: string
  description?: string
  projectType: ProjectType
  status: ProjectStatus
  startDate?: string
  endDate?: string
  locationText?: string
  corridorName?: string
  geometry?: ProjectGeometry
  locationConfidence?: number
  extraction?: {
    method: 'manual' | 'parser' | 'llm'
    confidence: number
  }
  rawFields?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProjectStats {
  total: number
  mapped: number
  byType: Record<string, number>
  byUtility: Record<string, number>
  byStatus: Record<string, number>
}

export interface CreateProjectPayload {
  utilityId: string
  sourceId?: string
  name: string
  description?: string
  projectType: ProjectType
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  locationText?: string
  corridorName?: string
  coordinates?: [number, number]
  geometry?: ProjectGeometry
}

export interface UpdateProjectPayload {
  name?: string
  description?: string
  projectType?: ProjectType
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  locationText?: string
  corridorName?: string
  coordinates?: [number, number]
  geometry?: ProjectGeometry
}

export const projectsApi = {
  list: (params?: {
    utilityId?: string
    projectType?: string
    status?: string
    sourceId?: string
    search?: string
  }) => api.get<{ projects: Project[]; count: number }>('/projects', { params }),

  getStats: () => api.get<ProjectStats>('/projects/stats'),

  getById: (id: string) => api.get<{ project: Project }>(`/projects/${id}`),

  create: (data: CreateProjectPayload) => api.post<{ project: Project }>('/projects', data),

  update: (id: string, data: UpdateProjectPayload) =>
    api.patch<{ project: Project }>(`/projects/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/projects/${id}`),
}
