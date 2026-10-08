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


  | 'servico_finalizado'

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



  const [ordens, setOrdens] =

    useState<OrdemServico[]>([])



  const [entradas, setEntradas] =

    useState<

      Record<string, EntradaResumo>

    >({})



  const [carregando, setCarregando] =

    useState(true)



  const [atualizando, setAtualizando] =

    useState(false)



  const [excluindoOsId, setExcluindoOsId] =

    useState<string | null>(null)



  const [erro, setErro] =

    useState('')



  const [busca, setBusca] =

    useState('')



  const [statusFiltro, setStatusFiltro] =

    useState<FiltroStatus>('todos')



  const [prioridadeFiltro, setPrioridadeFiltro] =

    useState<FiltroPrioridade>('todas')



  const [mesFiltro, setMesFiltro] =

    useState(

      obterMesAtualCuiaba(),

    )



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

          `,

          )

          .eq(

            'empresa_id',

            idEmpresa,

          )

          .order(

            'created_at',

            {

              ascending: false,

            },

          )



        if (error) {

          throw error

        }



        const ordensCarregadas =

          (data || []) as unknown as OrdemServico[]



        setOrdens(

          ordensCarregadas,

        )



        const entradasIds =

          Array.from(

            new Set(

              ordensCarregadas

                .map(

                  ordem =>

                    ordem.entrada_id,

                )

                .filter(

                  (

                    id,

                  ): id is string =>

                    Boolean(id),

                ),

            ),

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

            'entradas_veiculos',

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

          `,

          )

          .in(

            'id',

            entradasIds,

          )



        if (erroEntradas) {

          console.warn(

            'Não foi possível carregar os dados das entradas das O.S.:',

            erroEntradas,

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

          },

        )



        setEntradas(

          mapa,

        )

      } catch (error: any) {

        console.error(

          'Erro ao carregar Ordens de Serviço:',

          error,

        )



        setErro(

          error?.message ||

            'Não foi possível carregar as Ordens de Serviço.',

        )

      }

    },

    [empresaId],

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

              'Usuário não autenticado.',

            )

          }



          const {

            data: usuario,

            error: usuarioError,

          } = await supabase

            .from('usuarios')

            .select(

              'id, empresa_id',

            )

            .eq(

              'auth_user_id',

              user.id,

            )

            .maybeSingle()



          if (usuarioError) {

            throw usuarioError

          }



          if (

            !usuario?.empresa_id

          ) {

            throw new Error(

              'Não foi possível identificar a empresa do usuário.',

            )

          }



          setEmpresaId(

            usuario.empresa_id,

          )



          await carregarOrdens(

            usuario.empresa_id,

          )

        } catch (

          error: any

        ) {

          console.error(

            'Erro ao inicializar Ordens de Serviço:',

            error,

          )



          setErro(

            error?.message ||

              'Não foi possível carregar as Ordens de Serviço.',

          )

        } finally {

          setCarregando(false)

        }

      },

      [carregarOrdens],

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

          `ordens-servico-${empresaId}`,

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

              empresaId,

            )

          },

        )

        .subscribe()



    return () => {

      void supabase.removeChannel(

        canal,

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

        empresaId,

      )

    } finally {

      setAtualizando(false)

    }

  }



  // =====================================================

  // DADOS DA ENTRADA

  // =====================================================



  function obterEntrada(

    os: OrdemServico,

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

    os: OrdemServico,

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

    os: OrdemServico,

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

    os: OrdemServico,

  ) {

    const entrada =

      obterEntrada(os)



    if (!entrada) {

      return formatarVeiculo(

        os,

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

          tipoPeca,

        )} • ${descricao}`

      }



      if (descricao) {

        return descricao

      }



      if (tipoPeca) {

        return formatarTipoPeca(

          tipoPeca,

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

          entrada.ano,

        ),

      )

    }



    return (

      partes.join(

        ' • ',

      ) ||

      formatarVeiculo(os)

    )

  }



  function obterTipoEntrada(

    os: OrdemServico,

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

  // EXCLUIR O.S.

  // =====================================================



  async function excluirOS(

    os: OrdemServico,

  ) {

    if (

      excluindoOsId ||

      !os.id

    ) {

      return

    }



    const identificacao =

      os.numero

        ? `O.S. #${os.numero}`

        : 'esta O.S.'



    const cliente =

      obterCliente(os)



    const confirmou =

      window.confirm(

        `ATENÇÃO!\n\nTem certeza que deseja excluir ${identificacao}?\n\nCliente: ${cliente}\n\nA O.S. e os registros vinculados a ela serão removidos.\n\nA entrada do veículo continuará registrada no sistema.\n\nEssa ação não pode ser desfeita.`,

      )



    if (!confirmou) {

      return

    }



    try {

      setExcluindoOsId(

        os.id,

      )



      const {

        data,

        error,

      } = await supabase.rpc(

        'excluir_os',

        {

          p_os_id: os.id,

        },

      )



      if (error) {

        throw error

      }



      if (data !== true) {

        throw new Error(

          'A O.S. não foi encontrada ou não pôde ser excluída.',

        )

      }



      setOrdens(

        atual =>

          atual.filter(

            item =>

              item.id !== os.id,

          ),

      )



      if (os.entrada_id) {

        setEntradas(

          atual => {

            const copia = {

              ...atual,

            }



            delete copia[

              os.entrada_id as string

            ]



            return copia

          },

        )

      }



      alert(

        `${identificacao} excluída com sucesso.`,

      )

    } catch (error: any) {

      console.error(

        'Erro ao excluir O.S.:',

        error,

      )



      alert(

        error?.message ||

          'Não foi possível excluir a O.S.',

      )

    } finally {

      setExcluindoOsId(

        null,

      )

    }

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



      const mesAtual =

        obterMesAtualCuiaba()



      const mesAnterior =

        obterMesAnterior(

          mesAtual,

        )



      return ordens.filter(

        os => {

          const entrada =

            obterEntrada(os)



          const fechada =

            os.status ===

              'concluida' ||

            os.status ===

              'encerrada' ||

            os.status ===

              'cancelada'



          const mesConclusao =

            obterMesDaDataCuiaba(

              os.data_conclusao,

            )



          // =================================================

          // PESQUISA

          // Procura:

          // - O.S. ainda abertas

          // - O.S. concluídas do mês atual

          // - O.S. concluídas do mês anterior

          // =================================================



          if (termo) {

            const numero =

              os.numero

                ? String(

                    os.numero,

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

                os,

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

                termo,

              )

            ) {

              return false

            }



            const dentroDaBuscaMensal =

              !fechada ||

              mesConclusao ===

                mesAtual ||

              mesConclusao ===

                mesAnterior



            if (

              !dentroDaBuscaMensal

            ) {

              return false

            }

          } else {

            // =================================================

            // SEM PESQUISA

            // O.S. abertas continuam visíveis.

            // O.S. fechadas obedecem ao mês selecionado.

            // =================================================



            if (

              fechada &&

              mesConclusao !==

                mesFiltro

            ) {

              return false

            }

          }



          if (

            statusFiltro !==

              'todos' &&

            normalizarStatus(

              os.status,

            ) !==

              normalizarStatus(

                statusFiltro,

              )

          ) {

            return false

          }



          if (

            prioridadeFiltro !==

              'todas' &&

            normalizarPrioridade(

              os.prioridade,

            ) !==

              normalizarPrioridade(

                prioridadeFiltro,

              )

          ) {

            return false

          }



          return true

        },

      )

    }, [

      ordens,

      entradas,

      busca,

      statusFiltro,

      prioridadeFiltro,

      mesFiltro,

    ])



  // =====================================================

  // ESTATÍSTICAS

  // =====================================================



  const estatisticas =

    useMemo(() => {

      const total =

        ordensFiltradas.length

      const andamento =

        ordensFiltradas.filter(

          os =>

            normalizarStatus(

              os.status,

            ) ===

            'em_andamento',

        ).length

      const concluidas =
        ordensFiltradas.filter(

          os =>

            normalizarStatus(

              os.status,

            ) ===

            'concluida',

        ).length

      return {

        total,

        andamento,

        concluidas,

      }

    }, [ordensFiltradas])



  // =====================================================

  // NAVEGAÇÃO

  // =====================================================



  function abrirOS(

    id: string,

  ) {

    navigate(

      `/ordens/${id}`,

    )

  }



  function novaOS() {

    navigate(

      '/ordens/nova',

    )

  }



  function limparFiltros() {

    setBusca('')



    setStatusFiltro(

      'todos',

    )



    setPrioridadeFiltro(

      'todas',

    )



    setMesFiltro(

      obterMesAtualCuiaba(),

    )

  }



  // =====================================================

  // OPÇÕES DE MÊS

  // =====================================================



  const opcoesMeses =

    useMemo(

      () =>

        gerarOpcoesMeses(

          12,

        ),

      [],

    )



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

                'todos',

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

                'em_andamento',

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

                'concluida',

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

                    event.target.value,

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

                  event.target

                    .value as FiltroStatus,

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

              <option value="servico_finalizado">
                Finalizada pelo técnico
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

                  event.target

                    .value as FiltroPrioridade,

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



            <select

              value={

                mesFiltro

              }

              onChange={event =>

                setMesFiltro(

                  event.target.value,

                )

              }

              style={

                styles.select

              }

            >

              {opcoesMeses.map(

                mes => (

                  <option

                    key={mes}

                    value={mes}

                  >

                    {formatarMes(

                      mes,

                    )}

                  </option>

                ),

              )}

            </select>

          </div>



          {(

            busca ||

            statusFiltro !==

              'todos' ||

            prioridadeFiltro !==

              'todas' ||

            mesFiltro !==

              obterMesAtualCuiaba()

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

                {' • '}

                {formatarMes(

                  mesFiltro,

                )}

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

                  busca,

                ) ||

                statusFiltro !==

                  'todos' ||

                prioridadeFiltro !==

                  'todas' ||

                mesFiltro !==

                  obterMesAtualCuiaba()

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



                <div>

                  Ações

                </div>

              </div>



              {ordensFiltradas.map(

                os => {

                  const entrada =

                    obterEntrada(

                      os,

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

                          os.id,

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

                              os,

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

                              os,

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

                              os,

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

                                os.responsavel.nome,

                              )}

                            </div>



                            <div

                              style={

                                styles.technicianInfo

                              }

                            >

                              <strong

                                style={{

                                  color:

                                    '#ffffff',

                                  fontWeight:

                                    800,

                                }}

                              >

                                {

                                  os

                                    .responsavel

                                    .nome

                                }

                              </strong>



                              {os

                                .responsavel

                                .cargo && (

                                <span

                                  style={{

                                    color:

                                      '#777777',

                                    fontSize:

                                      10,

                                  }}

                                >

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
                        {normalizarStatus(os.status) === 'servico_finalizado' && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 10,
                              fontWeight: 800,
                              color: '#ff5a67',
                              letterSpacing: 0.3,
                            }}
                          >
                            AGUARDANDO ENCERRAMENTO DO PAINEL
                          </div>
                        )}
                      </div>



                      <div

                        style={

                          styles.dateCell

                        }

                      >

                        <strong>

                          {formatarData(

                            os.data_entrada,

                          )}

                        </strong>



                        <span>

                          {formatarHora(

                            os.data_entrada,

                          )}

                        </span>

                      </div>



                      <div

                        style={

                          styles.actionCell

                        }

                      >

                        <button

                          type="button"

                          onClick={event => {

                            event.stopPropagation()



                            abrirOS(

                              os.id,

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



                        <button

                          type="button"

                          disabled={

                            excluindoOsId ===

                            os.id

                          }

                          onClick={event => {

                            event.stopPropagation()



                            void excluirOS(

                              os,

                            )

                          }}

                          style={{

                            ...styles.deleteButton,

                            opacity:

                              excluindoOsId ===

                              os.id

                                ? 0.55

                                : 1,

                            cursor:

                              excluindoOsId ===

                              os.id

                                ? 'default'

                                : 'pointer',

                          }}

                        >

                          {excluindoOsId ===

                          os.id

                            ? 'Excluindo...'

                            : '🗑 Excluir'}

                        </button>

                      </div>

                    </div>

                  )

                },

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

              accent,

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

      status,

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

        '#33220b',

      color:

        '#fbbf24',

      dot:

        '#f59e0b',

    },



    aberta: {

      label: 'Aberta',

      background:

        '#222222',

      color:

        '#cccccc',

      dot:

        '#777777',

    },



    em_andamento: {

      label:

        'Em andamento',

      background:

        '#0b1d33',

      color:

        '#60a5fa',

      dot:

        '#3b82f6',

    },



    servico_finalizado: {

      label:

        'FINALIZADA PELO TÉCNICO',

      background:

        '#3b1116',

      color:

        '#ff5a67',

      dot:

        '#ef3340',

    },



    aguardando_aprovacao: {

      label:

        'Aguardando aprovação',

      background:

        '#33220b',

      color:

        '#fbbf24',

      dot:

        '#f59e0b',

    },



    concluida: {

      label:

        'Concluída',

      background:

        '#0c2a1a',

      color:

        '#4ade80',

      dot:

        '#22c55e',

    },



    encerrada: {

      label:

        'Encerrada',

      background:

        '#0c2a1a',

      color:

        '#4ade80',

      dot:

        '#22c55e',

    },



    cancelada: {

      label:

        'Cancelada',

      background:

        '#2d0d0f',

      color:

        '#ff6b73',

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

          status,

        ),

      background:

        '#222222',

      color:

        '#cccccc',

      dot:

        '#777777',

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

      prioridade,

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

        '#222222',

      color:

        '#aaaaaa',

    },



    normal: {

      label: 'Normal',

      background:

        '#222222',

      color:

        '#cccccc',

    },



    alta: {

      label: 'Alta',

      background:

        '#33220b',

      color:

        '#fb923c',

    },



    urgente: {

      label: 'Urgente',

      background:

        '#2d0d0f',

      color:

        '#ff6b73',

    },

  }



  const config =

    configuracoes[

      normalizado

    ] || {

      label:

        formatarPrioridade(

          prioridade,

        ),

      background:

        '#222222',

      color:

        '#cccccc',

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

  status: string,

) {

  return (

    status || ''

  )

    .toLowerCase()

    .trim()

    .replace(

      /[\s-]+/g,

      '_',

    )

    .normalize('NFD')

    .replace(

      /[\u0300-\u036f]/g,

      '',

    )

}



function normalizarPrioridade(

  prioridade: string,

) {

  return (

    prioridade || ''

  )

    .toLowerCase()

    .trim()

    .normalize('NFD')

    .replace(

      /[\u0300-\u036f]/g,

      '',

    )

}



function formatarStatus(

  status: string,

) {

  const normalizado =

    normalizarStatus(

      status,

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

      'FINALIZADA PELO TÉCNICO',



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

  prioridade: string,

) {

  const normalizado =

    normalizarPrioridade(

      prioridade,

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

  tipo: string,

) {

  return tipo

    .replace(

      /_/g,

      ' ',

    )

    .toLocaleUpperCase(

      'pt-BR',

    )

}



function formatarVeiculo(

  os: OrdemServico,

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

        veiculo.ano,

      ),

    )

  }



  return (

    partes.join(

      ' • ',

    ) ||

    'Veículo'

  )

}



function formatarData(

  data: string,

) {

  if (!data) {

    return '-'

  }



  const date =

    new Date(data)



  if (

    Number.isNaN(

      date.getTime(),

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

    },

  ).format(date)

}



function formatarHora(

  data: string,

) {

  if (!data) {

    return '-'

  }



  const date =

    new Date(data)



  if (

    Number.isNaN(

      date.getTime(),

    )

  ) {

    return '-'

  }



  return new Intl.DateTimeFormat(

    'pt-BR',

    {

      hour: '2-digit',

      minute: '2-digit',

    },

  ).format(date)

}



function obterMesAtualCuiaba() {

  return new Intl.DateTimeFormat(

    'en-CA',

    {

      timeZone:

        'America/Cuiaba',

      year: 'numeric',

      month: '2-digit',

    },

  ).format(

    new Date(),

  )

}



function obterMesDaDataCuiaba(

  data: string | null,

) {

  if (!data) {

    return ''

  }



  const date =

    new Date(data)



  if (

    Number.isNaN(

      date.getTime(),

    )

  ) {

    return ''

  }



  return new Intl.DateTimeFormat(

    'en-CA',

    {

      timeZone:

        'America/Cuiaba',

      year: 'numeric',

      month: '2-digit',

    },

  ).format(

    date,

  )

}



function obterMesAnterior(

  mes: string,

) {

  const [ano, numeroMes] =

    mes

      .split('-')

      .map(Number)



  if (

    !ano ||

    !numeroMes

  ) {

    return ''

  }



  const data =

    new Date(

      Date.UTC(

        ano,

        numeroMes - 2,

        1,

      ),

    )



  return `${data.getUTCFullYear()}-${String(

    data.getUTCMonth() + 1,

  ).padStart(

    2,

    '0',

  )}`

}



function formatarMes(

  mes: string,

) {

  const [ano, numeroMes] =

    mes

      .split('-')

      .map(Number)



  if (

    !ano ||

    !numeroMes

  ) {

    return mes

  }



  const data =

    new Date(

      Date.UTC(

        ano,

        numeroMes - 1,

        1,

      ),

    )



  const texto =

    new Intl.DateTimeFormat(

      'pt-BR',

      {

        timeZone:

          'UTC',

        month:

          'long',

        year:

          'numeric',

      },

    ).format(

      data,

    )



  return (

    texto.charAt(0).toUpperCase() +

    texto.slice(1)

  )

}



function gerarOpcoesMeses(

  quantidade = 12,

) {

  const atual =

    obterMesAtualCuiaba()



  const opcoes: string[] =

    []



  let mes =

    atual



  for (

    let i = 0;

    i < quantidade;

    i++

  ) {

    opcoes.push(

      mes,

    )



    mes =

      obterMesAnterior(

        mes,

      )

  }



  return opcoes

}



function iniciais(

  nome: string,

) {

  return nome

    .trim()

    .split(/\s+/)

    .slice(

      0,

      2,

    )

    .map(

      parte =>

        parte[0],

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

    | 'red',

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

    minHeight: '100vh',

    margin: '0 auto',

    padding:

      '22px 24px 40px',

    boxSizing:

      'border-box',

    background:

      '#080808',

    color:

      '#ffffff',

  },



  topAccent: {

    height: 3,

    width: 56,

    marginBottom: 18,

    borderRadius: 999,

    background:

      '#e30613',

    boxShadow:

      '0 0 12px rgba(227, 6, 19, 0.45)',

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

      '#ffffff',

    fontSize: 30,

    fontWeight: 900,

    letterSpacing:

      -0.5,

  },



  subtitle: {

    margin:

      '7px 0 0',

    color:

      '#8b8b8b',

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

    border:

      '1px solid #e30613',

    borderRadius: 9,

    background:

      '#e30613',

    color:

      '#ffffff',

    fontSize: 13,

    fontWeight: 900,

    cursor: 'pointer',

    boxShadow:

      '0 8px 20px rgba(227, 6, 19, 0.25)',

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

      '1px solid #5b1b1b',

    borderLeft:

      '4px solid #e30613',

    borderRadius: 10,

    background:

      '#1a0b0b',

    color:

      '#ff8a8a',

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

      '1px solid #252525',

    borderRadius: 12,

    background:

      '#111111',

    cursor: 'pointer',

    textAlign: 'left',

    boxShadow:

      '0 4px 14px rgba(0, 0, 0, 0.30)',

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

      '#181818',

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

      '#8f8f8f',

    fontSize: 11,

    fontWeight: 700,

  },



  statValue: {

    color:

      '#ffffff',

    fontSize: 22,

    fontWeight: 900,

  },



  filtersCard: {

    padding: 18,

    marginBottom: 18,

    border:

      '1px solid #252525',

    borderRadius: 12,

    background:

      '#111111',

    boxShadow:

      '0 4px 14px rgba(0, 0, 0, 0.30)',

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

      '#ffffff',

    fontSize: 17,

    fontWeight: 900,

  },



  filtersSubtitle: {

    margin:

      '3px 0 0',

    color:

      '#777777',

    fontSize: 12,

  },



  refreshButton: {

    minHeight: 37,

    padding:

      '0 13px',

    border:

      '1px solid #333333',

    borderRadius: 8,

    background:

      '#181818',

    color:

      '#dddddd',

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

      '1px solid #333333',

    borderRadius: 8,

    outline: 'none',

    fontSize: 12,

    color:

      '#ffffff',

    background:

      '#181818',

  },



  select: {

    width: '100%',

    minHeight: 40,

    boxSizing:

      'border-box',

    padding:

      '0 10px',

    border:

      '1px solid #333333',

    borderRadius: 8,

    background:

      '#181818',

    color:

      '#ffffff',

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

      '1px solid #252525',

  },



  resultText: {

    color:

      '#8b8b8b',

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

      '#111111',

    border:

      '1px solid #252525',

    borderRadius: 12,

    overflow: 'hidden',

    boxShadow:

      '0 4px 14px rgba(0, 0, 0, 0.30)',

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

      '1px solid #252525',

  },



  listTitle: {

    margin: 0,

    color:

      '#ffffff',

    fontSize: 17,

    fontWeight: 900,

  },



  listSubtitle: {

    margin:

      '4px 0 0',

    color:

      '#777777',

    fontSize: 11,

  },



  listCount: {

    minWidth: 40,

    height: 40,

    padding:

      '0 10px',

    borderRadius: 10,

    background:

      '#260b0d',

    border:

      '1px solid #4b1115',

    color:

      '#ff3b45',

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

      '85px minmax(170px, 1fr) minmax(220px, 1.35fr) minmax(150px, 0.9fr) 145px 100px 105px',

    gap: 12,

    alignItems:

      'center',

    minWidth: 1015,

    padding:

      '10px 18px',

    background:

      '#0d0d0d',

    borderBottom:

      '1px solid #252525',

    color:

      '#777777',

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

      '85px minmax(170px, 1fr) minmax(220px, 1.35fr) minmax(150px, 0.9fr) 145px 100px 105px',

    gap: 12,

    alignItems:

      'center',

    minWidth: 1015,

    padding:

      '14px 18px',

    borderBottom:

      '1px solid #1f1f1f',

    background:

      '#111111',

    cursor:

      'pointer',

    transition:

      'background 0.15s ease',

  },



  osNumber: {

    color:

      '#ffffff',

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

    background:

      '#1d1d1d',

    color:

      '#bdbdbd',

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

      '#ffffff',

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

      '#777777',

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

      '#1d1d1d',

    color:

      '#aaaaaa',

    fontSize: 8,

    fontWeight: 900,

    letterSpacing:

      0.6,

  },



  entryTitle: {

    color:

      '#ffffff',

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

      '#777777',

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

    color:

      '#ffffff',

  },



  technicianAvatar: {

    width: 30,

    height: 30,

    flexShrink: 0,

    borderRadius:

      '50%',

    background:

      '#2a090b',

    border:

      '1px solid #571216',

    color:

      '#ff3340',

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

      '#777777',

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

      '#bbbbbb',

    fontSize: 10,

  },



  actionCell: {

    display: 'flex',

    flexDirection:

      'column',

    alignItems:

      'flex-start',

    gap: 6,

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

    padding: 0,

  },



  deleteButton: {

    display: 'inline-flex',

    alignItems:

      'center',

    justifyContent:

      'center',

    border:

      '1px solid #5f1b20',

    background:

      '#250b0d',

    color:

      '#ff6b73',

    borderRadius: 7,

    padding:

      '6px 9px',

    fontSize: 10,

    fontWeight: 900,

    whiteSpace:

      'nowrap',

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

    background:

      '#111111',

  },



  emptyStateIcon: {

    width: 64,

    height: 64,

    borderRadius: 18,

    background:

      '#260b0d',

    border:

      '1px solid #4b1115',

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

      '#ffffff',

    fontSize: 17,

    fontWeight: 900,

  },



  emptyStateText: {

    maxWidth: 420,

    margin:

      '7px 0 17px',

    color:

      '#777777',

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

    boxShadow:

      '0 6px 16px rgba(227, 6, 19, 0.22)',

  },



  footerNote: {

    marginTop: 16,

    textAlign:

      'center',

    color:

      '#555555',

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

    background:

      '#080808',

  },



  spinner: {

    width: 34,

    height: 34,

    border:

      '4px solid #252525',

    borderTopColor:

      '#e30613',

    borderRadius:

      '50%',

  },



  loadingText: {

    color:

      '#8b8b8b',

    fontSize: 13,

  },

}