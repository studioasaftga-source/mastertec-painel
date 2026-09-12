import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface OrdemServico {
  id: string
  empresa_id: string | null
  entrada_id: string | null
  responsavel_id: string | null
  numero: number | null
  titulo: string | null
  descricao: string | null
  status: string | null
  prioridade: string | null
  data_entrada: string | null
  data_inicio: string | null
  data_conclusao: string | null
  observacoes: string | null
  percentual_comissao: number | null
  valor_servicos: number | null
  valor_pecas: number | null
  valor_total: number | null
  valor_comissao: number | null
  updated_at: string | null
}

interface EntradaVeiculo {
  id: string
  placa: string | null
  ano: number | null
  modelo: string | null
  cliente_nome: string | null
  telefone: string | null
  foto_url: string | null
  foto_url_2: string | null
  criado_em: string | null
  tipo_entrada: string | null
  tipo_peca: string | null
  descricao_peca: string | null
  observacao: string | null
  frota: string | null
}

interface Tarefa {
  id: string
  ordem_servico_id: string
  responsavel_id: string | null
  titulo: string | null
  descricao: string | null
  tipo: string | null
  status: string | null
  ordem: number | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number | null
  data_inicio: string | null
  data_conclusao: string | null
  observacoes: string | null
  created_at: string | null
  updated_at: string | null
}

interface Tecnico {
  id: string
  nome: string
  codigo_acesso: string | null
  empresa_id: string | null
  ativo: boolean | null
}

interface LinhaEdicao {
  id?: string
  descricao: string
  valor: string
  originalId?: string
}

function formatarMoeda(valor: number | null | undefined) {
  const numero = Number(valor ?? 0)

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(data: string | null | undefined) {
  if (!data) return '-'

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Cuiaba',
    }).format(new Date(data))
  } catch {
    return '-'
  }
}

function converterValorNumerico(valor: string) {
  if (!valor) return 0

  let texto = valor.trim()

  texto = texto.replace(/\s/g, '')
  texto = texto.replace(/R\$/gi, '')

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '')
    texto = texto.replace(',', '.')
  }

  const numero = Number(texto)

  return Number.isFinite(numero) ? numero : 0
}

function valorParaInput(valor: number | null | undefined) {
  return Number(valor ?? 0).toFixed(2).replace('.', ',')
}

export default function DetalhesOrdem() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ordem, setOrdem] = useState<OrdemServico | null>(null)
  const [entrada, setEntrada] = useState<EntradaVeiculo | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [responsavel, setResponsavel] = useState<Tecnico | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [modoEdicao, setModoEdicao] = useState(false)

  const [linhas, setLinhas] = useState<LinhaEdicao[]>([])

  const [novaDescricao, setNovaDescricao] = useState('')
  const [novoValor, setNovoValor] = useState('')

  const [mostrarAtribuicao, setMostrarAtribuicao] = useState(false)
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('')

  const osEncerrada = useMemo(() => {
    if (!ordem) return false

    return (
      ordem.status === 'servico_finalizado' ||
      ordem.status === 'concluida' ||
      ordem.status === 'encerrada'
    )
  }, [ordem])

  const totalLinhas = useMemo(() => {
    return linhas.reduce((total, linha) => {
      return total + converterValorNumerico(linha.valor)
    }, 0)
  }, [linhas])

  const totalTarefas = useMemo(() => {
    return tarefas.reduce((total, tarefa) => {
      return total + Number(tarefa.valor_total ?? tarefa.valor_unitario ?? 0)
    }, 0)
  }, [tarefas])

  const totalExibicao = modoEdicao
    ? totalLinhas
    : Number(ordem?.valor_total ?? totalTarefas)

  const carregarResponsavel = useCallback(async (responsavelId: string | null) => {
    if (!responsavelId) {
      setResponsavel(null)
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id,nome,codigo_acesso,empresa_id,ativo')
      .eq('id', responsavelId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar técnico:', error)
      setResponsavel(null)
      return
    }

    setResponsavel(data as Tecnico | null)
  }, [])

  const carregarTecnicos = useCallback(async (empresaId: string | null) => {
    if (!empresaId) {
      setTecnicos([])
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id,nome,codigo_acesso,empresa_id,ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar técnicos:', error)
      setTecnicos([])
      return
    }

    setTecnicos((data ?? []) as Tecnico[])
  }, [])

  const carregarTudo = useCallback(async (ordemId: string) => {
    try {
      setErro('')

      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          empresa_id,
          entrada_id,
          responsavel_id,
          numero,
          titulo,
          descricao,
          status,
          prioridade,
          data_entrada,
          data_inicio,
          data_conclusao,
          observacoes,
          percentual_comissao,
          valor_servicos,
          valor_pecas,
          valor_total,
          valor_comissao,
          updated_at
        `)
        .eq('id', ordemId)
        .single()

      if (osError) {
        throw osError
      }

      const os = osData as OrdemServico

      setOrdem(os)

      const [entradaResult, tarefasResult] = await Promise.all([
        os.entrada_id
          ? supabase
              .from('entradas_veiculos')
              .select(`
                id,
                placa,
                ano,
                modelo,
                cliente_nome,
                telefone,
                foto_url,
                foto_url_2,
                criado_em,
                tipo_entrada,
                tipo_peca,
                descricao_peca,
                observacao,
                frota
              `)
              .eq('id', os.entrada_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        supabase
          .from('os_tarefas')
          .select(`
            id,
            ordem_servico_id,
            responsavel_id,
            titulo,
            descricao,
            tipo,
            status,
            ordem,
            quantidade,
            valor_unitario,
            valor_total,
            data_inicio,
            data_conclusao,
            observacoes,
            created_at,
            updated_at
          `)
          .eq('ordem_servico_id', ordemId)
          .order('ordem', { ascending: true })
          .order('created_at', { ascending: true }),
      ])

      if (entradaResult.error) {
        console.error('Erro ao carregar entrada:', entradaResult.error)
      }

      if (tarefasResult.error) {
        console.error('Erro ao carregar tarefas:', tarefasResult.error)
      }

      setEntrada((entradaResult.data as EntradaVeiculo | null) ?? null)
      setTarefas((tarefasResult.data ?? []) as Tarefa[])

      await Promise.all([
        carregarResponsavel(os.responsavel_id),
        carregarTecnicos(os.empresa_id),
      ])
    } catch (error: any) {
      console.error('Erro ao carregar O.S.:', error)
      setErro(error?.message || 'Não foi possível carregar a O.S.')
    } finally {
      setCarregando(false)
    }
  }, [carregarResponsavel, carregarTecnicos])

  useEffect(() => {
    if (!id) return

    carregarTudo(id)

    const canal = supabase
      .channel(`ordem-servico-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordens_servico',
          filter: `id=eq.${id}`,
        },
        () => {
          carregarTudo(id)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'os_tarefas',
          filter: `ordem_servico_id=eq.${id}`,
        },
        () => {
          carregarTudo(id)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id, carregarTudo])

  function iniciarEdicao() {
    if (!ordem) return

    const linhasAtuais = tarefas.map((tarefa) => ({
      id: tarefa.id,
      originalId: tarefa.id,
      descricao:
        tarefa.descricao?.trim() ||
        tarefa.titulo?.trim() ||
        'Serviço / Peça',
      valor: valorParaInput(
        tarefa.valor_total ?? tarefa.valor_unitario ?? 0,
      ),
    }))

    setLinhas(linhasAtuais)
    setNovaDescricao('')
    setNovoValor('')
    setModoEdicao(true)
  }

  function cancelarEdicao() {
    setModoEdicao(false)
    setLinhas([])
    setNovaDescricao('')
    setNovoValor('')
  }

  function atualizarLinha(
    index: number,
    campo: 'descricao' | 'valor',
    valor: string,
  ) {
    setLinhas((atual) =>
      atual.map((linha, i) =>
        i === index
          ? {
              ...linha,
              [campo]: valor,
            }
          : linha,
      ),
    )
  }

  function excluirLinha(index: number) {
    setLinhas((atual) => atual.filter((_, i) => i !== index))
  }

  function adicionarLinha() {
    const descricao = novaDescricao.trim()
    const valor = novoValor.trim()

    if (!descricao && !valor) {
      return
    }

    setLinhas((atual) => [
      ...atual,
      {
        descricao: descricao || 'Serviço / Peça',
        valor: valor || '0,00',
      },
    ])

    setNovaDescricao('')
    setNovoValor('')
  }

  async function salvarEdicao() {
    if (!ordem || !id) return

    try {
      setSalvando(true)
      setErro('')

      const linhasValidas = linhas
        .map((linha) => ({
          ...linha,
          descricao: linha.descricao.trim(),
          numeroValor: converterValorNumerico(linha.valor),
        }))
        .filter((linha) => linha.descricao || linha.numeroValor > 0)

      const agora = new Date().toISOString()

      /*
       * 1. Atualiza as tarefas que já existem.
       */
      for (let index = 0; index < linhasValidas.length; index++) {
        const linha = linhasValidas[index]

        if (linha.originalId) {
          const { error } = await supabase
            .from('os_tarefas')
            .update({
              titulo: linha.descricao || 'Serviço / Peça',
              descricao: linha.descricao || null,
              quantidade: 1,
              valor_unitario: linha.numeroValor,
              valor_total: linha.numeroValor,
              ordem: index + 1,
              status: 'concluida',
              data_conclusao: agora,
              updated_at: agora,
            })
            .eq('id', linha.originalId)
            .eq('ordem_servico_id', ordem.id)

          if (error) {
            throw error
          }
        } else {
          /*
           * 2. Insere serviços/peças novos adicionados durante a edição.
           */
          const { error } = await supabase
            .from('os_tarefas')
            .insert({
              ordem_servico_id: ordem.id,
              servico_id: null,
              responsavel_id: ordem.responsavel_id,
              titulo: linha.descricao || 'Serviço / Peça',
              descricao: linha.descricao || null,
              tipo: 'servico',
              status: 'concluida',
              prioridade: 'normal',
              ordem: index + 1,
              quantidade: 1,
              valor_unitario: linha.numeroValor,
              valor_total: linha.numeroValor,
              data_conclusao: agora,
              updated_at: agora,
            })

          if (error) {
            throw error
          }
        }
      }

      /*
       * 3. Descobre quais tarefas antigas foram removidas.
       */
      const idsMantidos = linhasValidas
        .filter((linha) => linha.originalId)
        .map((linha) => linha.originalId as string)

      const idsAntigos = tarefas.map((tarefa) => tarefa.id)

      const idsParaExcluir = idsAntigos.filter(
        (tarefaId) => !idsMantidos.includes(tarefaId),
      )

      if (idsParaExcluir.length > 0) {
        const { error } = await supabase
          .from('os_tarefas')
          .delete()
          .in('id', idsParaExcluir)
          .eq('ordem_servico_id', ordem.id)

        if (error) {
          throw error
        }
      }

      const novoTotal = linhasValidas.reduce(
        (total, linha) => total + linha.numeroValor,
        0,
      )

      /*
       * A O.S. continua encerrada após a correção.
       * Editar é apenas uma permissão temporária para corrigir
       * serviços e valores.
       */
      const { data: osAtualizada, error: osError } = await supabase
        .from('ordens_servico')
        .update({
          status: 'servico_finalizado',
          valor_servicos: novoTotal,
          valor_pecas: 0,
          valor_total: novoTotal,
          data_conclusao: ordem.data_conclusao || agora,
          updated_at: agora,
        })
        .eq('id', ordem.id)
        .select(`
          id,
          empresa_id,
          entrada_id,
          responsavel_id,
          numero,
          titulo,
          descricao,
          status,
          prioridade,
          data_entrada,
          data_inicio,
          data_conclusao,
          observacoes,
          percentual_comissao,
          valor_servicos,
          valor_pecas,
          valor_total,
          valor_comissao,
          updated_at
        `)
        .single()

      if (osError) {
        throw osError
      }

      setOrdem(osAtualizada as OrdemServico)

      await carregarTudo(ordem.id)

      setModoEdicao(false)
      setLinhas([])
      setNovaDescricao('')
      setNovoValor('')
    } catch (error: any) {
      console.error('Erro ao salvar alterações:', error)
      setErro(
        error?.message ||
          'Não foi possível salvar as alterações da O.S.',
      )
    } finally {
      setSalvando(false)
    }
  }

  async function atribuirTecnico() {
    if (!ordem || !tecnicoSelecionado) return

    if (osEncerrada) {
      setErro('A O.S. está encerrada. Não é possível alterar o técnico.')
      return
    }

    try {
      setSalvando(true)
      setErro('')

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          responsavel_id: tecnicoSelecionado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ordem.id)
        .select(`
          id,
          empresa_id,
          entrada_id,
          responsavel_id,
          numero,
          titulo,
          descricao,
          status,
          prioridade,
          data_entrada,
          data_inicio,
          data_conclusao,
          observacoes,
          percentual_comissao,
          valor_servicos,
          valor_pecas,
          valor_total,
          valor_comissao,
          updated_at
        `)
        .single()

      if (error) {
        throw error
      }

      setOrdem(data as OrdemServico)
      await carregarResponsavel(tecnicoSelecionado)

      setMostrarAtribuicao(false)
      setTecnicoSelecionado('')
    } catch (error: any) {
      console.error('Erro ao atribuir técnico:', error)
      setErro(
        error?.message ||
          'Não foi possível atribuir o técnico.',
      )
    } finally {
      setSalvando(false)
    }
  }

  async function removerTecnico() {
    if (!ordem) return

    if (osEncerrada) {
      setErro('A O.S. está encerrada. Não é possível alterar o técnico.')
      return
    }

    try {
      setSalvando(true)
      setErro('')

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          responsavel_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ordem.id)
        .select(`
          id,
          empresa_id,
          entrada_id,
          responsavel_id,
          numero,
          titulo,
          descricao,
          status,
          prioridade,
          data_entrada,
          data_inicio,
          data_conclusao,
          observacoes,
          percentual_comissao,
          valor_servicos,
          valor_pecas,
          valor_total,
          valor_comissao,
          updated_at
        `)
        .single()

      if (error) {
        throw error
      }

      setOrdem(data as OrdemServico)
      setResponsavel(null)
    } catch (error: any) {
      console.error('Erro ao remover técnico:', error)
      setErro(
        error?.message ||
          'Não foi possível remover o técnico.',
      )
    } finally {
      setSalvando(false)
    }
  }

  async function reabrirOS() {
    if (!ordem) return

    try {
      setSalvando(true)
      setErro('')

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          status: 'em_andamento',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ordem.id)
        .select(`
          id,
          empresa_id,
          entrada_id,
          responsavel_id,
          numero,
          titulo,
          descricao,
          status,
          prioridade,
          data_entrada,
          data_inicio,
          data_conclusao,
          observacoes,
          percentual_comissao,
          valor_servicos,
          valor_pecas,
          valor_total,
          valor_comissao,
          updated_at
        `)
        .single()

      if (error) {
        throw error
      }

      setOrdem(data as OrdemServico)

      await carregarTudo(ordem.id)
    } catch (error: any) {
      console.error('Erro ao reabrir O.S.:', error)
      setErro(
        error?.message ||
          'Não foi possível reabrir a O.S.',
      )
    } finally {
      setSalvando(false)
    }
  }

  async function encerrarOS() {
    if (!ordem) return

    try {
      setSalvando(true)
      setErro('')

      const total = tarefas.reduce(
        (soma, tarefa) =>
          soma +
          Number(
            tarefa.valor_total ??
              tarefa.valor_unitario ??
              0,
          ),
        0,
      )

      const agora = new Date().toISOString()

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          status: 'servico_finalizado',
          valor_servicos: total,
          valor_pecas: 0,
          valor_total: total,
          data_conclusao: agora,
          updated_at: agora,
        })
        .eq('id', ordem.id)
        .select(`
          id,
          empresa_id,
          entrada_id,
          responsavel_id,
          numero,
          titulo,
          descricao,
          status,
          prioridade,
          data_entrada,
          data_inicio,
          data_conclusao,
          observacoes,
          percentual_comissao,
          valor_servicos,
          valor_pecas,
          valor_total,
          valor_comissao,
          updated_at
        `)
        .single()

      if (error) {
        throw error
      }

      setOrdem(data as OrdemServico)

      await carregarTudo(ordem.id)
    } catch (error: any) {
      console.error('Erro ao encerrar O.S.:', error)
      setErro(
        error?.message ||
          'Não foi possível encerrar a O.S.',
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#111',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Carregando O.S...
      </div>
    )
  }

  if (!ordem) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#111',
          color: '#fff',
          padding: 30,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <button
          onClick={() => navigate('/ordens')}
          style={{
            background: '#e30613',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          ← VOLTAR
        </button>

        <h2 style={{ marginTop: 30 }}>
          O.S. não encontrada
        </h2>

        {erro && (
          <div
            style={{
              marginTop: 15,
              padding: 15,
              background: '#351114',
              border: '1px solid #e30613',
              borderRadius: 8,
              color: '#fff',
            }}
          >
            {erro}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f10',
        color: '#fff',
        padding: '24px 18px 50px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
        }}
      >
       {/* CABEÇALHO */}
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
    flexWrap: 'wrap',
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}
  >
    <button
      onClick={() => navigate('/ordens')}
      style={{
        background: '#222',
        border: '1px solid #444',
        color: '#fff',
        borderRadius: 8,
        padding: '10px 15px',
        cursor: 'pointer',
        fontWeight: 700,
      }}
    >
      ← VOLTAR
    </button>

    <button
      onClick={() =>
        navigate(`/ordens/${ordem.id}/relatorio`)
      }
      style={{
        background: '#e30613',
        border: 'none',
        color: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        cursor: 'pointer',
        fontWeight: 800,
      }}
    >
      🖨 IMPRIMIR O.S.
    </button>
  </div>

  <div
    style={{
      fontSize: 24,
      fontWeight: 800,
    }}
  >
    O.S. Nº {ordem.numero ?? '-'}
  </div>
</div>

        {erro && (
          <div
            style={{
              marginBottom: 18,
              background: '#3a1114',
              border: '1px solid #e30613',
              padding: 14,
              borderRadius: 10,
              color: '#fff',
            }}
          >
            {erro}
          </div>
        )}

        {/* CARD PRINCIPAL */}
        <div
          style={{
            background: '#19191b',
            border: '1px solid #2c2c30',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,.25)',
          }}
        >
          {/* TOPO DA O.S. */}
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid #2c2c30',
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 15,
              }}
            >
              {ordem.titulo || 'Ordem de Serviço'}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(220px,1fr))',
                gap: 12,
              }}
            >
              <InfoItem
                titulo="Cliente"
                valor={entrada?.cliente_nome || '-'}
              />

              <InfoItem
                titulo="Telefone"
                valor={entrada?.telefone || '-'}
              />

              <InfoItem
                titulo="Veículo / Modelo"
                valor={entrada?.modelo || '-'}
              />

              <InfoItem
                titulo="Placa"
                valor={entrada?.placa || '-'}
              />

              <InfoItem
                titulo="Ano"
                valor={
                  entrada?.ano !== null &&
                  entrada?.ano !== undefined
                    ? String(entrada.ano)
                    : '-'
                }
              />

              <InfoItem
                titulo="Frota"
                valor={entrada?.frota || '-'}
              />

              <InfoItem
                titulo="Entrada"
                valor={formatarData(
                  entrada?.criado_em ||
                    ordem.data_entrada,
                )}
              />

              <InfoItem
                titulo="Técnico"
                valor={
                  responsavel?.nome ||
                  'Não atribuído'
                }
              />
            </div>

            {(entrada?.observacao || ordem.observacoes) && (
              <div
                style={{
                  marginTop: 15,
                  background: '#111',
                  border: '1px solid #29292d',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  OBSERVAÇÃO
                </div>

                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.5,
                  }}
                >
                  {entrada?.observacao ||
                    ordem.observacoes}
                </div>
              </div>
            )}
          </div>

          {/* TÉCNICO */}
          {!osEncerrada && (
            <div
              style={{
                padding: 20,
                borderBottom: '1px solid #2c2c30',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#999',
                      marginBottom: 5,
                    }}
                  >
                    RESPONSÁVEL
                  </div>

                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    {responsavel?.nome ||
                      'Nenhum técnico atribuído'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {responsavel && (
                    <button
                      onClick={removerTecnico}
                      disabled={salvando}
                      style={botaoSecundario}
                    >
                      REMOVER TÉCNICO
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMostrarAtribuicao(
                        !mostrarAtribuicao,
                      )

                      if (responsavel) {
                        setTecnicoSelecionado(
                          responsavel.id,
                        )
                      }
                    }}
                    disabled={salvando}
                    style={botaoVermelho}
                  >
                    {responsavel
                      ? 'TROCAR TÉCNICO'
                      : 'ATRIBUIR TÉCNICO'}
                  </button>
                </div>
              </div>

              {mostrarAtribuicao && (
                <div
                  style={{
                    marginTop: 15,
                    padding: 15,
                    background: '#111',
                    border: '1px solid #2c2c30',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <select
                      value={tecnicoSelecionado}
                      onChange={(e) =>
                        setTecnicoSelecionado(
                          e.target.value,
                        )
                      }
                      style={campoSelect}
                    >
                      <option value="">
                        Selecione um técnico
                      </option>

                      {tecnicos.map((tecnico) => (
                        <option
                          key={tecnico.id}
                          value={tecnico.id}
                        >
                          {tecnico.nome}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={atribuirTecnico}
                      disabled={
                        salvando ||
                        !tecnicoSelecionado
                      }
                      style={botaoVermelho}
                    >
                      SALVAR TÉCNICO
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SERVIÇOS E PEÇAS */}
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid #2c2c30',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                marginBottom: 15,
              }}
            >
              SERVIÇOS E PEÇAS
            </div>

            {!modoEdicao ? (
              <>
                {tarefas.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      background: '#111',
                      borderRadius: 10,
                      border: '1px dashed #444',
                      color: '#999',
                      textAlign: 'center',
                    }}
                  >
                    Nenhum serviço ou peça lançado.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {tarefas.map(
                      (tarefa, index) => (
                        <div
                          key={tarefa.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              '45px 1fr auto',
                            alignItems: 'center',
                            gap: 10,
                            padding:
                              '13px 14px',
                            background:
                              '#111',
                            border:
                              '1px solid #29292d',
                            borderRadius: 9,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              borderRadius: 7,
                              background:
                                '#222',
                              color:
                                '#aaa',
                              fontWeight: 800,
                              fontSize: 13,
                            }}
                          >
                            {index + 1}
                          </div>

                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                            }}
                          >
                            {tarefa.descricao ||
                              tarefa.titulo ||
                              'Serviço / Peça'}
                          </div>

                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {formatarMoeda(
                              tarefa.valor_total ??
                                tarefa.valor_unitario ??
                                0,
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {linhas.map(
                  (linha, index) => (
                    <div
                      key={
                        linha.id ||
                        `nova-${index}`
                      }
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '1fr 150px 42px',
                        gap: 8,
                        alignItems:
                          'center',
                      }}
                    >
                      <input
                        value={
                          linha.descricao
                        }
                        onChange={(e) =>
                          atualizarLinha(
                            index,
                            'descricao',
                            e.target.value,
                          )
                        }
                        placeholder="Serviço / peça"
                        style={campoInput}
                      />

                      <input
                        value={linha.valor}
                        onChange={(e) =>
                          atualizarLinha(
                            index,
                            'valor',
                            e.target.value,
                          )
                        }
                        placeholder="0,00"
                        inputMode="decimal"
                        style={{
                          ...campoInput,
                          textAlign: 'right',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          excluirLinha(index)
                        }
                        style={{
                          width: 42,
                          height: 42,
                          border: '1px solid #5b2024',
                          background:
                            '#321215',
                          color: '#ff5a66',
                          borderRadius: 8,
                          cursor:
                            'pointer',
                          fontSize: 18,
                          fontWeight: 800,
                        }}
                        title="Excluir"
                      >
                        ×
                      </button>
                    </div>
                  ),
                )}

                {/* ADICIONAR */}
                <div
                  style={{
                    marginTop: 8,
                    padding: 14,
                    border:
                      '1px dashed #444',
                    borderRadius: 10,
                    background:
                      '#111',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 150px auto',
                      gap: 8,
                    }}
                  >
                    <input
                      value={novaDescricao}
                      onChange={(e) =>
                        setNovaDescricao(
                          e.target.value,
                        )
                      }
                      placeholder="Novo serviço / peça"
                      style={campoInput}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter'
                        ) {
                          adicionarLinha()
                        }
                      }}
                    />

                    <input
                      value={novoValor}
                      onChange={(e) =>
                        setNovoValor(
                          e.target.value,
                        )
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      style={{
                        ...campoInput,
                        textAlign: 'right',
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter'
                        ) {
                          adicionarLinha()
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={adicionarLinha}
                      style={{
                        background:
                          '#29292d',
                        border:
                          '1px solid #444',
                        color: '#fff',
                        borderRadius: 8,
                        padding:
                          '0 15px',
                        cursor:
                          'pointer',
                        fontWeight: 800,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    color: '#999',
                    fontSize: 12,
                  }}
                >
                  Você pode alterar qualquer
                  serviço, preço, excluir linhas
                  ou adicionar novos serviços.
                </div>
              </div>
            )}

            {/* TOTAL */}
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                justifyContent:
                  'flex-end',
              }}
            >
              <div
                style={{
                  minWidth: 240,
                  background: '#111',
                  border:
                    '1px solid #38383c',
                  borderRadius: 10,
                  padding: 15,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#999',
                    fontWeight: 700,
                    marginBottom: 5,
                    textAlign: 'right',
                  }}
                >
                  TOTAL
                </div>

                <div
                  style={{
                    fontSize: 25,
                    fontWeight: 900,
                    textAlign: 'right',
                  }}
                >
                  {formatarMoeda(
                    totalExibicao,
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RODAPÉ / CONTROLES */}
          <div
            style={{
              padding: 20,
              background: '#151517',
            }}
          >
            {osEncerrada && !modoEdicao ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  gap: 15,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background:
                        '#22c55e',
                      boxShadow:
                        '0 0 10px rgba(34,197,94,.5)',
                    }}
                  />

                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                      }}
                    >
                      O.S. ENCERRADA
                    </div>

                    <div
                      style={{
                        color: '#999',
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      Nenhuma alteração está
                      liberada enquanto a O.S.
                      permanecer encerrada.
                    </div>
                  </div>
                </div>

                <button
                  onClick={iniciarEdicao}
                  disabled={salvando}
                  style={{
                    ...botaoVermelho,
                    padding:
                      '13px 22px',
                    fontSize: 14,
                  }}
                >
                  EDITAR O.S.
                </button>
              </div>
            ) : modoEdicao ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  style={{
                    ...botaoSecundario,
                    padding:
                      '13px 22px',
                  }}
                >
                  CANCELAR
                </button>

                <button
                  onClick={salvarEdicao}
                  disabled={salvando}
                  style={{
                    ...botaoVermelho,
                    padding:
                      '13px 22px',
                  }}
                >
                  {salvando
                    ? 'SALVANDO...'
                    : 'SALVAR ALTERAÇÕES'}
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    color: '#999',
                    fontSize: 13,
                  }}
                >
                  O.S. em andamento.
                </div>

                <button
                  onClick={encerrarOS}
                  disabled={salvando}
                  style={{
                    ...botaoVermelho,
                    padding:
                      '13px 22px',
                  }}
                >
                  {salvando
                    ? 'ENCERRANDO...'
                    : 'ENCERRAR O.S.'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #29292d',
        borderRadius: 10,
        padding: 13,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#888',
          fontWeight: 700,
          marginBottom: 5,
          textTransform: 'uppercase',
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          wordBreak: 'break-word',
        }}
      >
        {valor}
      </div>
    </div>
  )
}

const campoInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 42,
  borderRadius: 8,
  border: '1px solid #3b3b40',
  background: '#1a1a1d',
  color: '#fff',
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
}

const campoSelect: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  height: 42,
  borderRadius: 8,
  border: '1px solid #3b3b40',
  background: '#1a1a1d',
  color: '#fff',
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
}

const botaoVermelho: React.CSSProperties = {
  border: 'none',
  background: '#e30613',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 800,
}

const botaoSecundario: React.CSSProperties = {
  border: '1px solid #414145',
  background: '#242427',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 800,
}