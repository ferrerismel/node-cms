import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  avatar?: string
  bio?: string
  lastLogin?: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
  }) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  initAuth: () => void
  refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { user, accessToken } = response.data.data

          // Configurar token en axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', userData)
          const { user, accessToken } = response.data.data

          // Configurar token en axios
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        // Limpiar token de axios
        delete api.defaults.headers.common['Authorization']
        
        // Limpiar cookies
        Cookies.remove('refreshToken')
        
        // Llamar al endpoint de logout
        api.post('/auth/logout').catch(() => {
          // Ignorar errores del logout
        })

        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },

      initAuth: () => {
        const state = get()
        
        // Si ya hay un token, configurarlo en axios
        if (state.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
          
          // Verificar si el token sigue siendo válido
          api.get('/auth/me')
            .then(response => {
              const user = response.data.data.user
              set({ user, isAuthenticated: true })
            })
            .catch(() => {
              // Token inválido, intentar refresh
              get().refreshToken()
            })
        } else {
          // Intentar usar refresh token
          get().refreshToken()
        }
      },

      refreshToken: async () => {
        try {
          const response = await api.post('/auth/refresh')
          const { accessToken } = response.data.data

          // Configurar nuevo token
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          // Obtener datos del usuario
          const userResponse = await api.get('/auth/me')
          const user = userResponse.data.data.user

          set({
            user,
            token: accessToken,
            isAuthenticated: true
          })
        } catch (error) {
          // Refresh falló, limpiar estado
          set({
            user: null,
            token: null,
            isAuthenticated: false
          })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)