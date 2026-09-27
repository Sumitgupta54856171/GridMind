import api from '@/lib/api'

export interface Utility {
  _id: string
  name: string
  description: string
  website: string
  serviceAreaText?: string
  serviceArea?: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  ownerId: string
  sourcesCount: number
  projectsCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateUtilityPayload {
  name: string
  description?: string
  website?: string
  serviceAreaText?: string
  serviceArea?:
    | {
        type: 'Polygon'
        coordinates: number[][][]
      }
    | string
}

export interface UpdateUtilityPayload {
  name?: string
  description?: string
  website?: string
  serviceAreaText?: string
  serviceArea?:
    | {
        type: 'Polygon'
        coordinates: number[][][]
      }
    | string
    | null
}

export const utilitiesApi = {
  list: () => api.get<{ utilities: Utility[] }>('/utilities'),
  getById: (id: string) => api.get<{ utility: Utility }>(`/utilities/${id}`),
  create: (data: CreateUtilityPayload) => api.post<{ utility: Utility }>('/utilities', data),
  update: (id: string, data: UpdateUtilityPayload) =>
    api.patch<{ utility: Utility }>(`/utilities/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/utilities/${id}`),
}

