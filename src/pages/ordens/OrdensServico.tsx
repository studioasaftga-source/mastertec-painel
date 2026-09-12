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
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')

  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] =
    useState<FiltroStatus>('todos')

  const [prioridadeFiltro, setPrioridadeFiltro] =
    useState<FiltroPrioridade>('todas')

  const [dataFiltro, setDataFiltro] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  // =====================================================
  // CARREGAR ORDENS
  // =====================================================

  const carregarOrdens = useCallback(
    async (empresa?: string) => {
      try {
        setErro('')

        const idEmpresa = empresa || empresaId

        if (!idEmpresa) {
          return
        }

        const { data, error } = await supabase
          .from('ordens_servico')
          .select(
            `
            id,
            empresa_id,
            cliente_id,
            veiculo_id,
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
          .eq('empresa_id', idEmpresa)
          .order('created_at', {
            ascending: false,
          })

        if (error) {
          throw error
        }

        setOrdens(
          (data || []) as unknown as OrdemServico[]
        )
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

  const inicializar = useCallback(async () => {
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
        .select('id, empresa_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (usuarioError) {
        throw usuarioError
      }

      if (!usuario?.empresa_id) {
        throw new Error(
          'Não foi possível identificar a empresa do usuário.'
        )
      }

      setEmpresaId(usuario.empresa_id)

      await carregarOrdens(
        usuario.empresa_id
      )
    } catch (error: any) {
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
  }, [carregarOrdens])

  useEffect(() => {
    inicializar()
  }, [inicializar])

  // =====================================================
  // TEMPO REAL
  // =====================================================

  useEffect(() => {
    if (!empresaId) {
      return
    }

    const canal = supabase
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
          carregarOrdens(empresaId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [empresaId, carregarOrdens])

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
  // FILTROS
  // =====================================================

  const ordensFiltradas = useMemo(() => {
    const termo =
      busca.trim().toLowerCase()

    return ordens.filter((os) => {
      if (termo) {
        const numero = os.numero
          ? String(os.numero)
          : ''

        const cliente =
          os.clientes?.nome || ''

        const placa =
          os.veiculos?.placa || ''

        const modelo =
          os.veiculos?.modelo || ''

        const tecnico =
          os.responsavel?.nome || ''

        const textoBusca = [
          numero,
          os.titulo,
          os.descricao || '',
          cliente,
          placa,
          modelo,
          tecnico,
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
    })
  }, [
    ordens,
    busca,
    statusFiltro,
    prioridadeFiltro,
    dataFiltro,
  ])

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  const estatisticas = useMemo(() => {
    const total =
      ordens.length

    const pendentes =
      ordens.filter(
        (os) =>
          normalizarStatus(
            os.status
          ) ===
          'pendente'
      ).length

    const andamento =
      ordens.filter(
        (os) =>
          normalizarStatus(
            os.status
          ) ===
          'em_andamento'
      ).length

    const concluidas =
      ordens.filter(
        (os) =>
          normalizarStatus(
            os.status
          ) ===
          'concluida'
      ).length

    const urgentes =
      ordens.filter(
        (os) =>
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

  function abrirOS(id: string) {
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
            Carregando Ordens de Serviço...
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
        {/* CABEÇALHO */}

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
              Gerencie as ordens, serviços e técnicos
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
            + Nova OS
          </button>
        </div>

        {/* ERRO */}

        {erro && (
          <div
            style={
              styles.errorBox
            }
          >
            <strong>
              Erro:
            </strong>{' '}
            {erro}
          </div>
        )}

        {/* ESTATÍSTICAS */}

        <div
          style={
            styles.statsGrid
          }
        >
          <StatCard
            icon="📋"
            label="Total"
            value={
              estatisticas.total
            }
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
            onClick={() => {
              setPrioridadeFiltro(
                'urgente'
              )
            }}
          />
        </div>

        {/* FILTROS */}

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
                Encontre rapidamente uma Ordem de Serviço
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
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar por OS, cliente, placa, veículo ou técnico..."
                style={
                  styles.searchInput
                }
              />
            </div>

            <select
              value={
                statusFiltro
              }
              onChange={(
                event
              ) =>
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
              onChange={(
                event
              ) =>
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
              onChange={(
                event
              ) =>
                setDataFiltro(
                  event.target.value
                )
              }
              style={
                styles.select
              }
            />
          </div>

          {(busca ||
            statusFiltro !==
              'todos' ||
            prioridadeFiltro !==
              'todas' ||
            dataFiltro) && (
            <div
              style={
                styles.activeFilters
              }
            >
              <span>
                {
                  ordensFiltradas.length
                }{' '}
                {ordensFiltradas.length ===
                1
                  ? 'resultado'
                  : 'resultados'}
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

        {/* LISTA */}

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
                  ? 'OS encontrada'
                  : 'OS encontradas'}
              </p>
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
            <>
              {/* DESKTOP */}

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
                    OS
                  </div>

                  <div>
                    Cliente / Veículo
                  </div>

                  <div>
                    Serviço / Título
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
                  (
                    os
                  ) => (
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
                          {os.clientes
                            ?.nome ||
                            'Cliente não informado'}
                        </strong>

                        <span
                          style={
                            styles.vehicleText
                          }
                        >
                          {formatarVeiculo(
                            os
                          )}
                        </span>
                      </div>

                      <div
                        style={
                          styles.titleCell
                        }
                      >
                        <strong>
                          {os.titulo ||
                            'Sem título'}
                        </strong>

                        {os.descricao && (
                          <span
                            style={
                              styles.descriptionText
                            }
                          >
                            {limitarTexto(
                              os.descricao,
                              70
                            )}
                          </span>
                        )}
                      </div>

                      {/* TÉCNICO */}

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
                                os
                                  .responsavel
                                  .nome
                              )}
                            </div>

                            <div
                              style={
                                styles.technicianInfo
                              }
                            >
                              <strong>
                                {
                                  os
                                    .responsavel
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
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation()

                            abrirOS(
                              os.id
                            )
                          }}
                          style={
                            styles.viewButton
                          }
                        >
                          Ver →
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* MOBILE */}

              <div
                style={
                  styles.mobileList
                }
              >
                {ordensFiltradas.map(
                  (
                    os
                  ) => (
                    <div
                      key={
                        os.id
                      }
                      style={
                        styles.mobileCard
                      }
                      onClick={() =>
                        abrirOS(
                          os.id
                        )
                      }
                    >
                      <div
                        style={
                          styles.mobileCardTop
                        }
                      >
                        <div>
                          <strong
                            style={
                              styles.mobileOSNumber
                            }
                          >
                            {os.numero
                              ? `OS #${os.numero}`
                              : 'OS sem número'}
                          </strong>

                          <div
                            style={
                              styles.mobileDate
                            }
                          >
                            {formatarData(
                              os.data_entrada
                            )}{' '}
                            às{' '}
                            {formatarHora(
                              os.data_entrada
                            )}
                          </div>
                        </div>

                        <StatusBadge
                          status={
                            os.status
                          }
                        />
                      </div>

                      <div
                        style={
                          styles.mobileDivider
                        }
                      />

                      <div
                        style={
                          styles.mobileInfo
                        }
                      >
                        <span
                          style={
                            styles.mobileLabel
                          }
                        >
                          Cliente
                        </span>

                        <strong>
                          {os.clientes
                            ?.nome ||
                            'Não informado'}
                        </strong>
                      </div>

                      <div
                        style={
                          styles.mobileInfo
                        }
                      >
                        <span
                          style={
                            styles.mobileLabel
                          }
                        >
                          Veículo
                        </span>

                        <strong>
                          {formatarVeiculo(
                            os
                          )}
                        </strong>
                      </div>

                      <div
                        style={
                          styles.mobileInfo
                        }
                      >
                        <span
                          style={
                            styles.mobileLabel
                          }
                        >
                          Serviço
                        </span>

                        <strong>
                          {os.titulo ||
                            'Não informado'}
                        </strong>
                      </div>

                      <div
                        style={
                          styles.mobileBottom
                        }
                      >
                        <PriorityBadge
                          prioridade={
                            os.prioridade
                          }
                        />

                        <span
                          style={
                            styles.mobileTechnician
                          }
                        >
                          👨‍🔧{' '}
                          {os.responsavel
                            ?.nome ||
                            'Não atribuído'}
                        </span>

                        <span
                          style={
                            styles.mobileOpen
                          }
                        >
                          Abrir →
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>
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
  onClick,
}: {
  icon: string
  label: string
  value: number
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
        style={
          styles.statIcon
        }
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
        '#fef3c7',
      color: '#92400e',
      dot: '#f59e0b',
    },

    em_andamento: {
      label: 'Em andamento',
      background:
        '#dbeafe',
      color: '#1d4ed8',
      dot: '#3b82f6',
    },

    concluida: {
      label: 'Concluída',
      background:
        '#dcfce7',
      color: '#166534',
      dot: '#22c55e',
    },

    cancelada: {
      label: 'Cancelada',
      background:
        '#fee2e2',
      color: '#991b1b',
      dot: '#ef4444',
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
        '#f1f5f9',
      color: '#475569',
      dot: '#64748b',
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
        '#f1f5f9',
      color: '#475569',
    },

    normal: {
      label: 'Normal',
      background:
        '#eff6ff',
      color: '#1d4ed8',
    },

    alta: {
      label: 'Alta',
      background:
        '#fff7ed',
      color: '#c2410c',
    },

    urgente: {
      label: 'Urgente',
      background:
        '#fef2f2',
      color: '#b91c1c',
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
        '#f1f5f9',
      color: '#475569',
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
      {config.label}
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
          ? 'Nenhuma OS encontrada'
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
          + Criar primeira OS
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
    em_andamento:
      'Em andamento',
    concluida:
      'Concluída',
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
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente',
  }

  return (
    nomes[
      normalizado
    ] ||
    prioridade ||
    'Normal'
  )
}

function formatarVeiculo(
  os: OrdemServico
) {
  const veiculo =
    os.veiculos

  if (!veiculo) {
    return 'Veículo não informado'
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
    ).padStart(2, '0')

  const dia =
    String(
      date.getDate()
    ).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function limitarTexto(
  texto: string,
  limite: number
) {
  if (
    texto.length <=
    limite
  ) {
    return texto
  }

  return `${texto.substring(
    0,
    limite
  )}...`
}

function iniciais(
  nome: string
) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (parte) =>
        parte[0]
    )
    .join('')
    .toUpperCase()
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
    maxWidth: 1400,
    margin: '0 auto',
    padding: 24,
    boxSizing:
      'border-box',
  },

  header: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems:
      'center',
    gap: 20,
    marginBottom:
      24,
  },

  headerContent: {
    minWidth: 0,
  },

  title: {
    margin: 0,
    color: '#0f172a',
    fontSize: 30,
    fontWeight: 800,
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: 15,
  },

  newButton: {
    minHeight: 44,
    padding: '0 18px',
    border: 'none',
    borderRadius: 10,
    background:
      '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace:
      'nowrap',
  },

  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 10,
    border:
      '1px solid #fecaca',
    background:
      '#fef2f2',
    color: '#991b1b',
    fontSize: 14,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    minHeight: 82,
    padding:
      '14px 16px',
    border:
      '1px solid #e2e8f0',
    borderRadius: 14,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.04)',
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    background:
      '#f8fafc',
    fontSize: 20,
    flexShrink: 0,
  },

  statContent: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 2,
  },

  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 600,
  },

  statValue: {
    color: '#0f172a',
    fontSize: 23,
    fontWeight: 800,
  },

  filtersCard: {
    padding: 20,
    marginBottom: 20,
    border:
      '1px solid #e2e8f0',
    borderRadius: 15,
    background:
      '#ffffff',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.04)',
  },

  filtersHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems:
      'center',
    gap: 15,
    marginBottom: 16,
  },

  filtersTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 800,
  },

  filtersSubtitle: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: 12,
  },

  refreshButton: {
    minHeight: 38,
    padding:
      '0 13px',
    border:
      '1px solid #cbd5e1',
    borderRadius: 8,
    background:
      '#ffffff',
    color: '#334155',
    fontWeight: 700,
    cursor: 'pointer',
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(250px, 2fr) repeat(3, minmax(150px, 1fr))',
    gap: 10,
  },

  searchWrapper: {
    position: 'relative',
    width: '100%',
  },

  searchIcon: {
    position:
      'absolute',
    left: 12,
    top: '50%',
    transform:
      'translateY(-50%)',
    fontSize: 15,
    pointerEvents:
      'none',
  },

  searchInput: {
    width: '100%',
    minHeight: 42,
    boxSizing:
      'border-box',
    padding:
      '0 12px 0 38px',
    border:
      '1px solid #cbd5e1',
    borderRadius: 9,
    outline: 'none',
    fontSize: 13,
    color: '#0f172a',
  },

  select: {
    width: '100%',
    minHeight: 42,
    boxSizing:
      'border-box',
    padding:
      '0 10px',
    border:
      '1px solid #cbd5e1',
    borderRadius: 9,
    background:
      '#ffffff',
    color: '#334155',
    outline: 'none',
    fontSize: 13,
  },

  activeFilters: {
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    gap: 10,
    marginTop: 13,
    paddingTop: 13,
    borderTop:
      '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: 12,
  },

  clearButton: {
    border: 'none',
    background:
      'transparent',
    color: '#2563eb',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
  },

  listCard: {
    background:
      '#ffffff',
    border:
      '1px solid #e2e8f0',
    borderRadius: 15,
    overflow: 'hidden',
    boxShadow:
      '0 2px 8px rgba(15, 23, 42, 0.04)',
  },

  listHeader: {
    padding:
      '18px 20px',
    borderBottom:
      '1px solid #e2e8f0',
  },

  listTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 800,
  },

  listSubtitle: {
    margin:
      '4px 0 0',
    color: '#64748b',
    fontSize: 12,
  },

  desktopList: {
    width: '100%',
    overflowX: 'auto',
  },

  tableHeader: {
    display: 'grid',
    gridTemplateColumns:
      '90px minmax(160px, 1.1fr) minmax(180px, 1.2fr) minmax(150px, 1fr) 130px 100px 70px',
    gap: 12,
    alignItems:
      'center',
    minWidth: 950,
    padding:
      '11px 18px',
    background:
      '#f8fafc',
    borderBottom:
      '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: 10,
    fontWeight: 800,
    textTransform:
      'uppercase',
    letterSpacing: 0.5,
  },

  tableRow: {
    display: 'grid',
    gridTemplateColumns:
      '90px minmax(160px, 1.1fr) minmax(180px, 1.2fr) minmax(150px, 1fr) 130px 100px 70px',
    gap: 12,
    alignItems:
      'center',
    minWidth: 950,
    padding:
      '15px 18px',
    borderBottom:
      '1px solid #f1f5f9',
    cursor:
      'pointer',
  },

  osNumber: {
    color: '#0f172a',
    fontWeight: 800,
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
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
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
    color: '#0f172a',
    fontSize: 13,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  vehicleText: {
    color: '#64748b',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  titleCell: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 4,
    minWidth: 0,
    color: '#0f172a',
    fontSize: 13,
  },

  descriptionText: {
    color: '#64748b',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
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
    fontSize: 12,
  },

  technicianAvatar: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius:
      '50%',
    background:
      '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    fontSize: 11,
    fontWeight: 800,
  },

  notAssigned: {
    color: '#94a3b8',
    fontSize: 11,
  },

  statusBadge: {
    display:
      'inline-flex',
    alignItems:
      'center',
    gap: 6,
    width: 'fit-content',
    padding:
      '6px 9px',
    borderRadius: 7,
    fontSize: 10,
    fontWeight: 800,
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
    gap: 3,
    color: '#475569',
    fontSize: 11,
  },

  viewButton: {
    border: 'none',
    background:
      'transparent',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },

  mobileList: {
    display: 'none',
  },

  mobileCard: {
    padding: 16,
    borderBottom:
      '1px solid #e2e8f0',
    cursor: 'pointer',
  },

  mobileCardTop: {
    display: 'flex',
    alignItems:
      'flex-start',
    justifyContent:
      'space-between',
    gap: 12,
  },

  mobileOSNumber: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 800,
  },

  mobileDate: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 11,
  },

  mobileDivider: {
    height: 1,
    background:
      '#f1f5f9',
    margin:
      '13px 0',
  },

  mobileInfo: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 3,
    marginBottom: 11,
    color: '#0f172a',
    fontSize: 13,
  },

  mobileLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 800,
    textTransform:
      'uppercase',
    letterSpacing: 0.4,
  },

  mobileBottom: {
    display: 'flex',
    alignItems:
      'center',
    flexWrap:
      'wrap',
    gap: 8,
    marginTop: 14,
  },

  mobileTechnician: {
    color: '#475569',
    fontSize: 11,
  },

  mobileOpen: {
    marginLeft:
      'auto',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 800,
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
      '#f8fafc',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
    fontSize: 30,
    marginBottom: 14,
  },

  emptyStateTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: 17,
  },

  emptyStateText: {
    maxWidth: 420,
    margin:
      '7px 0 17px',
    color: '#64748b',
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
      '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
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
      '4px solid #e2e8f0',
    borderTopColor:
      '#2563eb',
    borderRadius:
      '50%',
  },

  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
}