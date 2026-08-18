import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type { User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'

interface Usuario {
  id: string
  auth_user_id: string
  empresa_id: string
  nome: string
  email: string
  role: string
  ativo: boolean
}

interface AuthContextData {
  user: User | null
  usuario: Usuario | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{
    error: Error | null
  }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  async function carregarUsuario(authUser: User | null) {
    if (!authUser) {
      setUsuario(null)
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select(
        'id, auth_user_id, empresa_id, nome, email, role, ativo'
      )
      .eq('auth_user_id', authUser.id)
      .single()

    if (error) {
      console.error('Erro ao carregar usuário:', error)
      setUsuario(null)
      return
    }

    setUsuario(data)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    setUser(data.user)

    await carregarUsuario(data.user)

    return { error: null }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Erro ao sair:', error)
    }

    setUser(null)
    setUsuario(null)
  }

  useEffect(() => {
    async function iniciar() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const authUser = session?.user ?? null

        setUser(authUser)

        await carregarUsuario(authUser)
      } catch (error) {
        console.error('Erro ao iniciar autenticação:', error)
      } finally {
        setLoading(false)
      }
    }

    iniciar()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUser = session?.user ?? null

        setUser(authUser)

        await carregarUsuario(authUser)

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth deve ser usado dentro de AuthProvider'
    )
  }

  return context
}