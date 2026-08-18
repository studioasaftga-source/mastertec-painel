import { supabase } from '../lib/supabase'

export interface VeiculoCliente {
  id: string
  nome: string
  telefone: string | null
}

export interface Veiculo {
  id: string
  empresa_id: string | null
  cliente_id: string | null
  placa: string
  modelo: string | null
  marca: string | null
  ano: number | null
  chassi: string | null
  renavam: string | null
  motor: string | null
  quilometragem: number | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string

  cliente?: VeiculoCliente | null
}

export interface VeiculoInput {
  placa: string
  cliente_id?: string | null
  modelo?: string | null
  marca?: string | null
  ano?: number | null
  chassi?: string | null
  renavam?: string | null
  motor?: string | null
  quilometragem?: number | null
  observacoes?: string | null
}

/**
 * Normaliza a placa.
 *
 * ABC-1234 → ABC1234
 * abc-1234 → ABC1234
 * ABC1D23 → ABC1D23
 */
function normalizarPlaca(
  placa: string
): string {
  return placa
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Busca todos os veículos da empresa.
 */
export async function buscarVeiculos(
  empresaId: string
): Promise<Veiculo[]> {
  const { data, error } = await supabase
    .from('veiculos')
    .select(`
      *,
      cliente:clientes (
        id,
        nome,
        telefone
      )
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    console.error(
      'Erro ao buscar veículos:',
      error
    )

    throw error
  }

  return (data ?? []) as unknown as Veiculo[]
}

/**
 * Busca um veículo pela placa.
 *
 * PRIMEIRO:
 * consulta o Supabase.
 *
 * SE NÃO ENCONTRAR:
 * retorna null.
 *
 * A consulta da API externa será feita
 * posteriormente pelo fluxo da tela.
 */
export async function buscarVeiculoPorPlaca(
  empresaId: string,
  placa: string
): Promise<Veiculo | null> {
  const placaNormalizada =
    normalizarPlaca(placa)

  if (!placaNormalizada) {
    return null
  }

  const { data, error } = await supabase
    .from('veiculos')
    .select(`
      *,
      cliente:clientes (
        id,
        nome,
        telefone
      )
    `)
    .eq('empresa_id', empresaId)
    .eq('placa', placaNormalizada)
    .maybeSingle()

  if (error) {
    console.error(
      'Erro ao buscar veículo pela placa:',
      error
    )

    throw error
  }

  if (!data) {
    return null
  }

  return data as unknown as Veiculo
}

/**
 * Cria um veículo.
 */
export async function criarVeiculo(
  empresaId: string,
  dados: VeiculoInput
): Promise<Veiculo> {
  const placaNormalizada =
    normalizarPlaca(dados.placa)

  if (!placaNormalizada) {
    throw new Error(
      'A placa do veículo é obrigatória.'
    )
  }

  const { data, error } = await supabase
    .from('veiculos')
    .insert({
      empresa_id: empresaId,
      cliente_id:
        dados.cliente_id ?? null,
      placa: placaNormalizada,
      modelo:
        dados.modelo ?? null,
      marca:
        dados.marca ?? null,
      ano:
        dados.ano ?? null,
      chassi:
        dados.chassi ?? null,
      renavam:
        dados.renavam ?? null,
      motor:
        dados.motor ?? null,
      quilometragem:
        dados.quilometragem ?? null,
      observacoes:
        dados.observacoes ?? null,
    })
    .select(`
      *,
      cliente:clientes (
        id,
        nome,
        telefone
      )
    `)
    .single()

  if (error) {
    console.error(
      'Erro ao criar veículo:',
      error
    )

    throw error
  }

  return data as unknown as Veiculo
}

/**
 * Atualiza um veículo.
 */
export async function atualizarVeiculo(
  id: string,
  empresaId: string,
  dados: VeiculoInput
): Promise<Veiculo> {
  const placaNormalizada =
    normalizarPlaca(dados.placa)

  if (!placaNormalizada) {
    throw new Error(
      'A placa do veículo é obrigatória.'
    )
  }

  const { data, error } = await supabase
    .from('veiculos')
    .update({
      cliente_id:
        dados.cliente_id ?? null,

      placa: placaNormalizada,

      modelo:
        dados.modelo ?? null,

      marca:
        dados.marca ?? null,

      ano:
        dados.ano ?? null,

      chassi:
        dados.chassi ?? null,

      renavam:
        dados.renavam ?? null,

      motor:
        dados.motor ?? null,

      quilometragem:
        dados.quilometragem ?? null,

      observacoes:
        dados.observacoes ?? null,

      updated_at:
        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select(`
      *,
      cliente:clientes (
        id,
        nome,
        telefone
      )
    `)
    .single()

  if (error) {
    console.error(
      'Erro ao atualizar veículo:',
      error
    )

    throw error
  }

  return data as unknown as Veiculo
}

/**
 * Exclui um veículo.
 */
export async function excluirVeiculo(
  id: string,
  empresaId: string
): Promise<void> {
  const { error } = await supabase
    .from('veiculos')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) {
    console.error(
      'Erro ao excluir veículo:',
      error
    )

    throw error
  }
}

/**
 * Ativa ou desativa um veículo.
 */
export async function alterarStatusVeiculo(
  id: string,
  empresaId: string,
  ativo: boolean
): Promise<void> {
  const { error } = await supabase
    .from('veiculos')
    .update({
      ativo,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) {
    console.error(
      'Erro ao alterar status do veículo:',
      error
    )

    throw error
  }
}

/**
 * Formata/normaliza uma placa.
 */
export function formatarPlaca(
  placa: string
): string {
  return normalizarPlaca(placa)
}