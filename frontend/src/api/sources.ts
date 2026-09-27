import api from '@/lib/api'

export type SourceType = 'pdf' | 'csv' | 'json' | 'gis' | 'webpage' | 'manual'
export type ParserStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface DataSource {
  _id: string
  utilityId: {
    _id: string
    name: string
    serviceAreaText?: string
    website?: string
  }
  name: string
  sourceType: SourceType
  sourceUrl: string
  storagePath: string
  retrievedAt: string
  checksum: string
  parserStatus: ParserStatus
  metadata?: {
    publisher?: string
    publicationDate?: string
    description?: string
  }
  projectsCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateSourcePayload {
  name: string
  sourceType: SourceType
  sourceUrl?: string
  parserStatus?: ParserStatus
  metadata?: {
    publisher?: string
    publicationDate?: string
    description?: string
  }
}

export interface UpdateSourcePayload {
  name?: string
  sourceType?: SourceType
  sourceUrl?: string
  parserStatus?: ParserStatus
  metadata?: {
    publisher?: string
    publicationDate?: string
    description?: string
  }
}

export const sourcesApi = {
  // List all sources, optional filtering by utilityId or sourceType
  list: (params?: { utilityId?: string; sourceType?: string }) =>
    api.get<{ sources: DataSource[] }>('/sources', { params }),

  // List sources belonging to a specific utility
  listByUtility: (utilityId: string) =>
    api.get<{ sources: DataSource[] }>(`/utilities/${utilityId}/sources`),

  // Get single source by ID
  getById: (id: string) => api.get<{ source: DataSource }>(`/sources/${id}`),

  // Create source under a specific utility (accepts JSON or FormData with file upload)
  createForUtility: (utilityId: string, data: CreateSourcePayload | FormData) =>
    api.post<{ source: DataSource }>(`/utilities/${utilityId}/sources`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),

  // Global create with utilityId in payload/FormData
  create: (data: FormData | (CreateSourcePayload & { utilityId: string })) =>
    api.post<{ source: DataSource }>('/sources', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),

  // Update source
  update: (id: string, data: UpdateSourcePayload) =>
    api.patch<{ source: DataSource }>(`/sources/${id}`, data),

  // Delete source
  delete: (id: string) => api.delete<{ message: string }>(`/sources/${id}`),

  // Re-run Gemini AI Extraction on source
  triggerExtraction: (id: string) =>
    api.post<{ message: string; totalExtracted: number; source: DataSource }>(`/sources/${id}/extract`),
}
