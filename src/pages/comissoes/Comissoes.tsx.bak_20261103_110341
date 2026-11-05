import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../../components/layout/Layout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Tecnico = {
  id: string
  nome: string
  percentual_comissao: number | null
  usa_comissao: boolean | null
  ativo: boolean | null
}

type LinhaComissao = {
  ordem_servico_id: string
  numero_os: string | number | null
  empresa_id: string
  responsavel_id: string | null
  tecnico_nome: string | null
  percentual_atual_tecnico: number | null
  percentual_comissao_os: number | null
  status: string | null
  data_entrada: string | null
  data_conclusao: string | null
  entrada_id: string | null
  cliente_nome: string | null
  placa: string | null
  modelo: string | null
  tarefa_id: string
  servico_titulo: string | null
  servico_descricao: string | null
  quantidade: number | null
  valor_unitario: number | null
  valor_servico: number | null
  valor_comissao_servico: number | null
}

type ModoImpressao = 'analitico' | 'sintetico'

function formatarMoeda(valor: number | null | undefined) {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarPercentual(valor: number | null | undefined) {
  return `${Number(valor ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return '-'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Cuiaba',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(data)
}

function formatarDataCompleta(valor: string | null | undefined) {
  if (!valor) return '-'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Cuiaba',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data)
}

function obterMesAtualCuiaba() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date())
}

function obterPrimeiroDia(mes: string) {
  return `${mes}-01`
}

function obterProximoMes(mes: string) {
  const [ano, numeroMes] = mes.split('-').map(Number)

  if (!ano || !numeroMes) {
    return mes
  }

  const proximoAno = numeroMes === 12 ? ano + 1 : ano
  const proximoNumeroMes = numeroMes === 12 ? 1 : numeroMes + 1

  return `${proximoAno}-${String(proximoNumeroMes).padStart(2, '0')}`
}

function inicioCuiabaComoIso(data: string) {
  return new Date(`${data}T00:00:00-04:00`).toISOString()
}

function fimCuiabaComoIso(data: string) {
  return new Date(`${data}T00:00:00-04:00`).toISOString()
}

function nomeDoMes(mes: string) {
  const [ano, numeroMes] = mes.split('-').map(Number)

  if (!ano || !numeroMes) {
    return mes
  }

  const data = new Date(Date.UTC(ano, numeroMes - 1, 1))

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(data)
}

export default function Comissoes() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [linhas, setLinhas] = useState<LinhaComissao[]>([])
  const [mes, setMes] = useState(obterMesAtualCuiaba())
  const [tecnicoId, setTecnicoId] = useState('')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [modoImpressao, setModoImpressao] = useState<ModoImpressao>('analitico')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ordensExpandidas, setOrdensExpandidas] =
    useState<Set<string>>(new Set())

  const administracaoPermitida = useMemo(
    () => usuario?.role === 'admin',
    [usuario?.role],
  )

  const carregarTecnicos = useCallback(async () => {
    if (!usuario?.empresa_id || !administracaoPermitida) {
      setTecnicos([])
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id,nome,percentual_comissao,usa_comissao,ativo')
      .eq('empresa_id', usuario.empresa_id)
      .eq('usa_comissao', true)
      .order('ativo', { ascending: false })
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar técnicos:', error)
      setErro(error.message || 'Não foi possível carregar os técnicos.')
      return
    }

    setTecnicos((data ?? []) as Tecnico[])
  }, [administracaoPermitida, usuario?.empresa_id])

  const carregarComissoes = useCallback(async () => {
    if (!usuario?.empresa_id || !administracaoPermitida || !mes) {
      setLinhas([])
      setCarregando(false)
      return
    }

    try {
      setCarregando(true)
      setErro('')

      const inicio = inicioCuiabaComoIso(obterPrimeiroDia(mes))
      const fim = fimCuiabaComoIso(obterPrimeiroDia(obterProximoMes(mes)))

      let consulta = supabase
        .from('relatorio_comissoes_servicos')
        .select(`
          ordem_servico_id,
          numero_os,
          empresa_id,
          responsavel_id,
          tecnico_nome,
          percentual_atual_tecnico,
          percentual_comissao_os,
          status,
          data_entrada,
          data_conclusao,
          entrada_id,
          cliente_nome,
          placa,
          modelo,
          tarefa_id,
          servico_titulo,
          servico_descricao,
          quantidade,
          valor_unitario,
          valor_servico,
          valor_comissao_servico
        `)
        .eq('empresa_id', usuario.empresa_id)
        .eq('status', 'concluida')
        .gte('data_conclusao', inicio)
        .lt('data_conclusao', fim)
        .order('data_conclusao', { ascending: false })

      if (tecnicoId) {
        consulta = consulta.eq('responsavel_id', tecnicoId)
      }

      const { data, error } = await consulta

      if (error) throw error

      setLinhas((data ?? []) as LinhaComissao[])
    } catch (error: any) {
      console.error('Erro ao carregar relatório de comissões:', error)
      setLinhas([])
      setErro(error?.message || 'Não foi possível carregar o relatório de comissões.')
    } finally {
      setCarregando(false)
    }
  }, [administracaoPermitida, mes, tecnicoId, usuario?.empresa_id])

  useEffect(() => {
    void carregarTecnicos()
  }, [carregarTecnicos])

  useEffect(() => {
    void carregarComissoes()
  }, [carregarComissoes])

  const nomesClientes = useMemo(() => {
    const mapa = new Map<string, string>()

    for (const linha of linhas) {
      const nome = (linha.cliente_nome || 'Sem cliente').trim() || 'Sem cliente'
      const chave = nome.toLocaleLowerCase('pt-BR')

      if (!mapa.has(chave)) {
        mapa.set(chave, nome)
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [linhas])

  const linhasFiltradas = useMemo(() => {
    if (!clienteFiltro) return linhas

    const alvo = clienteFiltro.trim().toLocaleLowerCase('pt-BR')

    return linhas.filter(linha => {
      const nome = (linha.cliente_nome || 'Sem cliente').trim() || 'Sem cliente'
      return nome.toLocaleLowerCase('pt-BR') === alvo
    })
  }, [clienteFiltro, linhas])

  const resumo = useMemo(() => {
    const osIds = new Set(linhasFiltradas.map(linha => linha.ordem_servico_id))
    const clientes = new Set(
      linhasFiltradas.map(
        linha => (linha.cliente_nome || 'Sem cliente').trim() || 'Sem cliente',
      ),
    )

    const valorServicos = linhasFiltradas.reduce(
      (total, linha) => total + Number(linha.valor_servico ?? 0),
      0,
    )

    const valorComissoes = linhasFiltradas.reduce(
      (total, linha) => total + Number(linha.valor_comissao_servico ?? 0),
      0,
    )

    return {
      ordens: osIds.size,
      servicos: linhasFiltradas.length,
      clientes: clientes.size,
      valorServicos,
      valorComissoes,
    }
  }, [linhasFiltradas])

  const resumoPorTecnico = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string
        nome: string
        percentual: number
        ordens: Set<string>
        servicos: number
        valorServicos: number
        valorComissoes: number
      }
    >()

    for (const linha of linhasFiltradas) {
      const id = linha.responsavel_id || `sem-responsavel-${linha.tecnico_nome || 'tecnico'}`
      const atual = mapa.get(id)

      if (atual) {
        atual.ordens.add(linha.ordem_servico_id)
        atual.servicos += 1
        atual.valorServicos += Number(linha.valor_servico ?? 0)
        atual.valorComissoes += Number(linha.valor_comissao_servico ?? 0)
        continue
      }

      mapa.set(id, {
        id,
        nome: linha.tecnico_nome || 'Sem técnico',
        percentual: Number(linha.percentual_comissao_os ?? 0),
        ordens: new Set([linha.ordem_servico_id]),
        servicos: 1,
        valorServicos: Number(linha.valor_servico ?? 0),
        valorComissoes: Number(linha.valor_comissao_servico ?? 0),
      })
    }

    return Array.from(mapa.values())
      .map(item => ({
        ...item,
        quantidadeOrdens: item.ordens.size,
      }))
      .sort((a, b) => b.valorComissoes - a.valorComissoes)
  }, [linhasFiltradas])

  const resumoPorCliente = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nome: string
        linhas: LinhaComissao[]
        ordens: Set<string>
        valorServicos: number
        valorComissoes: number
      }
    >()

    for (const linha of linhasFiltradas) {
      const nome = (linha.cliente_nome || 'Sem cliente').trim() || 'Sem cliente'
      const id = nome.toLocaleLowerCase('pt-BR')
      const atual = mapa.get(id)

      if (atual) {
        atual.linhas.push(linha)
        atual.ordens.add(linha.ordem_servico_id)
        atual.valorServicos += Number(linha.valor_servico ?? 0)
        atual.valorComissoes += Number(linha.valor_comissao_servico ?? 0)
        continue
      }

      mapa.set(id, {
        nome,
        linhas: [linha],
        ordens: new Set([linha.ordem_servico_id]),
        valorServicos: Number(linha.valor_servico ?? 0),
        valorComissoes: Number(linha.valor_comissao_servico ?? 0),
      })
    }

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [linhasFiltradas])

  const resumoPorOrdem = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string
        numeroOs: string | number | null
        dataConclusao: string | null
        tecnicoNome: string | null
        clienteNome: string | null
        placa: string | null
        modelo: string | null
        percentual: number
        linhas: LinhaComissao[]
        valorServicos: number
        valorComissoes: number
      }
    >()

    for (const linha of linhasFiltradas) {
      const atual = mapa.get(linha.ordem_servico_id)

      if (atual) {
        atual.linhas.push(linha)
        atual.valorServicos += Number(linha.valor_servico ?? 0)
        atual.valorComissoes += Number(linha.valor_comissao_servico ?? 0)
        continue
      }

      mapa.set(linha.ordem_servico_id, {
        id: linha.ordem_servico_id,
        numeroOs: linha.numero_os,
        dataConclusao: linha.data_conclusao,
        tecnicoNome: linha.tecnico_nome,
        clienteNome: linha.cliente_nome,
        placa: linha.placa,
        modelo: linha.modelo,
        percentual: Number(linha.percentual_comissao_os ?? 0),
        linhas: [linha],
        valorServicos: Number(linha.valor_servico ?? 0),
        valorComissoes: Number(linha.valor_comissao_servico ?? 0),
      })
    }

    return Array.from(mapa.values()).sort((a, b) => {
      const dataA = new Date(a.dataConclusao || 0).getTime()
      const dataB = new Date(b.dataConclusao || 0).getTime()

      if (dataA !== dataB) {
        return dataB - dataA
      }

      return Number(b.numeroOs ?? 0) - Number(a.numeroOs ?? 0)
    })
  }, [linhasFiltradas])

  const tecnicoSelecionadoNome = useMemo(() => {
    if (!tecnicoId) return 'Todos os técnicos'

    return tecnicos.find(tecnico => tecnico.id === tecnicoId)?.nome || 'Técnico selecionado'
  }, [tecnicoId, tecnicos])

  function alternarOrdem(ordemId: string) {
    setOrdensExpandidas(atual => {
      const proximo = new Set(atual)

      if (proximo.has(ordemId)) {
        proximo.delete(ordemId)
      } else {
        proximo.add(ordemId)
      }

      return proximo
    })
  }

  function imprimir(modo: ModoImpressao) {
    setModoImpressao(modo)

    window.setTimeout(() => {
      window.print()
    }, 120)
  }

  if (!administracaoPermitida) {
    return (
      <Layout>
        <div style={styles.page}>
          <section style={styles.card}>
            <div style={styles.kicker}>ADMINISTRAÇÃO</div>
            <h1 style={styles.title}>Relatório de Comissões</h1>
            <p style={styles.muted}>
              Esta área está disponível somente para administradores.
            </p>
          </section>
        </div>
      </Layout>
    )
  }

  return (
    <>
      <style>{printCss}</style>

      <Layout>
        <div className="screen-only" style={styles.page}>
          <div style={styles.headerRow}>
            <div>
              <div style={styles.kicker}>MASTERTEC • ADMINISTRAÇÃO</div>
              <h1 style={styles.title}>Relatório de Comissões</h1>
              <p style={styles.muted}>
                Serviços concluídos no mês selecionado. Peças não entram no cálculo da comissão.
              </p>
            </div>

            <div style={styles.headerButtons}>
              <button type="button" style={styles.secondaryButton} onClick={() => navigate('/tecnicos')}>
                🧰 TÉCNICOS
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => void carregarComissoes()}
                disabled={carregando}
              >
                ↻ ATUALIZAR
              </button>
            </div>
          </div>

          <section style={styles.card}>
            <div
              style={{
                ...styles.filterGrid,
                gridTemplateColumns: 'minmax(160px, 230px) minmax(220px, 320px) minmax(220px, 340px)',
              }}
            >
              <div style={styles.field}>
                <label style={styles.label}>MÊS</label>
                <input
                  type="month"
                  value={mes}
                  onChange={event => setMes(event.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>TÉCNICO</label>
                <select
                  value={tecnicoId}
                  onChange={event => setTecnicoId(event.target.value)}
                  style={styles.input}
                >
                  <option value="">Todos os técnicos</option>
                  {tecnicos.map(tecnico => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>CLIENTE</label>
                <select
                  value={clienteFiltro}
                  onChange={event => setClienteFiltro(event.target.value)}
                  style={styles.input}
                >
                  <option value="">Todos os clientes</option>
                  {nomesClientes.map(cliente => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.printTools}>
              <div>
                <div style={styles.label}>IMPRIMIR RELATÓRIO</div>
                <div style={styles.printDescription}>
                  Os filtros acima serão respeitados na impressão.
                </div>
              </div>

              <div style={styles.printButtons}>
                <button type="button" style={styles.printButton} onClick={() => imprimir('analitico')}>
                  🖨️ ANALÍTICO
                </button>

                <button
                  type="button"
                  style={styles.printButtonSecondary}
                  onClick={() => imprimir('sintetico')}
                >
                  🖨️ SINTÉTICO
                </button>
              </div>
            </div>
          </section>

          {erro && <div style={styles.error}>{erro}</div>}

          <section style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>O.S. CONCLUÍDAS</div>
              <div style={styles.summaryValue}>{resumo.ordens}</div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>CLIENTES</div>
              <div style={styles.summaryValue}>{resumo.clientes}</div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>TOTAL EM SERVIÇOS</div>
              <div style={styles.summaryMoney}>{formatarMoeda(resumo.valorServicos)}</div>
            </div>

            <div style={{ ...styles.summaryCard, borderColor: '#5a1d22' }}>
              <div style={styles.summaryLabel}>TOTAL DE COMISSÕES</div>
              <div style={{ ...styles.summaryMoney, color: '#ff6f78' }}>
                {formatarMoeda(resumo.valorComissoes)}
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeaderRow}>
              <div>
                <div style={styles.sectionTitle}>RESUMO POR TÉCNICO</div>
                <div style={styles.countText}>
                  {resumoPorTecnico.length} técnico(s) no período
                </div>
              </div>
            </div>

            {carregando ? (
              <div style={styles.empty}>Carregando relatório...</div>
            ) : resumoPorTecnico.length === 0 ? (
              <div style={styles.empty}>
                Nenhum serviço concluído encontrado para o período selecionado.
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>TÉCNICO</th>
                      <th style={styles.th}>COMISSÃO DA O.S.</th>
                      <th style={styles.th}>O.S.</th>
                      <th style={styles.th}>SERVIÇOS</th>
                      <th style={styles.th}>TOTAL SERVIÇOS</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>COMISSÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoPorTecnico.map(item => (
                      <tr key={item.id}>
                        <td style={styles.tdStrong}>{item.nome}</td>
                        <td style={styles.td}>{formatarPercentual(item.percentual)}</td>
                        <td style={styles.td}>{item.quantidadeOrdens}</td>
                        <td style={styles.td}>{item.servicos}</td>
                        <td style={styles.td}>{formatarMoeda(item.valorServicos)}</td>
                        <td style={{ ...styles.tdStrong, textAlign: 'right' }}>
                          {formatarMoeda(item.valorComissoes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeaderRow}>
              <div>
                <div style={styles.sectionTitle}>DETALHAMENTO DOS SERVIÇOS</div>
                <div style={styles.countText}>
                  Cada O.S. aparece uma única vez. Clique na O.S. para visualizar os serviços realizados.
                </div>
              </div>
            </div>

            {carregando ? (
              <div style={styles.empty}>Carregando detalhes...</div>
            ) : resumoPorOrdem.length === 0 ? (
              <div style={styles.empty}>Nenhum detalhe para exibir.</div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {resumoPorOrdem.map(ordemResumo => {
                  const cliente = ordemResumo.clienteNome || '-'
                  const veiculo = [ordemResumo.placa, ordemResumo.modelo]
                    .filter(Boolean)
                    .join(' • ')
                  const expandida = ordensExpandidas.has(ordemResumo.id)

                  return (
                    <div
                      key={ordemResumo.id}
                      style={{
                        border: expandida
                          ? '1px solid #4a4a4a'
                          : '1px solid #2e2e2e',
                        borderRadius: 12,
                        overflow: 'hidden',
                        background: '#0d0d0d',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => alternarOrdem(ordemResumo.id)}
                        aria-expanded={expandida}
                        style={{
                          width: '100%',
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(110px, 0.7fr) minmax(180px, 1.4fr) minmax(150px, 1fr) minmax(120px, 0.9fr) auto',
                          gap: 14,
                          padding: 14,
                          border: 'none',
                          borderBottom: expandida
                            ? '1px solid #2e2e2e'
                            : 'none',
                          background: expandida ? '#151515' : '#111',
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div>
                          <div style={styles.label}>O.S.</div>
                          <div
                            style={{
                              color: '#fff',
                              fontSize: 18,
                              fontWeight: 900,
                              marginTop: 4,
                            }}
                          >
                            #{ordemResumo.numeroOs ?? '-'}
                          </div>
                        </div>

                        <div>
                          <div style={styles.label}>CLIENTE</div>
                          <div
                            style={{
                              color: '#fff',
                              fontWeight: 800,
                              marginTop: 4,
                            }}
                          >
                            {cliente}
                          </div>
                          <div style={styles.cellMuted}>
                            {veiculo || '-'}
                          </div>
                        </div>

                        <div>
                          <div style={styles.label}>TÉCNICO</div>
                          <div
                            style={{
                              color: '#fff',
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            {ordemResumo.tecnicoNome || 'Sem técnico'}
                          </div>
                        </div>

                        <div>
                          <div style={styles.label}>CONCLUSÃO</div>
                          <div
                            style={{
                              color: '#fff',
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            {formatarData(ordemResumo.dataConclusao)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            fontWeight: 900,
                            color: expandida ? '#e30613' : '#aaa',
                          }}
                          aria-hidden="true"
                        >
                          {expandida ? '⌃' : '⌄'}
                        </div>
                      </button>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 16,
                          flexWrap: 'wrap',
                          padding: '11px 14px',
                          borderTop: expandida
                            ? 'none'
                            : '1px solid #242424',
                          background: '#111',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: '#777' }}>
                          {ordemResumo.linhas.length}{' '}
                          {ordemResumo.linhas.length === 1
                            ? 'serviço'
                            : 'serviços'}
                        </span>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 24,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ color: '#999' }}>
                            Serviços:{' '}
                            <strong style={{ color: '#fff' }}>
                              {formatarMoeda(ordemResumo.valorServicos)}
                            </strong>
                          </span>

                          <span style={{ color: '#999' }}>
                            Comissão:{' '}
                            <strong style={{ color: '#ff6f78' }}>
                              {formatarMoeda(ordemResumo.valorComissoes)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {expandida && (
                        <div style={styles.tableWrap}>
                          <table style={styles.table}>
                            <thead>
                              <tr>
                                <th style={styles.th}>SERVIÇO</th>
                                <th style={styles.th}>QTD.</th>
                                <th style={styles.th}>VALOR</th>
                                <th style={styles.th}>%</th>
                                <th
                                  style={{
                                    ...styles.th,
                                    textAlign: 'right',
                                  }}
                                >
                                  COMISSÃO
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ordemResumo.linhas.map(linha => {
                                const servico =
                                  linha.servico_titulo ||
                                  linha.servico_descricao ||
                                  '-'

                                return (
                                  <tr key={linha.tarefa_id}>
                                    <td style={styles.td}>{servico}</td>
                                    <td style={styles.td}>
                                      {Number(linha.quantidade ?? 1).toLocaleString(
                                        'pt-BR',
                                      )}
                                    </td>
                                    <td style={styles.td}>
                                      {formatarMoeda(linha.valor_servico)}
                                    </td>
                                    <td style={styles.td}>
                                      {formatarPercentual(linha.percentual_comissao_os)}
                                    </td>
                                    <td
                                      style={{
                                        ...styles.tdStrong,
                                        textAlign: 'right',
                                      }}
                                    >
                                      {formatarMoeda(
                                        linha.valor_comissao_servico,
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="print-report-page">
          <div className="print-header">
            <div>
              <div className="print-brand">MASTERTEC</div>
              <h1>RELATÓRIO DE COMISSÕES</h1>
              <div className="print-subtitle">
                Relatório {modoImpressao === 'analitico' ? 'ANALÍTICO' : 'SINTÉTICO'}
              </div>
            </div>

            <div className="print-meta">
              <div><strong>Período:</strong> {nomeDoMes(mes)}</div>
              <div><strong>Técnico:</strong> {tecnicoSelecionadoNome}</div>
              <div><strong>Cliente:</strong> {clienteFiltro || 'Todos os clientes'}</div>
              <div><strong>Emissão:</strong> {formatarDataCompleta(new Date().toISOString())}</div>
            </div>
          </div>

          <div className="print-summary-grid">
            <div>
              <span>O.S. CONCLUÍDAS</span>
              <strong>{resumo.ordens}</strong>
            </div>
            <div>
              <span>CLIENTES</span>
              <strong>{resumo.clientes}</strong>
            </div>
            <div>
              <span>TOTAL EM SERVIÇOS</span>
              <strong>{formatarMoeda(resumo.valorServicos)}</strong>
            </div>
            <div>
              <span>TOTAL DE COMISSÕES</span>
              <strong>{formatarMoeda(resumo.valorComissoes)}</strong>
            </div>
          </div>

          {modoImpressao === 'analitico' ? (
            <div>
              <div className="print-section-title">ANALÍTICO — CLIENTES E SERVIÇOS</div>

              {resumoPorCliente.length === 0 ? (
                <div className="print-empty">Nenhum serviço encontrado para os filtros selecionados.</div>
              ) : (
                resumoPorOrdem.map(ordemResumo => {
                  const cliente = ordemResumo.clienteNome || '-'
                  const veiculo = [ordemResumo.placa, ordemResumo.modelo]
                    .filter(Boolean)
                    .join(' • ')

                  return (
                    <section key={ordemResumo.id} className="print-client-block">
                      <div className="print-client-header">
                        <div>
                          <strong>
                            O.S. #{ordemResumo.numeroOs ?? '-'} • {cliente}
                          </strong>
                          <span>
                            {formatarData(ordemResumo.dataConclusao)} •{' '}
                            {ordemResumo.tecnicoNome || 'Sem técnico'} •{' '}
                            {ordemResumo.linhas.length} serviços
                          </span>
                        </div>

                        <div className="print-client-totals">
                          <span>
                            Serviços:{' '}
                            <strong>{formatarMoeda(ordemResumo.valorServicos)}</strong>
                          </span>
                          <span>
                            Comissão:{' '}
                            <strong>{formatarMoeda(ordemResumo.valorComissoes)}</strong>
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '8px',
                          padding: '5px 8px',
                          borderLeft: '1px solid #bbb',
                          borderRight: '1px solid #bbb',
                          background: '#fafafa',
                        }}
                      >
                        <strong>Veículo:</strong> {veiculo || '-'}
                      </div>

                      <table className="print-table">
                        <thead>
                          <tr>
                            <th>SERVIÇO</th>
                            <th>QTD.</th>
                            <th>VALOR</th>
                            <th>%</th>
                            <th>COMISSÃO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordemResumo.linhas.map(linha => {
                            const servico =
                              linha.servico_titulo ||
                              linha.servico_descricao ||
                              '-'

                            return (
                              <tr key={linha.tarefa_id}>
                                <td>{servico}</td>
                                <td>{Number(linha.quantidade ?? 1).toLocaleString('pt-BR')}</td>
                                <td>{formatarMoeda(linha.valor_servico)}</td>
                                <td>{formatarPercentual(linha.percentual_comissao_os)}</td>
                                <td className="money">
                                  {formatarMoeda(linha.valor_comissao_servico)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </section>
                  )
                })
              )}
            </div>
          ) : (
            <div>
              <div className="print-section-title">SINTÉTICO — TOTAL POR TÉCNICO</div>

              <table className="print-table">
                <thead>
                  <tr>
                    <th>TÉCNICO</th>
                    <th>% COMISSÃO</th>
                    <th>O.S.</th>
                    <th>SERVIÇOS</th>
                    <th>TOTAL EM SERVIÇOS</th>
                    <th>COMISSÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoPorTecnico.map(tecnico => (
                    <tr key={tecnico.id}>
                      <td>{tecnico.nome}</td>
                      <td>{formatarPercentual(tecnico.percentual)}</td>
                      <td>{tecnico.quantidadeOrdens}</td>
                      <td>{tecnico.servicos}</td>
                      <td>{formatarMoeda(tecnico.valorServicos)}</td>
                      <td className="money">{formatarMoeda(tecnico.valorComissoes)}</td>
                    </tr>
                  ))}

                  <tr className="total-row">
                    <td colSpan={4}>TOTAL GERAL</td>
                    <td>{formatarMoeda(resumo.valorServicos)}</td>
                    <td className="money">{formatarMoeda(resumo.valorComissoes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="print-footer">
            <span>MasterTec • Relatório de Comissões</span>
            <span>Peças não entram no cálculo da comissão.</span>
          </div>
        </div>
      </Layout>
    </>
  )
}

const printCss = `
  .print-report-page { display: none; }

  @media print {
    @page { size: A4 portrait; margin: 14mm 12mm 14mm 12mm; }

    html, body { background: #fff !important; }

    body * {
      visibility: hidden !important;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .screen-only { display: none !important; }

    .print-report-page {
      display: block !important;
      visibility: visible !important;
      position: static !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      box-sizing: border-box !important;
      background: #fff !important;
      color: #111 !important;
      padding: 0 !important;
      margin: 0 auto !important;
      overflow: visible !important;
      font-family: Arial, Helvetica, sans-serif !important;
    }

    .print-header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      width: 100%;
      box-sizing: border-box;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .print-report-page * {
      visibility: visible !important;
    }

    .print-brand {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }

    .print-header h1 {
      margin: 4px 0 0;
      font-size: 22px;
      line-height: 1.1;
    }

    .print-subtitle {
      margin-top: 5px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .print-meta {
      min-width: 245px;
      font-size: 10px;
      line-height: 1.55;
      text-align: right;
    }

    .print-summary-grid {
      display: grid;
      width: 100%;
      box-sizing: border-box;
      grid-template-columns: repeat(4, 1fr);
      gap: 7px;
      margin-bottom: 13px;
    }

    .print-summary-grid > div {
      border: 1px solid #bbb;
      padding: 7px;
    }

    .print-summary-grid span {
      display: block;
      font-size: 8px;
      font-weight: 800;
      color: #555;
      margin-bottom: 4px;
    }

    .print-summary-grid strong {
      display: block;
      font-size: 12px;
    }

    .print-section-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      border-bottom: 1px solid #111;
      padding-bottom: 5px;
      margin: 13px 0 8px;
    }

    .print-client-block {
      margin-bottom: 12px;
      break-inside: avoid;
    }

    .print-client-header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      background: #f2f2f2;
      border: 1px solid #bbb;
      border-bottom: 0;
      padding: 7px 8px;
    }

    .print-client-header > div:first-child {
      display: grid;
      gap: 2px;
    }

    .print-client-header strong { font-size: 11px; }

    .print-client-header span {
      font-size: 8px;
      color: #555;
    }

    .print-client-totals {
      display: flex;
      gap: 12px;
      align-items: center;
      font-size: 9px;
      white-space: nowrap;
    }

    .print-table {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      border-collapse: collapse;
      font-size: 8.1px;
      table-layout: fixed;
    }

    .print-table th {
      padding: 5px 4px;
      background: #e9e9e9;
      border: 1px solid #aaa;
      text-align: left;
      font-size: 7.5px;
      font-weight: 900;
    }

    .print-table td {
      padding: 5px 3px;
      border: 1px solid #c8c8c8;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .print-table th:nth-child(1) { width: 46%; }
    .print-table th:nth-child(2) { width: 10%; }
    .print-table th:nth-child(3) { width: 16%; }
    .print-table th:nth-child(4) { width: 10%; }
    .print-table th:nth-child(5) { width: 18%; }

    .print-table .money {
      text-align: right;
      font-weight: 800;
      white-space: nowrap;
    }

    .print-table .total-row td {
      font-weight: 900;
      background: #f0f0f0;
    }

    .print-empty {
      border: 1px solid #ccc;
      padding: 20px;
      text-align: center;
      font-size: 10px;
    }

    .print-footer {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      border-top: 1px solid #aaa;
      margin-top: 14px;
      padding-top: 6px;
      font-size: 8px;
      color: #555;
    }
  }
`

const styles: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    maxWidth: 1250,
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  headerButtons: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  kicker: {
    color: '#e30613',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
  },
  title: {
    margin: '5px 0 4px',
    color: '#fff',
    fontSize: 28,
  },
  muted: {
    margin: 0,
    color: '#8d8d8d',
    lineHeight: 1.5,
    maxWidth: 760,
  },
  card: {
    background: '#111',
    border: '1px solid #2e2e2e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  filterGrid: {
    display: 'grid',
    gap: 14,
  },
  field: {
    display: 'grid',
    gap: 7,
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: 900,
  },
  input: {
    width: '100%',
    minHeight: 44,
    border: '1px solid #3b3b3b',
    borderRadius: 9,
    background: '#1a1a1a',
    color: '#fff',
    padding: '10px 12px',
    outline: 'none',
    boxSizing: 'border-box',
    colorScheme: 'dark',
  },
  secondaryButton: {
    border: '1px solid #444',
    borderRadius: 9,
    background: '#1b1b1b',
    color: '#fff',
    padding: '10px 13px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  printTools: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #292929',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
  printDescription: {
    marginTop: 4,
    color: '#777',
    fontSize: 12,
  },
  printButtons: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  printButton: {
    border: '1px solid #e30613',
    borderRadius: 9,
    background: '#e30613',
    color: '#fff',
    padding: '11px 15px',
    fontWeight: 900,
    cursor: 'pointer',
  },
  printButtonSecondary: {
    border: '1px solid #555',
    borderRadius: 9,
    background: '#222',
    color: '#fff',
    padding: '11px 15px',
    fontWeight: 900,
    cursor: 'pointer',
  },
  error: {
    marginBottom: 18,
    padding: 12,
    border: '1px solid #6f1f1f',
    borderRadius: 9,
    background: '#291010',
    color: '#ff9999',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    background: '#111',
    border: '1px solid #2e2e2e',
    borderRadius: 14,
    padding: 17,
    minHeight: 95,
  },
  summaryLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 900,
    marginTop: 10,
  },
  summaryMoney: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 900,
    marginTop: 12,
    whiteSpace: 'nowrap',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
  },
  countText: {
    marginTop: 4,
    color: '#777',
    fontSize: 12,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 980,
  },
  th: {
    textAlign: 'left',
    padding: '11px 10px',
    color: '#777',
    fontSize: 10,
    fontWeight: 900,
    borderBottom: '1px solid #2e2e2e',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 10px',
    color: '#aaa',
    borderBottom: '1px solid #242424',
    verticalAlign: 'middle',
  },
  tdStrong: {
    padding: '12px 10px',
    color: '#fff',
    borderBottom: '1px solid #242424',
    verticalAlign: 'middle',
    fontWeight: 800,
  },
  cellStrong: {
    color: '#fff',
    fontWeight: 800,
    lineHeight: 1.35,
  },
  cellMuted: {
    color: '#777',
    fontSize: 11,
    marginTop: 3,
  },
  empty: {
    padding: '35px 15px',
    textAlign: 'center',
    color: '#777',
  },
}
