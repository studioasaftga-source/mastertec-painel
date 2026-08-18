import { supabase } from '../lib/supabase'

export interface Cliente {
  id: string
  empresa_id: string | null
  nome: string
  documento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ClienteInput {
  nome: string
  documento?: string
  telefone?: string
  email?: string
  endereco?: string
  cidade?: string
  estado?: string
  observacoes?: string
}

export async function buscarClientes(
  empresaId: string
): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true })

  if (error) {
    console.error(
      'Erro ao buscar clientes:',
      error
    )

    throw error
  }

  return data ?? []
}

export async function buscarCliente(
  id: string,
  empresaId: string
): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (error) {
    console.error(
      'Erro ao buscar cliente:',
      error
    )

    throw error
  }

  return data
}

export async function criarCliente(
  empresaId: string,
  cliente: ClienteInput
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      empresa_id: empresaId,
      nome: cliente.nome.trim(),
      documento:
        cliente.documento?.trim() || null,
      telefone:
        cliente.telefone?.trim() || null,
      email:
        cliente.email?.trim() || null,
      endereco:
        cliente.endereco?.trim() || null,
      cidade:
        cliente.cidade?.trim() || null,
      estado:
        cliente.estado?.trim() || null,
      observacoes:
        cliente.observacoes?.trim() || null,
      ativo: true,
    })
    .select()
    .single()

  if (error) {
    console.error(
      'Erro ao criar cliente:',
      error
    )

    throw error
  }

  return data
}

export async function atualizarCliente(
  id: string,
  empresaId: string,
  cliente: ClienteInput
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update({
      nome: cliente.nome.trim(),
      documento:
        cliente.documento?.trim() || null,
      telefone:
        cliente.telefone?.trim() || null,
      email:
        cliente.email?.trim() || null,
      endereco:
        cliente.endereco?.trim() || null,
      cidade:
        cliente.cidade?.trim() || null,
      estado:
        cliente.estado?.trim() || null,
      observacoes:
        cliente.observacoes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) {
    console.error(
      'Erro ao atualizar cliente:',
      error
    )

    throw error
  }

  return data
}

export async function excluirCliente(
  id: string,
  empresaId: string
): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) {
    console.error(
      'Erro ao excluir cliente:',
      error
    )

    throw error
  }
}

export async function alterarStatusCliente(
  id: string,
  empresaId: string,
  ativo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) {
    console.error(
      'Erro ao alterar status do cliente:',
      error
    )

    throw error
  }
}