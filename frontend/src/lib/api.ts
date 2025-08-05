import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Crear instancia de axios
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // Para enviar cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos
})

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar timestamp para evitar cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Si el error es 401 y no es una ruta de auth, intentar refresh token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      try {
        const refreshResponse = await api.post('/auth/refresh')
        const { accessToken } = refreshResponse.data.data

        // Actualizar token en headers
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`

        // Reinttentar request original
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh falló, redirigir a login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Funciones de utilidad para las llamadas a la API
export const apiService = {
  // Auth
  auth: {
    login: (email: string, password: string) => 
      api.post('/auth/login', { email, password }),
    
    register: (userData: any) => 
      api.post('/auth/register', userData),
    
    logout: () => 
      api.post('/auth/logout'),
    
    me: () => 
      api.get('/auth/me'),
    
    refresh: () => 
      api.post('/auth/refresh'),
    
    forgotPassword: (email: string) => 
      api.post('/auth/forgot-password', { email }),
    
    resetPassword: (token: string, password: string) => 
      api.post('/auth/reset-password', { token, password }),
    
    changePassword: (currentPassword: string, newPassword: string) => 
      api.post('/auth/change-password', { currentPassword, newPassword }),
  },

  // Posts
  posts: {
    getAll: (params?: any) => 
      api.get('/posts', { params }),
    
    getById: (id: number) => 
      api.get(`/posts/${id}`),
    
    getBySlug: (slug: string) => 
      api.get(`/posts/slug/${slug}`),
    
    create: (data: any) => 
      api.post('/posts', data),
    
    update: (id: number, data: any) => 
      api.put(`/posts/${id}`, data),
    
    delete: (id: number) => 
      api.delete(`/posts/${id}`),
    
    like: (id: number, type?: string) => 
      api.post(`/posts/${id}/like`, { type }),
    
    getRelated: (id: number, limit?: number) => 
      api.get(`/posts/${id}/related`, { params: { limit } }),
  },

  // Categories
  categories: {
    getAll: (params?: any) => 
      api.get('/categories', { params }),
    
    getById: (id: number) => 
      api.get(`/categories/${id}`),
    
    getBySlug: (slug: string) => 
      api.get(`/categories/slug/${slug}`),
    
    create: (data: any) => 
      api.post('/categories', data),
    
    update: (id: number, data: any) => 
      api.put(`/categories/${id}`, data),
    
    delete: (id: number, reassignTo?: number) => 
      api.delete(`/categories/${id}`, { data: { reassignTo } }),
    
    getPosts: (id: number, params?: any) => 
      api.get(`/categories/${id}/posts`, { params }),
    
    reorder: (categories: any[]) => 
      api.put('/categories/reorder', { categories }),
  },

  // Tags
  tags: {
    getAll: (params?: any) => 
      api.get('/tags', { params }),
    
    create: (data: any) => 
      api.post('/tags', data),
    
    update: (id: number, data: any) => 
      api.put(`/tags/${id}`, data),
    
    delete: (id: number) => 
      api.delete(`/tags/${id}`),
  },

  // Comments
  comments: {
    getAll: (params?: any) => 
      api.get('/comments', { params }),
    
    create: (data: any) => 
      api.post('/comments', data),
    
    approve: (id: number) => 
      api.put(`/comments/${id}/approve`),
    
    delete: (id: number) => 
      api.delete(`/comments/${id}`),
  },

  // Media
  media: {
    getAll: (params?: any) => 
      api.get('/media', { params }),
    
    getById: (id: number) => 
      api.get(`/media/${id}`),
    
    upload: (file: File, data?: any) => {
      const formData = new FormData()
      formData.append('file', file)
      if (data) {
        Object.keys(data).forEach(key => {
          formData.append(key, data[key])
        })
      }
      return api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    
    uploadMultiple: (files: File[], data?: any) => {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      if (data) {
        Object.keys(data).forEach(key => {
          formData.append(key, data[key])
        })
      }
      return api.post('/media/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    
    update: (id: number, data: any) => 
      api.put(`/media/${id}`, data),
    
    delete: (id: number) => 
      api.delete(`/media/${id}`),
    
    getStats: () => 
      api.get('/media/stats/overview'),
  },

  // Users
  users: {
    getAll: (params?: any) => 
      api.get('/users', { params }),
    
    getById: (id: number) => 
      api.get(`/users/${id}`),
    
    update: (id: number, data: any) => 
      api.put(`/users/${id}`, data),
    
    delete: (id: number) => 
      api.delete(`/users/${id}`),
  },

  // Settings
  settings: {
    getAll: (params?: any) => 
      api.get('/settings', { params }),
    
    getByKey: (key: string) => 
      api.get(`/settings/${key}`),
    
    update: (key: string, data: any) => 
      api.put(`/settings/${key}`, data),
    
    create: (data: any) => 
      api.post('/settings', data),
    
    delete: (key: string) => 
      api.delete(`/settings/${key}`),
  },

  // Dashboard
  dashboard: {
    getStats: () => 
      api.get('/dashboard/stats'),
    
    getAnalytics: (period?: number) => 
      api.get('/dashboard/analytics', { params: { period } }),
    
    getQuickActions: () => 
      api.get('/dashboard/quick-actions'),
  },
}

export default api