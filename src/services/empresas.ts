import { supabase } from '../lib/supabase'

export interface Empresa {
  id: string
  nome: string
  nome_fantasia: string | null
  cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  ativa: boolean
  created_at: string
  updated_at: string
}

export async function buscarEmpresa(
  empresaId: string
): Promise<Empresa | null> {
  const { data, error } = await supabase
    .from('empresas')
    .select(
      `
        id,
        nome,
        nome_fantasia,
        cnpj,
        telefone,
        email,
        endereco,
        cidade,
        estado,
        ativa,
        created_at,
        updated_at
      `
    )
    .eq('id', empresaId)
    .single()

  if (error) {
    console.error('Erro ao buscar empresa:', error)
    throw error
  }

  return data
}