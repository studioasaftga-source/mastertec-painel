import { supabase } from '../lib/supabase'

export interface DashboardResumo {
  clientes: number
  veiculos: number
  servicos: number
  ordensAbertas: number
  ordensTotal: number
  tarefasPendentes: number
}

export interface OrdemRecente {
  id: string
  numero: number | null
  titulo: string
  status: string
  prioridade: string
  data_entrada: string
  cliente_id: string | null
  veiculo_id: string | null
}

export async function buscarResumoDashboard(
  empresaId: string
): Promise<DashboardResumo> {
  const [
    clientesResult,
    veiculosResult,
    servicosResult,
    ordensResult,
    tarefasResult,
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('ativo', true),

    supabase
      .from('veiculos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('ativo', true),

    supabase
      .from('servicos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('ativo', true),

    supabase
      .from('ordens_servico')
      .select('id, status', {
        count: 'exact',
        head: false,
      })
      .eq('empresa_id', empresaId),

    supabase
      .from('os_tarefas')
      .select(
        `
          id,
          status,
          ordens_servico!inner(
            empresa_id
          )
        `,
        { count: 'exact', head: false }
      )
      .eq('ordens_servico.empresa_id', empresaId)
      .eq('status', 'pendente'),
  ])

  if (clientesResult.error) {
    throw clientesResult.error
  }

  if (veiculosResult.error) {
    throw veiculosResult.error
  }

  if (servicosResult.error) {
    throw servicosResult.error
  }

  if (ordensResult.error) {
    throw ordensResult.error
  }

  if (tarefasResult.error) {
    throw tarefasResult.error
  }

  const ordens = ordensResult.data ?? []

  const ordensAbertas = ordens.filter(
    (ordem) =>
      ordem.status !== 'concluida' &&
      ordem.status !== 'cancelada' &&
      ordem.status !== 'finalizada'
  ).length

  return {
    clientes: clientesResult.count ?? 0,
    veiculos: veiculosResult.count ?? 0,
    servicos: servicosResult.count ?? 0,
    ordensAbertas,
    ordensTotal: ordensResult.count ?? 0,
    tarefasPendentes: tarefasResult.count ?? 0,
  }
}

export async function buscarOrdensRecentes(
  empresaId: string
): Promise<OrdemRecente[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select(
      `
        id,
        numero,
        titulo,
        status,
        prioridade,
        data_entrada,
        cliente_id,
        veiculo_id
      `
    )
    .eq('empresa_id', empresaId)
    .order('data_entrada', {
      ascending: false,
    })
    .limit(8)

  if (error) {
    throw error
  }

  return data ?? []
}