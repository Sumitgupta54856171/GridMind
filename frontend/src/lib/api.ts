import axios from 'axios'
import { store } from '@/store'
import { logout } from '@/store/slices/authSlice'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gridmind-dkqd.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout())
    }
    return Promise.reject(error)
  },
)

export default api
