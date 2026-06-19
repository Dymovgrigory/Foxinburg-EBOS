import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '../services/api'

export interface User {
  id: number
  email: string
  name: string
  role: string
  plan: string
  avatar_url?: string | null
  organization_id?: number | null
  branch_id?: number | null
  group_id?: number | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const res = await api.get('/auth/me')
        const userData = res.data.data ?? res.data
        setUser(userData)
      } catch {
        localStorage.removeItem('token')
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [])

  const login = (userData: User, token: string) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
