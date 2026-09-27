import api from '@/lib/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    _id: string
    name: string
    email: string
    role: 'user' | 'admin'
  }
}

export const authApi = {
  login: (data: LoginPayload) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterPayload) => api.post<AuthResponse>('/auth/register', data),
  getMe: () => api.get<{ user: AuthResponse['user'] }>('/auth/me'),
  logout: () => api.post('/auth/logout'),
}
