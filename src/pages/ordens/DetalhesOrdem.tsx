import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
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
  percentual_desconto: number | null
  valor_desconto: number | null
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
  usa_comissao: boolean | null
}

interface LinhaEdicao {
  id?: string
  descricao: string
  quantidade: string
  valor: string
  tipo: 'servico' | 'peca'
  originalId?: string
}

const camposOS = `
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
  percentual_desconto,
  valor_desconto,
  valor_servicos,
  valor_pecas,
  valor_total,
  valor_comissao,
  updated_at
`

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
    const resultado = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Cuiaba',
    }).format(new Date(data))
    return resultado
  } catch {
    return '-'
  }
}

function converterValorNumerico(valor: string) {
  if (!valor) return 0

  let texto = valor
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')

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

function quantidadeParaInput(valor: number | null | undefined) {
  const numero = Number(valor ?? 1)
  if (!Number.isFinite(numero) || numero <= 0) return '1'
  return Number.isInteger(numero)
    ? String(numero)
    : String(numero).replace('.', ',')
}

function totalDaTarefa(tarefa: Pick<Tarefa, 'quantidade' | 'valor_unitario' | 'valor_total'>) {
  const quantidade = Number(tarefa.quantidade ?? 1)
  const valorUnitario = Number(tarefa.valor_unitario ?? 0)

  if (Number.isFinite(quantidade) && Number.isFinite(valorUnitario)) {
    return quantidade * valorUnitario
  }

  return Number(tarefa.valor_total ?? 0)
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
  const [novaQuantidade, setNovaQuantidade] = useState('1')
  const [novoValor, setNovoValor] = useState('')
  const [novoTipo, setNovoTipo] = useState<'servico' | 'peca'>('servico')
  const [mostrarAtribuicao, setMostrarAtribuicao] = useState(false)
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('')
  const [descontoPercentual, setDescontoPercentual] = useState('0')

  // O.S. só é realmente encerrada quando chega a concluida/encerrada/cancelada.
  // servico_finalizado = funcionário terminou e enviou para o painel.
  const osEncerrada = useMemo(() => {
    if (!ordem) return false
    return (
      ordem.status === 'concluida' ||
      ordem.status === 'encerrada' ||
      ordem.status === 'cancelada'
    )
  }, [ordem])

  const totaisEdicao = useMemo(() => {
    return linhas.reduce(
      (acumulado, linha) => {
        const quantidade = converterValorNumerico(linha.quantidade) || 1
        const valorUnitario = converterValorNumerico(linha.valor)
        const total = quantidade * valorUnitario

        if (linha.tipo === 'peca') {
          acumulado.pecas += total
        } else {
          acumulado.servicos += total
        }

        acumulado.total += total
        return acumulado
      },
      { servicos: 0, pecas: 0, total: 0 },
    )
  }, [linhas])

  const descontoEdicaoPercentual = useMemo(() => {
    const numero = converterValorNumerico(descontoPercentual)
    if (!Number.isFinite(numero)) return 0
    return Math.min(100, Math.max(0, numero))
  }, [descontoPercentual])

  const valorDescontoEdicao = useMemo(() => {
    return (totaisEdicao.servicos * descontoEdicaoPercentual) / 100
  }, [descontoEdicaoPercentual, totaisEdicao.servicos])

  const servicosLiquidosEdicao = useMemo(() => {
    return Math.max(0, totaisEdicao.servicos - valorDescontoEdicao)
  }, [totaisEdicao.servicos, valorDescontoEdicao])

  const totalExibicaoEdicao = useMemo(() => {
    return servicosLiquidosEdicao + totaisEdicao.pecas
  }, [servicosLiquidosEdicao, totaisEdicao.pecas])

  const comissaoEdicao = useMemo(() => {
    const percentual = Number(ordem?.percentual_comissao ?? 0)
    return (servicosLiquidosEdicao * percentual) / 100
  }, [ordem?.percentual_comissao, servicosLiquidosEdicao])

  const totalTarefas = useMemo(() => {
    return tarefas.reduce((total, tarefa) => total + totalDaTarefa(tarefa), 0)
  }, [tarefas])

  const totalExibicao = modoEdicao
    ? totalExibicaoEdicao
    : Number(ordem?.valor_total ?? totalTarefas)

  const carregarResponsavel = useCallback(async (responsavelId: string | null) => {
    if (!responsavelId) {
      setResponsavel(null)
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id,nome,codigo_acesso,empresa_id,usa_comissao,ativo')
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
      .select('id,nome,codigo_acesso,empresa_id,usa_comissao,ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .eq('usa_comissao', true)
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
        .select(camposOS)
        .eq('id', ordemId)
        .single()

      if (osError) throw osError

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

    void carregarTudo(id)

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
          void carregarTudo(id)
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
          void carregarTudo(id)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [id, carregarTudo])

  function iniciarEdicao() {
    if (!ordem) return

    const linhasAtuais: LinhaEdicao[] = tarefas.map((tarefa) => ({
      id: tarefa.id,
      originalId: tarefa.id,
      descricao:
        tarefa.descricao?.trim() ||
        tarefa.titulo?.trim() ||
        (tarefa.tipo === 'peca' ? 'Peça / Produto' : 'Serviço'),
      quantidade: quantidadeParaInput(tarefa.quantidade),
      valor: valorParaInput(tarefa.valor_unitario ?? 0),
      tipo: tarefa.tipo === 'peca' ? 'peca' : 'servico',
    }))

    setLinhas(linhasAtuais)
    setDescontoPercentual(valorParaInput(ordem.percentual_desconto ?? 0))
    setNovaDescricao('')
    setNovaQuantidade('1')
    setNovoValor('')
    setNovoTipo('servico')
    setModoEdicao(true)
  }

  function cancelarEdicao() {
    setModoEdicao(false)
    setLinhas([])
    setDescontoPercentual('0')
    setNovaDescricao('')
    setNovaQuantidade('1')
    setNovoValor('')
    setNovoTipo('servico')
  }

  function atualizarLinha(
    index: number,
    campo: 'descricao' | 'quantidade' | 'valor',
    valor: string,
  ) {
    setLinhas((atual) =>
      atual.map((linha, i) =>
        i === index ? { ...linha, [campo]: valor } : linha,
      ),
    )
  }

  function atualizarTipoLinha(index: number, tipo: 'servico' | 'peca') {
    setLinhas((atual) =>
      atual.map((linha, i) =>
        i === index ? { ...linha, tipo } : linha,
      ),
    )
  }

  function excluirLinha(index: number) {
    setLinhas((atual) => atual.filter((_, i) => i !== index))
  }

  function adicionarLinha() {
    const descricao = novaDescricao.trim()
    const quantidade = novaQuantidade.trim()
    const valor = novoValor.trim()

    if (!descricao && !valor) return

    setLinhas((atual) => [
      ...atual,
      {
        descricao: descricao || 'Serviço',
        quantidade: quantidade || '1',
        valor: valor || '0,00',
        tipo: novoTipo,
      },
    ])

    setNovaDescricao('')
    setNovaQuantidade('1')
    setNovoValor('')
    setNovoTipo('servico')
  }

  async function salvarEdicao() {
    if (!ordem || !id) return

    try {
      setSalvando(true)
      setErro('')

      // Confirma o status mais recente antes de editar/salvar.
      const { data: osAtual, error: consultaErro } = await supabase
        .from('ordens_servico')
        .select('status')
        .eq('id', ordem.id)
        .single()

      if (consultaErro) throw consultaErro

      if (osAtual?.status === 'cancelada') {
        throw new Error('Esta O.S. está cancelada e não pode ser alterada.')
      }

      const linhasValidas = linhas
        .map((linha) => {
          const quantidadeNumero = converterValorNumerico(linha.quantidade) || 1
          const numeroValor = converterValorNumerico(linha.valor)
          return {
            ...linha,
            descricao: linha.descricao.trim(),
            quantidadeNumero,
            numeroValor,
            valorTotal: quantidadeNumero * numeroValor,
            tipo: linha.tipo === 'peca' ? 'peca' as const : 'servico' as const,
          }
        })
        .filter((linha) => linha.descricao || linha.numeroValor > 0)

      const descontoNumero = Math.min(100, Math.max(0, converterValorNumerico(descontoPercentual)))
      const agora = new Date().toISOString()
      const idsMantidos = new Set<string>()

      for (let index = 0; index < linhasValidas.length; index++) {
        const linha = linhasValidas[index]

        if (linha.originalId) {
          idsMantidos.add(linha.originalId)

          const { error } = await supabase
            .from('os_tarefas')
            .update({
              titulo: linha.descricao || (linha.tipo === 'peca' ? 'Peça / Produto' : 'Serviço'),
              descricao: linha.descricao || null,
              tipo: linha.tipo,
              quantidade: linha.quantidadeNumero,
              valor_unitario: linha.numeroValor,
              valor_total: linha.valorTotal,
              ordem: index + 1,
              status: 'concluida',
              data_conclusao: agora,
              updated_at: agora,
            })
            .eq('id', linha.originalId)
            .eq('ordem_servico_id', ordem.id)

          if (error) throw error
        } else {
          const { data: novaTarefa, error } = await supabase
            .from('os_tarefas')
            .insert({
              ordem_servico_id: ordem.id,
              servico_id: null,
              responsavel_id: ordem.responsavel_id,
              titulo: linha.descricao || (linha.tipo === 'peca' ? 'Peça / Produto' : 'Serviço'),
              descricao: linha.descricao || null,
              tipo: linha.tipo,
              status: 'concluida',
              prioridade: 'normal',
              ordem: index + 1,
              quantidade: linha.quantidadeNumero,
              valor_unitario: linha.numeroValor,
              valor_total: linha.valorTotal,
              data_conclusao: agora,
              updated_at: agora,
            })
            .select('id')
            .maybeSingle()

          if (error) throw error
          if (novaTarefa?.id) idsMantidos.add(novaTarefa.id)
        }
      }

      const idsAntigos = tarefas.map((tarefa) => tarefa.id)
      const idsParaExcluir = idsAntigos.filter((tarefaId) => !idsMantidos.has(tarefaId))

      if (idsParaExcluir.length > 0) {
        const { error } = await supabase
          .from('os_tarefas')
          .delete()
          .in('id', idsParaExcluir)
          .eq('ordem_servico_id', ordem.id)

        if (error) throw error
      }

      // Os gatilhos da tabela os_tarefas recalculam automaticamente:
      // serviços, peças, total e comissão. Aqui apenas preservamos o status
      // atual da O.S. depois da edição feita pelo painel.
      const statusDepoisDaEdicao =
        osAtual?.status === 'concluida' || osAtual?.status === 'encerrada'
          ? osAtual.status
          : ordem.status

      const { data: osAtualizada, error: osError } = await supabase
        .from('ordens_servico')
        .update({
          status: statusDepoisDaEdicao,
          percentual_desconto: descontoNumero,
          data_conclusao: ordem.data_conclusao || agora,
          updated_at: agora,
        })
        .eq('id', ordem.id)
        .select(camposOS)
        .single()

      if (osError) throw osError

      setOrdem(osAtualizada as OrdemServico)
      setModoEdicao(false)
      setLinhas([])
      setDescontoPercentual('0')
      setNovaDescricao('')
      setNovaQuantidade('1')
      setNovoValor('')
      setNovoTipo('servico')

      await carregarTudo(ordem.id)
    } catch (error: any) {
      console.error('Erro ao salvar alterações:', error)
      setErro(error?.message || 'Não foi possível salvar as alterações da O.S.')
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
        .select(camposOS)
        .single()

      if (error) throw error

      setOrdem(data as OrdemServico)
      await carregarResponsavel(tecnicoSelecionado)
      setMostrarAtribuicao(false)
      setTecnicoSelecionado('')
    } catch (error: any) {
      console.error('Erro ao atribuir técnico:', error)
      setErro(error?.message || 'Não foi possível atribuir o técnico.')
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
        .select(camposOS)
        .single()

      if (error) throw error

      setOrdem(data as OrdemServico)
      setResponsavel(null)
    } catch (error: any) {
      console.error('Erro ao remover técnico:', error)
      setErro(error?.message || 'Não foi possível remover o técnico.')
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
        .select(camposOS)
        .single()

      if (error) throw error

      setOrdem(data as OrdemServico)
      await carregarTudo(ordem.id)
    } catch (error: any) {
      console.error('Erro ao reabrir O.S.:', error)
      setErro(error?.message || 'Não foi possível reabrir a O.S.')
    } finally {
      setSalvando(false)
    }
  }

  async function encerrarOS() {
    if (!ordem || salvando) return

    // O funcionário envia com servico_finalizado. O painel efetivamente encerra com concluida.
    try {
      setSalvando(true)
      setErro('')

      const agora = new Date().toISOString()

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          status: 'concluida',
          data_conclusao: agora,
          updated_at: agora,
        })
        .eq('id', ordem.id)
        .select(camposOS)
        .single()

      if (error) throw error

      // Atualiza a tela imediatamente, sem deixar o botão preso em ENCERRANDO...
      setOrdem(data as OrdemServico)
      setModoEdicao(false)
      setLinhas([])

      await carregarTudo(ordem.id)
    } catch (error: any) {
      console.error('Erro ao encerrar O.S.:', error)
      setErro(error?.message || 'Não foi possível encerrar a O.S.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div style={paginaBase}>
        Carregando O.S...
      </div>
    )
  }

  if (!ordem) {
    return (
      <div style={{ ...paginaBase, alignItems: 'flex-start', justifyContent: 'flex-start', padding: 30 }}>
        <button onClick={() => navigate('/ordens')} style={botaoVermelho}>← VOLTAR</button>
        <h2 style={{ marginTop: 30 }}>O.S. não encontrada</h2>
        {erro && <div style={caixaErro}>{erro}</div>}
      </div>
    )
  }

  const aguardandoPainel = ordem.status === 'servico_finalizado'
  const statusLabel = osEncerrada
    ? 'O.S. ENCERRADA'
    : aguardandoPainel
      ? 'AGUARDANDO PAINEL'
      : 'EM ANDAMENTO'

  return (
    <div style={paginaLayout}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={cabecalhoPagina}>
          <div style={grupoBotoes}>
            <button onClick={() => navigate('/ordens')} style={botaoSecundario}>← VOLTAR</button>
            <button onClick={() => navigate(`/ordens/${ordem.id}/relatorio`)} style={botaoVermelho}>🖨 IMPRIMIR O.S.</button>
          </div>

          <div style={{ fontSize: 24, fontWeight: 800 }}>
            O.S. Nº {ordem.numero ?? '-'}
          </div>
        </div>

        {erro && <div style={caixaErro}>{erro}</div>}

        <div style={cardPrincipal}>
          <div style={secao}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 15 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {ordem.titulo || 'Ordem de Serviço'}
              </div>
              <div style={statusBadge(osEncerrada, aguardandoPainel)}>
                {statusLabel}
              </div>
            </div>

            <div style={gridInfo}>
              <InfoItem titulo="Cliente" valor={entrada?.cliente_nome || '-'} />
              <InfoItem titulo="Telefone" valor={entrada?.telefone || '-'} />
              <InfoItem titulo="Veículo / Modelo" valor={entrada?.modelo || '-'} />
              <InfoItem titulo="Placa" valor={entrada?.placa || '-'} />
              <InfoItem titulo="Ano" valor={entrada?.ano != null ? String(entrada.ano) : '-'} />
              <InfoItem titulo="Frota" valor={entrada?.frota || '-'} />
              <InfoItem titulo="Entrada" valor={formatarData(entrada?.criado_em || ordem.data_entrada)} />
              <InfoItem titulo="Técnico" valor={responsavel?.nome || 'Não atribuído'} />
            </div>

            {(entrada?.observacao || ordem.observacoes) && (
              <div style={{ marginTop: 15, background: '#111', border: '1px solid #29292d', borderRadius: 10, padding: 14 }}>
                <div style={labelSecao}>OBSERVAÇÃO</div>
                <div style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {entrada?.observacao || ordem.observacoes}
                </div>
              </div>
            )}
          </div>

          {!osEncerrada && (
            <div style={secao}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={labelSecao}>RESPONSÁVEL</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {responsavel?.nome || 'Nenhum técnico atribuído'}
                  </div>
                </div>

                <div style={grupoBotoes}>
                  {responsavel && (
                    <button onClick={removerTecnico} disabled={salvando} style={botaoSecundario}>
                      REMOVER TÉCNICO
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMostrarAtribuicao(!mostrarAtribuicao)
                      if (responsavel) setTecnicoSelecionado(responsavel.id)
                    }}
                    disabled={salvando}
                    style={botaoVermelho}
                  >
                    {responsavel ? 'TROCAR TÉCNICO' : 'ATRIBUIR TÉCNICO'}
                  </button>
                </div>
              </div>

              {mostrarAtribuicao && (
                <div style={{ marginTop: 15, padding: 15, background: '#111', border: '1px solid #2c2c30', borderRadius: 10 }}>
                  <div style={grupoBotoes}>
                    <select value={tecnicoSelecionado} onChange={(event) => setTecnicoSelecionado(event.target.value)} style={campoSelect}>
                      <option value="">Selecione um técnico</option>
                      {tecnicos.map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
                      ))}
                    </select>
                    <button onClick={atribuirTecnico} disabled={salvando || !tecnicoSelecionado} style={botaoVermelho}>
                      SALVAR TÉCNICO
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={secao}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 15 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>SERVIÇOS E PEÇAS</div>
              <div style={{ color: aguardandoPainel ? '#fbbf24' : osEncerrada ? '#4ade80' : '#999', fontSize: 12, fontWeight: 800 }}>
                {aguardandoPainel ? 'FUNCIONÁRIO ENVIOU PARA O PAINEL' : osEncerrada ? 'SOMENTE VISUALIZAÇÃO' : 'EM ANDAMENTO'}
              </div>
            </div>

            {!modoEdicao ? (
              tarefas.length === 0 ? (
                <div style={caixaVazia}>Nenhum serviço ou peça lançado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={cabecalhoTabela}>
                    <div>#</div>
                    <div>DESCRIÇÃO</div>
                    <div style={{ textAlign: 'center' }}>TIPO</div>
                    <div style={{ textAlign: 'center' }}>QTD.</div>
                    <div style={{ textAlign: 'right' }}>TOTAL</div>
                  </div>

                  {tarefas.map((tarefa, index) => {
                    const quantidade = Number(tarefa.quantidade ?? 1)
                    const total = totalDaTarefa(tarefa)

                    return (
                      <div key={tarefa.id} style={linhaTabela}>
                        <div style={numeroTabela}>{index + 1}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-word' }}>
                          {tarefa.descricao || tarefa.titulo || (tarefa.tipo === 'peca' ? 'Peça / Produto' : 'Serviço')}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={tipoBadge(tarefa.tipo === 'peca')}>
                            {tarefa.tipo === 'peca' ? 'PEÇA' : 'SERVIÇO'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 800 }}>{quantidade}</div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 900 }}>{formatarMoeda(total)}</div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={cabecalhoTabelaEdicao}>
                  <div>DESCRIÇÃO</div>
                  <div>TIPO</div>
                  <div>QTD.</div>
                  <div>VALOR UNIT.</div>
                  <div style={{ textAlign: 'right' }}>TOTAL</div>
                  <div />
                </div>

                {linhas.map((linha, index) => {
                  const quantidade = converterValorNumerico(linha.quantidade) || 1
                  const valor = converterValorNumerico(linha.valor)
                  const total = quantidade * valor

                  return (
                    <div key={linha.id || `nova-${index}`} style={linhaEdicaoGrid}>
                      <input
                        value={linha.descricao}
                        onChange={(event) => atualizarLinha(index, 'descricao', event.target.value)}
                        placeholder="Descrição"
                        style={campoInput}
                      />
                      <select
                        value={linha.tipo}
                        onChange={(event) => atualizarTipoLinha(index, event.target.value as 'servico' | 'peca')}
                        style={campoSelectCompacto}
                      >
                        <option value="servico">Serviço</option>
                        <option value="peca">Peça</option>
                      </select>
                      <input
                        value={linha.quantidade}
                        onChange={(event) => atualizarLinha(index, 'quantidade', event.target.value)}
                        placeholder="1"
                        inputMode="decimal"
                        style={{ ...campoInput, textAlign: 'center' }}
                      />
                      <input
                        value={linha.valor}
                        onChange={(event) => atualizarLinha(index, 'valor', event.target.value)}
                        placeholder="0,00"
                        inputMode="decimal"
                        style={{ ...campoInput, textAlign: 'right' }}
                      />
                      <div style={totalEdicao}>{formatarMoeda(total)}</div>
                      <button type="button" onClick={() => excluirLinha(index)} style={botaoExcluir} title="Excluir linha">×</button>
                    </div>
                  )
                })}

                <div style={{ marginTop: 8, padding: 14, border: '1px dashed #444', borderRadius: 10, background: '#111' }}>
                  <div style={novaLinhaGrid}>
                    <input
                      value={novaDescricao}
                      onChange={(event) => setNovaDescricao(event.target.value)}
                      placeholder="Nova descrição"
                      style={campoInput}
                      onKeyDown={(event) => { if (event.key === 'Enter') adicionarLinha() }}
                    />
                    <select
                      value={novoTipo}
                      onChange={(event) => setNovoTipo(event.target.value as 'servico' | 'peca')}
                      style={campoSelectCompacto}
                      aria-label="Tipo da nova linha"
                    >
                      <option value="servico">Serviço</option>
                      <option value="peca">Peça</option>
                    </select>
                    <input
                      value={novaQuantidade}
                      onChange={(event) => setNovaQuantidade(event.target.value)}
                      placeholder="1"
                      inputMode="decimal"
                      style={{ ...campoInput, textAlign: 'center' }}
                      onKeyDown={(event) => { if (event.key === 'Enter') adicionarLinha() }}
                    />
                    <input
                      value={novoValor}
                      onChange={(event) => setNovoValor(event.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                      style={{ ...campoInput, textAlign: 'right' }}
                      onKeyDown={(event) => { if (event.key === 'Enter') adicionarLinha() }}
                    />
                    <div />
                    <button type="button" onClick={adicionarLinha} style={botaoAdicionar}>+</button>
                  </div>
                </div>

                <div style={{ color: '#999', fontSize: 12 }}>
                  Em cada linha, escolha se é SERVIÇO ou PEÇA. Serviços entram na comissão; peças entram no total da O.S., mas não geram comissão.
                </div>
              </div>
            )}

            {modoEdicao && (
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  flexWrap: 'wrap',
                  padding: 14,
                  background: '#111',
                  border: '1px solid #3c3c40',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>DESCONTO NO SERVIÇO</div>
                  <div style={{ color: '#777', fontSize: 11, marginTop: 4 }}>
                    O desconto reduz somente os serviços e a comissão é calculada sobre o valor líquido.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    value={descontoPercentual}
                    onChange={(event) => setDescontoPercentual(event.target.value)}
                    style={{ ...campoInput, width: 110, textAlign: 'right' }}
                  />
                  <strong style={{ fontSize: 16 }}>%</strong>
                </div>
              </div>
            )}

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
              {modoEdicao ? (
                <div style={resumoEdicao}>
                  <div>
                    <span style={resumoLabel}>SERVIÇOS BRUTOS</span>
                    <strong>{formatarMoeda(totaisEdicao.servicos)}</strong>
                  </div>
                  <div>
                    <span style={resumoLabel}>DESCONTO ({descontoEdicaoPercentual.toFixed(2).replace('.', ',')}%)</span>
                    <strong style={{ color: '#fbbf24' }}>-{formatarMoeda(valorDescontoEdicao)}</strong>
                  </div>
                  <div>
                    <span style={resumoLabel}>COMISSÃO ({Number(ordem?.percentual_comissao ?? 0).toFixed(2).replace('.', ',')}%)</span>
                    <strong style={{ color: '#ff4b55' }}>{formatarMoeda(comissaoEdicao)}</strong>
                  </div>
                  <div style={resumoTotal}>
                    <span style={resumoLabel}>TOTAL DA O.S.</span>
                    <strong>{formatarMoeda(totalExibicaoEdicao)}</strong>
                    <div style={{ marginTop: 4, color: '#72dc7d', fontSize: 11, fontWeight: 800 }}>
                      Serviços líquidos: {formatarMoeda(servicosLiquidosEdicao)} • Peças: {formatarMoeda(totaisEdicao.pecas)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={totalCard}>
                  <div style={{ fontSize: 12, color: '#999', fontWeight: 700, marginBottom: 5, textAlign: 'right' }}>TOTAL</div>
                  <div style={{ fontSize: 25, fontWeight: 900, textAlign: 'right' }}>
                    {formatarMoeda(totalExibicao)}
                  </div>
                  {(Number(ordem?.percentual_desconto ?? 0) > 0 || Number(ordem?.valor_desconto ?? 0) > 0) && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#fbbf24', textAlign: 'right' }}>
                      Desconto: {Number(ordem?.percentual_desconto ?? 0).toFixed(2).replace('.', ',')}% ({formatarMoeda(Number(ordem?.valor_desconto ?? 0))})
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontSize: 11, color: '#777', textAlign: 'right' }}>
                    Comissão: {formatarMoeda(Number(ordem?.valor_comissao ?? 0))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ ...secao, background: '#151517' }}>
            {osEncerrada && !modoEdicao ? (
              <div style={rodapeFlex}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px rgba(34,197,94,.5)' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>O.S. ENCERRADA</div>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 3 }}>
                      O PWA do funcionário está em modo somente visualização.
                    </div>
                  </div>
                </div>
                <div style={grupoBotoes}>
                  <button onClick={iniciarEdicao} disabled={salvando} style={{ ...botaoVermelho, padding: '13px 22px' }}>
                    EDITAR O.S.
                  </button>
                  <button onClick={reabrirOS} disabled={salvando} style={{ ...botaoSecundario, padding: '13px 22px' }}>
                    REABRIR O.S.
                  </button>
                </div>
              </div>
            ) : modoEdicao ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={cancelarEdicao} disabled={salvando} style={{ ...botaoSecundario, padding: '13px 22px' }}>
                  CANCELAR
                </button>
                <button onClick={salvarEdicao} disabled={salvando} style={{ ...botaoVermelho, padding: '13px 22px' }}>
                  {salvando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
              </div>
            ) : (
              <div style={rodapeFlex}>
                <div>
                  <div style={{ color: '#999', fontSize: 13 }}>
                    {aguardandoPainel
                      ? 'O funcionário concluiu o serviço. Revise quantidade, valores e descrição antes de encerrar.'
                      : 'O.S. em andamento.'}
                  </div>
                </div>
                <button onClick={encerrarOS} disabled={salvando} style={{ ...botaoVermelho, padding: '13px 22px' }}>
                  {salvando ? 'ENCERRANDO...' : 'ENCERRAR O.S.'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #29292d', borderRadius: 10, padding: 13 }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>
        {titulo}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-word' }}>
        {valor}
      </div>
    </div>
  )
}

const paginaBase: CSSProperties = {
  minHeight: '100vh',
  background: '#111',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Arial, sans-serif',
}

const paginaLayout: CSSProperties = {
  minHeight: '100vh',
  background: '#0f0f10',
  color: '#fff',
  padding: '24px 18px 50px',
  fontFamily: 'Arial, sans-serif',
}

const cabecalhoPagina: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 15,
  marginBottom: 20,
  flexWrap: 'wrap',
}

const grupoBotoes: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}

const cardPrincipal: CSSProperties = {
  background: '#19191b',
  border: '1px solid #2c2c30',
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 8px 30px rgba(0,0,0,.25)',
}

const secao: CSSProperties = {
  padding: 20,
  borderBottom: '1px solid #2c2c30',
}

const gridInfo: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 12,
}

const labelSecao: CSSProperties = {
  fontSize: 11,
  color: '#888',
  fontWeight: 700,
  marginBottom: 5,
  textTransform: 'uppercase',
}

const campoInput: CSSProperties = {
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

const campoSelect: CSSProperties = {
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

const botaoVermelho: CSSProperties = {
  border: 'none',
  background: '#e30613',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 800,
}

const botaoSecundario: CSSProperties = {
  border: '1px solid #414145',
  background: '#242427',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 800,
}

function statusBadge(encerrada: boolean, aguardando: boolean): CSSProperties {
  return {
    padding: '7px 10px',
    border: encerrada
      ? '1px solid #315f36'
      : aguardando
        ? '1px solid #715c19'
        : '1px solid #3c3c40',
    borderRadius: 999,
    background: encerrada ? '#153519' : aguardando ? '#332a0d' : '#222',
    color: encerrada ? '#72dc7d' : aguardando ? '#fbbf24' : '#aaa',
    fontSize: 10,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  }
}

const caixaErro: CSSProperties = {
  marginBottom: 18,
  background: '#3a1114',
  border: '1px solid #e30613',
  padding: 14,
  borderRadius: 10,
  color: '#fff',
}

const caixaVazia: CSSProperties = {
  padding: 20,
  background: '#111',
  borderRadius: 10,
  border: '1px dashed #444',
  color: '#999',
  textAlign: 'center',
}

const cabecalhoTabela: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '42px minmax(0,1fr) 105px 70px 130px',
  gap: 10,
  alignItems: 'center',
  padding: '0 14px 7px',
  color: '#777',
  fontSize: 10,
  fontWeight: 800,
}

const linhaTabela: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '42px minmax(0,1fr) 105px 70px 130px',
  gap: 10,
  alignItems: 'center',
  padding: '13px 14px',
  background: '#111',
  border: '1px solid #29292d',
  borderRadius: 9,
}

const numeroTabela: CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 7,
  background: '#222',
  color: '#aaa',
  fontWeight: 800,
  fontSize: 13,
}

const cabecalhoTabelaEdicao: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) 125px 70px 130px 110px 42px',
  gap: 8,
  padding: '0 10px 6px',
  color: '#777',
  fontSize: 10,
  fontWeight: 800,
}

const linhaEdicaoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) 125px 70px 130px 110px 42px',
  gap: 8,
  alignItems: 'center',
}

const novaLinhaGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) 125px 70px 130px 110px 42px',
  gap: 8,
  alignItems: 'center',
}

const campoSelectCompacto: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 42,
  borderRadius: 8,
  border: '1px solid #3b3b40',
  background: '#1a1a1d',
  color: '#fff',
  padding: '0 10px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 700,
}

function tipoBadge(peca: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
    padding: '5px 8px',
    borderRadius: 999,
    border: peca ? '1px solid #5b4a1b' : '1px solid #5f1b20',
    background: peca ? '#2a230f' : '#2a090b',
    color: peca ? '#fbbf24' : '#ff5f69',
    fontSize: 10,
    fontWeight: 900,
  }
}

const resumoEdicao: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))',
  gap: 10,
  width: '100%',
  padding: 14,
  background: '#111',
  border: '1px solid #38383c',
  borderRadius: 10,
}

const resumoLabel: CSSProperties = {
  display: 'block',
  color: '#777',
  fontSize: 10,
  fontWeight: 800,
  marginBottom: 4,
}

const resumoTotal: CSSProperties = {
  borderLeft: '1px solid #333',
  paddingLeft: 14,
}

const totalEdicao: CSSProperties = {
  color: '#fff',
  fontSize: 14,
  fontWeight: 900,
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

const botaoExcluir: CSSProperties = {
  width: 42,
  height: 42,
  border: '1px solid #5b2024',
  background: '#321215',
  color: '#ff5a66',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 800,
}

const botaoAdicionar: CSSProperties = {
  width: 42,
  height: 42,
  border: '1px solid #444',
  background: '#29292d',
  color: '#fff',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 20,
  fontWeight: 800,
}

const totalCard: CSSProperties = {
  minWidth: 240,
  background: '#111',
  border: '1px solid #38383c',
  borderRadius: 10,
  padding: 15,
}

const rodapeFlex: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
}
