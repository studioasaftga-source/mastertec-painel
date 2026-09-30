import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { CSSProperties } from 'react'

import { useNavigate } from 'react-router-dom'

import Layout from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'

interface OrdemServico {
  id: string
  empresa_id: string
  cliente_id: string | null
  veiculo_id: string | null
  entrada_id: string | null
  responsavel_id: string | null
  numero: number | null
  titulo: string
  descricao: string | null
  status: string
  prioridade: string
  quilometragem_entrada: number | null
  quilometragem_saida: number | null
  data_entrada: string
  data_inicio: string | null
  data_conclusao: string | null
  data_finalizacao: string | null
  observacoes: string | null
  created_at: string
  updated_at: string

  clientes?: {
    nome: string
    telefone: string | null
  } | null

  veiculos?: {
    placa: string
    modelo: string | null
    marca: string | null
    ano: number | null
  } | null

  responsavel?: {
    nome: string
    cargo: string | null
  } | null
}

interface EntradaResumo {
  id: string
  placa: string | null
  ano: number | null
  modelo: string | null
  cliente_nome: string | null
  telefone: string | null
  tipo_entrada: string | null
  tipo_peca: string | null
  descricao_peca: string | null
  observacao: string | null
  frota: string | null
}

type FiltroStatus =
  | 'todos'
  | 'pendente'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada'

type FiltroPrioridade =
  | 'todas'
  | 'baixa'
  | 'normal'
  | 'alta'
  | 'urgente'

export default function OrdensServico() {
  const navigate = useNavigate()

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [entradas, setEntradas] = useState<
    Record<string, EntradaResumo>
  >({})

  const [carregando, setCarregando] =
    useState(true)

  const [atualizando, setAtualizando] =
    useState(false)

  const [erro, setErro] = useState('')

  const [busca, setBusca] = useState('')

  const [statusFiltro, setStatusFiltro] =
    useState<FiltroStatus>('todos')

  const [prioridadeFiltro, setPrioridadeFiltro] =
    useState<FiltroPrioridade>('todas')

  const [dataFiltro, setDataFiltro] =
    useState('')

  const [empresaId, setEmpresaId] =
    useState<string | null>(null)

  // =====================================================
  // CARREGAR ORDENS
  // =====================================================

  const carregarOrdens = useCallback(
    async (empresa?: string) => {
      try {
        setErro('')

        const idEmpresa =
          empresa || empresaId

        if (!idEmpresa) {
          return
        }

        const {
          data,
          error,
        } = await supabase
          .from('ordens_servico')
          .select(
            `
            id,
            empresa_id,
            cliente_id,
            veiculo_id,
            entrada_id,
            responsavel_id,
            numero,
            titulo,
            descricao,
            status,
            prioridade,
            quilometragem_entrada,
            quilometragem_saida,
            data_entrada,
            data_inicio,
            data_conclusao,
            data_finalizacao,
            observacoes,
            created_at,
            updated_at,

            clientes (
              nome,
              telefone
            ),

            veiculos (
              placa,
              modelo,
              marca,
              ano
            ),

            responsavel:usuarios!responsavel_id (
              nome,
              cargo
            )
          `
          )
          .eq(
            'empresa_id',
            idEmpresa
          )
          .order('created_at', {
            ascending: false,
          })

        if (error) {
          throw error
        }

        const ordensCarregadas =
          (data || []) as unknown as OrdemServico[]

        setOrdens(
          ordensCarregadas
        )

        const entradasIds =
          Array.from(
            new Set(
              ordensCarregadas
                .map(
                  ordem =>
                    ordem.entrada_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
            )
          )

        if (
          entradasIds.length ===
          0
        ) {
          setEntradas({})
          return
        }

        const {
          data: dadosEntradas,
          error: erroEntradas,
        } = await supabase
          .from(
            'entradas_veiculos'
          )
          .select(
            `
            id,
            placa,
            ano,
            modelo,
            cliente_nome,
            telefone,
            tipo_entrada,
            tipo_peca,
            descricao_peca,
            observacao,
            frota
          `
          )
          .in(
            'id',
            entradasIds
          )

        if (erroEntradas) {
          console.warn(
            'Não foi possível carregar os dados das entradas das O.S.:',
            erroEntradas
          )

          return
        }

        const mapa: Record<
          string,
          EntradaResumo
        > = {}

        ;(
          dadosEntradas ||
          []
        ).forEach(
          entrada => {
            mapa[
              entrada.id
            ] =
              entrada as EntradaResumo
          }
        )

        setEntradas(mapa)
      } catch (error: any) {
        console.error(
          'Erro ao carregar Ordens de Serviço:',
          error
        )

        setErro(
          error?.message ||
            'Não foi possível carregar as Ordens de Serviço.'
        )
      }
    },
    [empresaId]
  )

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================

  const inicializar =
    useCallback(
      async () => {
        try {
          setCarregando(true)
          setErro('')

          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            throw new Error(
              'Usuário não autenticado.'
            )
          }

          const {
            data: usuario,
            error: usuarioError,
          } = await supabase
            .from('usuarios')
            .select(
              'id, empresa_id'
            )
            .eq(
              'auth_user_id',
              user.id
            )
            .maybeSingle()

          if (usuarioError) {
            throw usuarioError
          }

          if (
            !usuario?.empresa_id
          ) {
            throw new Error(
              'Não foi possível identificar a empresa do usuário.'
            )
          }

          setEmpresaId(
            usuario.empresa_id
          )

          await carregarOrdens(
            usuario.empresa_id
          )
        } catch (
          error: any
        ) {
          console.error(
            'Erro ao inicializar Ordens de Serviço:',
            error
          )

          setErro(
            error?.message ||
              'Não foi possível carregar as Ordens de Serviço.'
          )
        } finally {
          setCarregando(false)
        }
      },
      [carregarOrdens]
    )

  useEffect(() => {
    void inicializar()
  }, [inicializar])

  // =====================================================
  // TEMPO REAL
  // =====================================================

  useEffect(() => {
    if (!empresaId) {
      return
    }

    const canal =
      supabase
        .channel(
          `ordens-servico-${empresaId}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ordens_servico',
            filter: `empresa_id=eq.${empresaId}`,
          },
          () => {
            void carregarOrdens(
              empresaId
            )
          }
        )
        .subscribe()

    return () => {
      void supabase.removeChannel(
        canal
      )
    }
  }, [
    empresaId,
    carregarOrdens,
  ])

  // =====================================================
  // ATUALIZAR
  // =====================================================

  async function atualizarLista() {
    if (!empresaId) {
      return
    }

    try {
      setAtualizando(true)

      await carregarOrdens(
        empresaId
      )
    } finally {
      setAtualizando(false)
    }
  }

  // =====================================================
  // DADOS DA ENTRADA
  // =====================================================

  function obterEntrada(
    os: OrdemServico
  ) {
    if (!os.entrada_id) {
      return null
    }

    return (
      entradas[
        os.entrada_id
      ] || null
    )
  }

  function obterCliente(
    os: OrdemServico
  ) {
    const entrada =
      obterEntrada(os)

    return (
      entrada?.cliente_nome?.trim() ||
      os.clientes?.nome?.trim() ||
      'Cliente não informado'
    )
  }

  function ehPeca(
    os: OrdemServico
  ) {
    const entrada =
      obterEntrada(os)

    const tipo =
      entrada?.tipo_entrada
        ?.trim()
        .toLowerCase()

    return (
      tipo === 'peca' ||
      tipo === 'peça'
    )
  }

  function obterDescricaoEntrada(
    os: OrdemServico
  ) {
    const entrada =
      obterEntrada(os)

    if (!entrada) {
      return formatarVeiculo(
        os
      )
    }

    if (ehPeca(os)) {
      const tipoPeca =
        entrada.tipo_peca
          ?.trim()

      const descricao =
        entrada.descricao_peca
          ?.trim()

      if (
        tipoPeca &&
        descricao
      ) {
        return `${formatarTipoPeca(
          tipoPeca
        )} • ${descricao}`
      }

      if (descricao) {
        return descricao
      }

      if (tipoPeca) {
        return formatarTipoPeca(
          tipoPeca
        )
      }

      return 'Entrada de peça'
    }

    const partes = [
      entrada.modelo?.trim(),
      entrada.placa?.trim(),
    ].filter(Boolean)

    if (entrada.ano) {
      partes.push(
        String(
          entrada.ano
        )
      )
    }

    return (
      partes.join(
        ' • '
      ) ||
      formatarVeiculo(os)
    )
  }

  function obterTipoEntrada(
    os: OrdemServico
  ) {
    const entrada =
      obterEntrada(os)

    if (!entrada) {
      return 'O.S.'
    }

    return ehPeca(os)
      ? 'PEÇA'
      : 'VEÍCULO'
  }

  // =====================================================
  // FILTROS
  // =====================================================

  const ordensFiltradas =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase()

      return ordens.filter(
        os => {
          const entrada =
            obterEntrada(os)

          if (termo) {
            const numero =
              os.numero
                ? String(
                    os.numero
                  )
                : ''

            const cliente =
              obterCliente(os)

            const placa =
              entrada?.placa ||
              os.veiculos?.placa ||
              ''

            const modelo =
              entrada?.modelo ||
              os.veiculos
                ?.modelo ||
              ''

            const tecnico =
              os.responsavel
                ?.nome || ''

            const descricaoEntrada =
              obterDescricaoEntrada(
                os
              )

            const textoBusca = [
              numero,
              os.titulo,
              os.descricao ||
                '',
              cliente,
              placa,
              modelo,
              tecnico,
              descricaoEntrada,
            ]
              .join(' ')
              .toLowerCase()

            if (
              !textoBusca.includes(
                termo
              )
            ) {
              return false
            }
          }

          if (
            statusFiltro !==
              'todos' &&
            normalizarStatus(
              os.status
            ) !==
              normalizarStatus(
                statusFiltro
              )
          ) {
            return false
          }

          if (
            prioridadeFiltro !==
              'todas' &&
            normalizarPrioridade(
              os.prioridade
            ) !==
              normalizarPrioridade(
                prioridadeFiltro
              )
          ) {
            return false
          }

          if (dataFiltro) {
            const dataOS =
              formatarDataInput(
                os.data_entrada
              )

            if (
              dataOS !==
              dataFiltro
            ) {
              return false
            }
          }

          return true
        }
      )
    }, [
      ordens,
      entradas,
      busca,
      statusFiltro,
      prioridadeFiltro,
      dataFiltro,
    ])

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  const estatisticas =
    useMemo(() => {
      const total =
        ordens.length

      const pendentes =
        ordens.filter(
          os =>
            normalizarStatus(
              os.status
            ) ===
            'pendente'
        ).length

      const andamento =
        ordens.filter(
          os =>
            normalizarStatus(
              os.status
            ) ===
            'em_andamento'
        ).length

      const concluidas =
        ordens.filter(
          os =>
            normalizarStatus(
              os.status
            ) ===
            'concluida'
        ).length

      const urgentes =
        ordens.filter(
          os =>
            normalizarPrioridade(
              os.prioridade
            ) ===
            'urgente'
        ).length

      return {
        total,
        pendentes,
        andamento,
        concluidas,
        urgentes,
      }
    }, [ordens])

  // =====================================================
  // NAVEGAÇÃO
  // =====================================================

  function abrirOS(
    id: string
  ) {
    navigate(
      `/ordens/${id}`
    )
  }

  function novaOS() {
    navigate(
      '/ordens/nova'
    )
  }

  function limparFiltros() {
    setBusca('')
    setStatusFiltro(
      'todos'
    )
    setPrioridadeFiltro(
      'todas'
    )
    setDataFiltro('')
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (carregando) {
    return (
      <Layout>
        <div
          style={
            styles.loadingContainer
          }
        >
          <div
            style={
              styles.spinner
            }
          />

          <p
            style={
              styles.loadingText
            }
          >
            Carregando O.S....
          </p>
        </div>
      </Layout>
    )
  }

  // =====================================================
  // TELA
  // =====================================================

  return (
    <Layout>
      <div
        style={
          styles.page
        }
      >
        <div
          style={
            styles.topAccent
          }
        />

        <div
          style={
            styles.header
          }
        >
          <div
            style={
              styles.headerContent
            }
          >
            <div
              style={
                styles.kicker
              }
            >
              OFICINA
            </div>

            <h1
              style={
                styles.title
              }
            >
              Ordens de Serviço
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Acompanhe as O.S. abertas, em andamento e concluídas.
            </p>
          </div>

          <button
            type="button"
            onClick={
              novaOS
            }
            style={
              styles.newButton
            }
          >
            <span
              style={
                styles.newButtonIcon
              }
            >
              +
            </span>

            Nova O.S.
          </button>
        </div>

        {erro && (
          <div
            style={
              styles.errorBox
            }
          >
            <strong>
              Erro ao carregar:
            </strong>{' '}
            {erro}
          </div>
        )}

        <div
          style={
            styles.statsGrid
          }
        >
          <StatCard
            icon="📋"
            label="Total de O.S."
            value={
              estatisticas.total
            }
            accent="neutral"
            onClick={() => {
              setStatusFiltro(
                'todos'
              )
            }}
          />

          <StatCard
            icon="🟡"
            label="Pendentes"
            value={
              estatisticas.pendentes
            }
            accent="yellow"
            onClick={() => {
              setStatusFiltro(
                'pendente'
              )
            }}
          />

          <StatCard
            icon="🔵"
            label="Em andamento"
            value={
              estatisticas.andamento
            }
            accent="blue"
            onClick={() => {
              setStatusFiltro(
                'em_andamento'
              )
            }}
          />

          <StatCard
            icon="🟢"
            label="Concluídas"
            value={
              estatisticas.concluidas
            }
            accent="green"
            onClick={() => {
              setStatusFiltro(
                'concluida'
              )
            }}
          />

          <StatCard
            icon="🔴"
            label="Urgentes"
            value={
              estatisticas.urgentes
            }
            accent="red"
            onClick={() => {
              setPrioridadeFiltro(
                'urgente'
              )
            }}
          />
        </div>

        <section
          style={
            styles.filtersCard
          }
        >
          <div
            style={
              styles.filtersHeader
            }
          >
            <div>
              <div
                style={
                  styles.sectionKicker
                }
              >
                CONSULTA
              </div>

              <h2
                style={
                  styles.filtersTitle
                }
              >
                Filtros
              </h2>

              <p
                style={
                  styles.filtersSubtitle
                }
              >
                Encontre rapidamente uma O.S.
              </p>
            </div>

            <button
              type="button"
              onClick={
                atualizarLista
              }
              style={{
                ...styles.refreshButton,
                opacity:
                  atualizando
                    ? 0.6
                    : 1,
              }}
              disabled={
                atualizando
              }
            >
              {atualizando
                ? 'Atualizando...'
                : '↻ Atualizar'}
            </button>
          </div>

          <div
            style={
              styles.filtersGrid
            }
          >
            <div
              style={
                styles.searchWrapper
              }
            >
              <span
                style={
                  styles.searchIcon
                }
              >
                🔎
              </span>

              <input
                type="text"
                value={
                  busca
                }
                onChange={event =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar por O.S., cliente, placa, veículo ou técnico..."
                style={
                  styles.searchInput
                }
              />
            </div>

            <select
              value={
                statusFiltro
              }
              onChange={event =>
                setStatusFiltro(
                  event.target.value as FiltroStatus
                )
              }
              style={
                styles.select
              }
            >
              <option value="todos">
                Todos os status
              </option>

              <option value="pendente">
                Pendente
              </option>

              <option value="em_andamento">
                Em andamento
              </option>

              <option value="concluida">
                Concluída
              </option>

              <option value="cancelada">
                Cancelada
              </option>
            </select>

            <select
              value={
                prioridadeFiltro
              }
              onChange={event =>
                setPrioridadeFiltro(
                  event.target.value as FiltroPrioridade
                )
              }
              style={
                styles.select
              }
            >
              <option value="todas">
                Todas as prioridades
              </option>

              <option value="baixa">
                Baixa
              </option>

              <option value="normal">
                Normal
              </option>

              <option value="alta">
                Alta
              </option>

              <option value="urgente">
                Urgente
              </option>
            </select>

            <input
              type="date"
              value={
                dataFiltro
              }
              onChange={event =>
                setDataFiltro(
                  event.target.value
                )
              }
              style={
                styles.select
              }
            />
          </div>

          {(
            busca ||
            statusFiltro !==
              'todos' ||
            prioridadeFiltro !==
              'todas' ||
            dataFiltro
          ) && (
            <div
              style={
                styles.activeFilters
              }
            >
              <span
                style={
                  styles.resultText
                }
              >
                <strong>
                  {
                    ordensFiltradas.length
                  }
                </strong>{' '}
                {ordensFiltradas.length ===
                1
                  ? 'O.S. encontrada'
                  : 'O.S. encontradas'}
              </span>

              <button
                type="button"
                onClick={
                  limparFiltros
                }
                style={
                  styles.clearButton
                }
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>

        <section
          style={
            styles.listCard
          }
        >
          <div
            style={
              styles.listHeader
            }
          >
            <div>
              <div
                style={
                  styles.sectionKicker
                }
              >
                LISTAGEM
              </div>

              <h2
                style={
                  styles.listTitle
                }
              >
                Ordens de Serviço
              </h2>

              <p
                style={
                  styles.listSubtitle
                }
              >
                {
                  ordensFiltradas.length
                }{' '}
                {ordensFiltradas.length ===
                1
                  ? 'O.S. encontrada'
                  : 'O.S. encontradas'}
              </p>
            </div>

            <div
              style={
                styles.listCount
              }
            >
              {
                ordensFiltradas.length
              }
            </div>
          </div>

          {ordensFiltradas.length ===
          0 ? (
            <EmptyState
              possuiFiltros={
                Boolean(
                  busca
                ) ||
                statusFiltro !==
                  'todos' ||
                prioridadeFiltro !==
                  'todas' ||
                Boolean(
                  dataFiltro
                )
              }
              onNovaOS={
                novaOS
              }
              onLimpar={
                limparFiltros
              }
            />
          ) : (
            <div
              style={
                styles.desktopList
              }
            >
              <div
                style={
                  styles.tableHeader
                }
              >
                <div>
                  O.S.
                </div>

                <div>
                  Cliente
                </div>

                <div>
                  Entrada / Serviço
                </div>

                <div>
                  Técnico
                </div>

                <div>
                  Status
                </div>

                <div>
                  Entrada
                </div>

                <div />
              </div>

              {ordensFiltradas.map(
                os => {
                  const entrada =
                    obterEntrada(
                      os
                    )

                  return (
                    <div
                      key={
                        os.id
                      }
                      style={
                        styles.tableRow
                      }
                      onClick={() =>
                        abrirOS(
                          os.id
                        )
                      }
                    >
                      <div>
                        <div
                          style={
                            styles.osNumber
                          }
                        >
                          {os.numero
                            ? `#${os.numero}`
                            : 'Sem número'}
                        </div>

                        <div
                          style={
                            styles.priorityWrapper
                          }
                        >
                          <PriorityBadge
                            prioridade={
                              os.prioridade
                            }
                          />
                        </div>
                      </div>

                      <div
                        style={
                          styles.clientCell
                        }
                      >
                        <strong
                          style={
                            styles.clientName
                          }
                        >
                          {
                            obterCliente(
                              os
                            )
                          }
                        </strong>

                        {entrada?.telefone && (
                          <span
                            style={
                              styles.secondaryText
                            }
                          >
                            {
                              entrada.telefone
                            }
                          </span>
                        )}
                      </div>

                      <div
                        style={
                          styles.entryCell
                        }
                      >
                        <div
                          style={
                            styles.entryTypeBadge
                          }
                        >
                          {
                            obterTipoEntrada(
                              os
                            )
                          }
                        </div>

                        <strong
                          style={
                            styles.entryTitle
                          }
                        >
                          {
                            obterDescricaoEntrada(
                              os
                            )
                          }
                        </strong>

                        {os.titulo && (
                          <span
                            style={
                              styles.descriptionText
                            }
                          >
                            {os.titulo}
                          </span>
                        )}
                      </div>

                      <div
                        style={
                          styles.technicianCell
                        }
                      >
                        {os.responsavel
                          ?.nome ? (
                          <>
                            <div
                              style={
                                styles.technicianAvatar
                              }
                            >
                              {iniciais(
                                os.responsavel.nome
                              )}
                            </div>

                            <div
                              style={
                                styles.technicianInfo
                              }
                            >
                              <strong>
                                {
                                  os.responsavel
                                    .nome
                                }
                              </strong>

                              {os
                                .responsavel
                                .cargo && (
                                <span>
                                  {
                                    os
                                      .responsavel
                                      .cargo
                                  }
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span
                            style={
                              styles.notAssigned
                            }
                          >
                            Não atribuído
                          </span>
                        )}
                      </div>

                      <div>
                        <StatusBadge
                          status={
                            os.status
                          }
                        />
                      </div>

                      <div
                        style={
                          styles.dateCell
                        }
                      >
                        <strong>
                          {formatarData(
                            os.data_entrada
                          )}
                        </strong>

                        <span>
                          {formatarHora(
                            os.data_entrada
                          )}
                        </span>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation()

                            abrirOS(
                              os.id
                            )
                          }}
                          style={
                            styles.viewButton
                          }
                        >
                          Abrir
                          <span>
                            →
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>

        <div
          style={
            styles.footerNote
          }
        >
          MasterTec • Gestão de Ordens de Serviço
        </div>
      </div>
    </Layout>
  )
}

/* =========================================================
   COMPONENTES
========================================================= */

function StatCard({
  icon,
  label,
  value,
  accent,
  onClick,
}: {
  icon: string
  label: string
  value: number
  accent:
    | 'neutral'
    | 'yellow'
    | 'blue'
    | 'green'
    | 'red'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={
        styles.statCard
      }
    >
      <div
        style={{
          ...styles.statIcon,
          borderColor:
            getAccentColor(
              accent
            ),
        }}
      >
        {icon}
      </div>

      <div
        style={
          styles.statContent
        }
      >
        <span
          style={
            styles.statLabel
          }
        >
          {label}
        </span>

        <strong
          style={
            styles.statValue
          }
        >
          {value}
        </strong>
      </div>
    </button>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const normalizado =
    normalizarStatus(
      status
    )

  const configuracoes: Record<
    string,
    {
      label: string
      background: string
      color: string
      dot: string
    }
  > = {
    pendente: {
      label: 'Pendente',
      background:
        '#fff7ed',
      color:
        '#c2410c',
      dot:
        '#f59e0b',
    },

    aberta: {
      label: 'Aberta',
      background:
        '#f3f4f6',
      color:
        '#374151',
      dot:
        '#6b7280',
    },

    em_andamento: {
      label:
        'Em andamento',
      background:
        '#eff6ff',
      color:
        '#1d4ed8',
      dot:
        '#3b82f6',
    },

    servico_finalizado: {
      label:
        'Serviço finalizado',
      background:
        '#fef3c7',
      color:
        '#92400e',
      dot:
        '#f59e0b',
    },

    aguardando_aprovacao: {
      label:
        'Aguardando aprovação',
      background:
        '#fef3c7',
      color:
        '#92400e',
      dot:
        '#f59e0b',
    },

    concluida: {
      label:
        'Concluída',
      background:
        '#ecfdf5',
      color:
        '#166534',
      dot:
        '#22c55e',
    },

    encerrada: {
      label:
        'Encerrada',
      background:
        '#ecfdf5',
      color:
        '#166534',
      dot:
        '#22c55e',
    },

    cancelada: {
      label:
        'Cancelada',
      background:
        '#fef2f2',
      color:
        '#991b1b',
      dot:
        '#ef4444',
    },
  }

  const config =
    configuracoes[
      normalizado
    ] || {
      label:
        formatarStatus(
          status
        ),
      background:
        '#f3f4f6',
      color:
        '#374151',
      dot:
        '#6b7280',
    }

  return (
    <span
      style={{
        ...styles.statusBadge,
        background:
          config.background,
        color:
          config.color,
      }}
    >
      <span
        style={{
          ...styles.statusDot,
          background:
            config.dot,
        }}
      />

      {config.label}
    </span>
  )
}

function PriorityBadge({
  prioridade,
}: {
  prioridade: string
}) {
  const normalizado =
    normalizarPrioridade(
      prioridade
    )

  const configuracoes: Record<
    string,
    {
      label: string
      background: string
      color: string
    }
  > = {
    baixa: {
      label: 'Baixa',
      background:
        '#f3f4f6',
      color:
        '#4b5563',
    },

    normal: {
      label: 'Normal',
      background:
        '#f3f4f6',
      color:
        '#374151',
    },

    alta: {
      label: 'Alta',
      background:
        '#fff7ed',
      color:
        '#c2410c',
    },

    urgente: {
      label: 'Urgente',
      background:
        '#fef2f2',
      color:
        '#b91c1c',
    },
  }

  const config =
    configuracoes[
      normalizado
    ] || {
      label:
        formatarPrioridade(
          prioridade
        ),
      background:
        '#f3f4f6',
      color:
        '#374151',
    }

  return (
    <span
      style={{
        ...styles.priorityBadge,
        background:
          config.background,
        color:
          config.color,
      }}
    >
      {normalizado ===
      'urgente'
        ? '⚠ '
        : ''}
      {
        config.label
      }
    </span>
  )
}

function EmptyState({
  possuiFiltros,
  onNovaOS,
  onLimpar,
}: {
  possuiFiltros: boolean
  onNovaOS: () => void
  onLimpar: () => void
}) {
  return (
    <div
      style={
        styles.emptyState
      }
    >
      <div
        style={
          styles.emptyStateIcon
        }
      >
        📋
      </div>

      <h3
        style={
          styles.emptyStateTitle
        }
      >
        {possuiFiltros
          ? 'Nenhuma O.S. encontrada'
          : 'Nenhuma Ordem de Serviço'}
      </h3>

      <p
        style={
          styles.emptyStateText
        }
      >
        {possuiFiltros
          ? 'Tente alterar os filtros para encontrar outras ordens.'
          : 'As Ordens de Serviço criadas aparecerão aqui.'}
      </p>

      {possuiFiltros ? (
        <button
          type="button"
          onClick={
            onLimpar
          }
          style={
            styles.emptyButton
          }
        >
          Limpar filtros
        </button>
      ) : (
        <button
          type="button"
          onClick={
            onNovaOS
          }
          style={
            styles.emptyButton
          }
        >
          + Criar primeira O.S.
        </button>
      )}
    </div>
  )
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function normalizarStatus(
  status: string
) {
  return (
    status || ''
  )
    .toLowerCase()
    .trim()
    .replace(
      /[\s-]+/g,
      '_'
    )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
}

function normalizarPrioridade(
  prioridade: string
) {
  return (
    prioridade || ''
  )
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
}

function formatarStatus(
  status: string
) {
  const normalizado =
    normalizarStatus(
      status
    )

  const nomes: Record<
    string,
    string
  > = {
    pendente:
      'Pendente',

    aberta:
      'Aberta',

    em_andamento:
      'Em andamento',

    servico_finalizado:
      'Serviço finalizado',

    aguardando_aprovacao:
      'Aguardando aprovação',

    concluida:
      'Concluída',

    encerrada:
      'Encerrada',

    cancelada:
      'Cancelada',
  }

  return (
    nomes[
      normalizado
    ] ||
    status ||
    'Não informado'
  )
}

function formatarPrioridade(
  prioridade: string
) {
  const normalizado =
    normalizarPrioridade(
      prioridade
    )

  const nomes: Record<
    string,
    string
  > = {
    baixa:
      'Baixa',

    normal:
      'Normal',

    alta:
      'Alta',

    urgente:
      'Urgente',
  }

  return (
    nomes[
      normalizado
    ] ||
    prioridade ||
    'Normal'
  )
}

function formatarTipoPeca(
  tipo: string
) {
  return tipo
    .replace(
      /_/g,
      ' '
    )
    .toLocaleUpperCase(
      'pt-BR'
    )
}

function formatarVeiculo(
  os: OrdemServico
) {
  const veiculo =
    os.veiculos

  if (!veiculo) {
    return 'Entrada não informada'
  }

  const partes = [
    veiculo.marca,
    veiculo.modelo,
    veiculo.placa,
  ].filter(Boolean)

  if (veiculo.ano) {
    partes.push(
      String(
        veiculo.ano
      )
    )
  }

  return (
    partes.join(
      ' • '
    ) ||
    'Veículo'
  )
}

function formatarData(
  data: string
) {
  if (!data) {
    return '-'
  }

  const date =
    new Date(data)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ).format(date)
}

function formatarHora(
  data: string
) {
  if (!data) {
    return '-'
  }

  const date =
    new Date(data)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date)
}

function formatarDataInput(
  data: string
) {
  if (!data) {
    return ''
  }

  const date =
    new Date(data)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  const ano =
    date.getFullYear()

  const mes =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    )

  const dia =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${ano}-${mes}-${dia}`
}

function iniciais(
  nome: string
) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(
      0,
      2
    )
    .map(
      parte =>
        parte[0]
    )
    .join('')
    .toUpperCase()
}

function getAccentColor(
  accent:
    | 'neutral'
    | 'yellow'
    | 'blue'
    | 'green'
    | 'red'
) {
  const cores = {
    neutral:
      '#e30613',
    yellow:
      '#f59e0b',
    blue:
      '#3b82f6',
    green:
      '#22c55e',
    red:
      '#e30613',
  }

  return cores[
    accent
  ]
}

/* =========================================================
   ESTILOS
========================================================= */

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    width: '100%',
    maxWidth: 1500,
    margin: '0 auto',
    padding:
      '22px 24px 40px',
    boxSizing:
      'border-box',
  },

  topAccent: {
    height: 3,
    width: 56,
    marginBottom: 18,
    borderRadius: 999,
    background:
      '#e30613',
  },

  header: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems:
      'flex-end',
    gap: 20,
    marginBottom: 24,
  },

  headerContent: {
    minWidth: 0,
  },

  kicker: {
    color:
      '#e30613',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing:
      1.5,
    textTransform:
      'uppercase',
    marginBottom: 5,
  },

  title: {
    margin: 0,
    color:
      '#111827',
    fontSize: 30,
    fontWeight: 900,
    letterSpacing:
      -0.5,
  },

  subtitle: {
    margin:
      '7px 0 0',
    color:
      '#6b7280',
    fontSize: 14,
  },

  newButton: {
    display: 'inline-flex',
    alignItems:
      'center',
    gap: 8,
    minHeight: 44,
    padding:
      '0 17px',
    border: 'none',
    borderRadius: 9,
    background:
      '#e30613',
    color:
      '#ffffff',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow:
      '0 8px 20px rgba(227, 6, 19, 0.20)',
    whiteSpace:
      'nowrap',
  },

  newButtonIcon: {
    fontSize: 21,
    lineHeight: 1,
    fontWeight: 500,
  },

  errorBox: {
    marginBottom: 18,
    padding: 14,
    border:
      '1px solid #fecaca',
    borderLeft:
      '4px solid #e30613',
    borderRadius: 10,
    background:
      '#fff7f7',
    color:
      '#991b1b',
    fontSize: 13,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(5, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 18,
  },

  statCard: {
    display: 'flex',
    alignItems:
      'center',
    gap: 12,
    minHeight: 78,
    padding:
      '12px 14px',
    border:
      '1px solid #e5e7eb',
    borderRadius: 12,
    background:
      '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow:
      '0 4px 14px rgba(17, 24, 39, 0.05)',
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    border:
      '1px solid',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    background:
      '#fafafa',
    fontSize: 19,
    flexShrink: 0,
  },

  statContent: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 2,
  },

  statLabel: {
    color:
      '#6b7280',
    fontSize: 11,
    fontWeight: 700,
  },

  statValue: {
    color:
      '#111827',
    fontSize: 22,
    fontWeight: 900,
  },

  filtersCard: {
    padding: 18,
    marginBottom: 18,
    border:
      '1px solid #e5e7eb',
    borderRadius: 12,
    background:
      '#ffffff',
    boxShadow:
      '0 4px 14px rgba(17, 24, 39, 0.04)',
  },

  filtersHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems:
      'center',
    gap: 15,
    marginBottom: 15,
  },

  sectionKicker: {
    color:
      '#e30613',
    fontSize: 9,
    fontWeight: 900,
    letterSpacing:
      1.3,
    marginBottom: 3,
  },

  filtersTitle: {
    margin: 0,
    color:
      '#111827',
    fontSize: 17,
    fontWeight: 900,
  },

  filtersSubtitle: {
    margin:
      '3px 0 0',
    color:
      '#6b7280',
    fontSize: 12,
  },

  refreshButton: {
    minHeight: 37,
    padding:
      '0 13px',
    border:
      '1px solid #d1d5db',
    borderRadius: 8,
    background:
      '#ffffff',
    color:
      '#374151',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(280px, 2fr) repeat(3, minmax(145px, 1fr))',
    gap: 9,
  },

  searchWrapper: {
    position:
      'relative',
    width: '100%',
  },

  searchIcon: {
    position:
      'absolute',
    left: 12,
    top: '50%',
    transform:
      'translateY(-50%)',
    fontSize: 14,
    pointerEvents:
      'none',
  },

  searchInput: {
    width: '100%',
    minHeight: 40,
    boxSizing:
      'border-box',
    padding:
      '0 12px 0 36px',
    border:
      '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    fontSize: 12,
    color:
      '#111827',
    background:
      '#ffffff',
  },

  select: {
    width: '100%',
    minHeight: 40,
    boxSizing:
      'border-box',
    padding:
      '0 10px',
    border:
      '1px solid #d1d5db',
    borderRadius: 8,
    background:
      '#ffffff',
    color:
      '#374151',
    outline: 'none',
    fontSize: 12,
  },

  activeFilters: {
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTop:
      '1px solid #f0f0f0',
  },

  resultText: {
    color:
      '#6b7280',
    fontSize: 12,
  },

  clearButton: {
    border: 'none',
    background:
      'transparent',
    color:
      '#e30613',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 12,
  },

  listCard: {
    background:
      '#ffffff',
    border:
      '1px solid #e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow:
      '0 4px 14px rgba(17, 24, 39, 0.05)',
  },

  listHeader: {
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    gap: 16,
    padding:
      '17px 18px',
    borderBottom:
      '1px solid #e5e7eb',
  },

  listTitle: {
    margin: 0,
    color:
      '#111827',
    fontSize: 17,
    fontWeight: 900,
  },

  listSubtitle: {
    margin:
      '4px 0 0',
    color:
      '#6b7280',
    fontSize: 11,
  },

  listCount: {
    minWidth: 40,
    height: 40,
    padding:
      '0 10px',
    borderRadius: 10,
    background:
      '#fff1f2',
    color:
      '#e30613',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    fontSize: 14,
    fontWeight: 900,
  },

  desktopList: {
    width: '100%',
    overflowX: 'auto',
  },

  tableHeader: {
    display: 'grid',
    gridTemplateColumns:
      '85px minmax(170px, 1fr) minmax(220px, 1.35fr) minmax(150px, 0.9fr) 145px 100px 70px',
    gap: 12,
    alignItems:
      'center',
    minWidth: 980,
    padding:
      '10px 18px',
    background:
      '#fafafa',
    borderBottom:
      '1px solid #ececec',
    color:
      '#9ca3af',
    fontSize: 9,
    fontWeight: 900,
    textTransform:
      'uppercase',
    letterSpacing:
      0.8,
  },

  tableRow: {
    display: 'grid',
    gridTemplateColumns:
      '85px minmax(170px, 1fr) minmax(220px, 1.35fr) minmax(150px, 0.9fr) 145px 100px 70px',
    gap: 12,
    alignItems:
      'center',
    minWidth: 980,
    padding:
      '14px 18px',
    borderBottom:
      '1px solid #f0f0f0',
    cursor:
      'pointer',
    transition:
      'background 0.15s ease',
  },

  osNumber: {
    color:
      '#111827',
    fontWeight: 900,
    fontSize: 14,
  },

  priorityWrapper: {
    marginTop: 6,
  },

  priorityBadge: {
    display:
      'inline-flex',
    alignItems:
      'center',
    width: 'fit-content',
    padding:
      '4px 7px',
    borderRadius: 5,
    fontSize: 9,
    fontWeight: 900,
    whiteSpace:
      'nowrap',
  },

  clientCell: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 4,
    minWidth: 0,
  },

  clientName: {
    color:
      '#111827',
    fontSize: 13,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  secondaryText: {
    color:
      '#9ca3af',
    fontSize: 10,
  },

  entryCell: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 4,
    minWidth: 0,
  },

  entryTypeBadge: {
    width: 'fit-content',
    padding:
      '3px 6px',
    borderRadius: 5,
    background:
      '#f3f4f6',
    color:
      '#4b5563',
    fontSize: 8,
    fontWeight: 900,
    letterSpacing:
      0.6,
  },

  entryTitle: {
    color:
      '#111827',
    fontSize: 12,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  descriptionText: {
    color:
      '#6b7280',
    fontSize: 10,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  technicianCell: {
    display: 'flex',
    alignItems:
      'center',
    gap: 8,
    minWidth: 0,
  },

  technicianInfo: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 2,
    minWidth: 0,
    fontSize: 11,
  },

  technicianAvatar: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius:
      '50%',
    background:
      '#fff1f2',
    color:
      '#e30613',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    fontSize: 9,
    fontWeight: 900,
  },

  notAssigned: {
    color:
      '#9ca3af',
    fontSize: 10,
  },

  statusBadge: {
    display:
      'inline-flex',
    alignItems:
      'center',
    gap: 6,
    width: 'fit-content',
    padding:
      '6px 8px',
    borderRadius: 6,
    fontSize: 9,
    fontWeight: 900,
    whiteSpace:
      'nowrap',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius:
      '50%',
  },

  dateCell: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 2,
    color:
      '#4b5563',
    fontSize: 10,
  },

  viewButton: {
    display: 'inline-flex',
    alignItems:
      'center',
    gap: 4,
    border: 'none',
    background:
      'transparent',
    color:
      '#e30613',
    fontSize: 11,
    fontWeight: 900,
    cursor:
      'pointer',
  },

  emptyState: {
    minHeight: 300,
    padding: 30,
    display: 'flex',
    flexDirection:
      'column',
    alignItems:
      'center',
    justifyContent:
      'center',
    textAlign:
      'center',
  },

  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background:
      '#fff1f2',
    color:
      '#e30613',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    fontSize: 29,
    marginBottom: 14,
  },

  emptyStateTitle: {
    margin: 0,
    color:
      '#111827',
    fontSize: 17,
    fontWeight: 900,
  },

  emptyStateText: {
    maxWidth: 420,
    margin:
      '7px 0 17px',
    color:
      '#6b7280',
    fontSize: 13,
    lineHeight: 1.5,
  },

  emptyButton: {
    minHeight: 40,
    padding:
      '0 15px',
    border: 'none',
    borderRadius: 8,
    background:
      '#e30613',
    color:
      '#ffffff',
    fontWeight: 800,
    cursor:
      'pointer',
  },

  footerNote: {
    marginTop: 16,
    textAlign:
      'center',
    color:
      '#9ca3af',
    fontSize: 10,
  },

  loadingContainer: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection:
      'column',
    alignItems:
      'center',
    justifyContent:
      'center',
    gap: 12,
  },

  spinner: {
    width: 34,
    height: 34,
    border:
      '4px solid #ececec',
    borderTopColor:
      '#e30613',
    borderRadius:
      '50%',
  },

  loadingText: {
    color:
      '#6b7280',
    fontSize: 13,
  },
}