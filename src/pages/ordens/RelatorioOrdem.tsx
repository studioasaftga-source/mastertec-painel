import { useEffect, useMemo, useState } from 'react'
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
  data_entrada: string | null
  data_inicio: string | null
  data_conclusao: string | null
  observacoes: string | null
  valor_servicos: number | null
  valor_pecas: number | null
  valor_total: number | null
}

interface EntradaVeiculo {
  id: string
  placa: string | null
  ano: number | null
  modelo: string | null
  cliente_nome: string | null
  telefone: string | null
  criado_em: string | null
  tipo_entrada: string | null
  tipo_peca: string | null
  descricao_peca: string | null
  observacao: string | null
  frota: string | null
}

interface Tarefa {
  id: string
  titulo: string | null
  descricao: string | null
  ordem: number | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number | null
}

interface Tecnico {
  id: string
  nome: string
}

function moeda(valor: number | null | undefined) {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function dataHora(valor: string | null | undefined) {
  if (!valor) return '-'

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Cuiaba',
    }).format(new Date(valor))
  } catch {
    return '-'
  }
}

export default function RelatorioOrdem() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ordem, setOrdem] = useState<OrdemServico | null>(null)
  const [entrada, setEntrada] = useState<EntradaVeiculo | null>(null)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return

    async function carregar() {
      try {
        setCarregando(true)
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
            data_entrada,
            data_inicio,
            data_conclusao,
            observacoes,
            valor_servicos,
            valor_pecas,
            valor_total
          `)
          .eq('id', id)
          .single()

        if (osError) {
          throw osError
        }

        const os = osData as OrdemServico

        setOrdem(os)

        const [entradaResult, tarefasResult, tecnicoResult] =
          await Promise.all([
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
                    criado_em,
                    tipo_entrada,
                    tipo_peca,
                    descricao_peca,
                    observacao,
                    frota
                  `)
                  .eq('id', os.entrada_id)
                  .maybeSingle()
              : Promise.resolve({
                  data: null,
                  error: null,
                }),

            supabase
              .from('os_tarefas')
              .select(`
                id,
                titulo,
                descricao,
                ordem,
                quantidade,
                valor_unitario,
                valor_total
              `)
              .eq('ordem_servico_id', id)
              .order('ordem', {
                ascending: true,
              })
              .order('created_at', {
                ascending: true,
              }),

            os.responsavel_id
              ? supabase
                  .from('usuarios')
                  .select('id,nome')
                  .eq('id', os.responsavel_id)
                  .maybeSingle()
              : Promise.resolve({
                  data: null,
                  error: null,
                }),
          ])

        if (entradaResult.error) {
          console.error(
            'Erro ao carregar entrada:',
            entradaResult.error,
          )
        }

        if (tarefasResult.error) {
          throw tarefasResult.error
        }

        if (tecnicoResult.error) {
          console.error(
            'Erro ao carregar técnico:',
            tecnicoResult.error,
          )
        }

        setEntrada(
          (entradaResult.data as EntradaVeiculo | null) ??
            null,
        )

        setTarefas(
          (tarefasResult.data ?? []) as Tarefa[],
        )

        setTecnico(
          (tecnicoResult.data as Tecnico | null) ??
            null,
        )
      } catch (error: any) {
        console.error(
          'Erro ao carregar relatório:',
          error,
        )

        setErro(
          error?.message ||
            'Não foi possível carregar o relatório.',
        )
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [id])

  const totalTarefas = useMemo(() => {
    return tarefas.reduce((total, tarefa) => {
      return (
        total +
        Number(
          tarefa.valor_total ??
            tarefa.valor_unitario ??
            0,
        )
      )
    }, 0)
  }, [tarefas])

  const total = Number(
    ordem?.valor_total ?? totalTarefas,
  )

  function imprimir() {
    window.print()
  }

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Carregando relatório...
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
        <h2>Não foi possível carregar a O.S.</h2>

        {erro && (
          <p style={{ color: '#ff727a' }}>
            {erro}
          </p>
        )}

        <button
          onClick={() => navigate('/ordens')}
          style={{
            marginTop: 15,
            background: '#e30613',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '11px 18px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          VOLTAR
        </button>
      </div>
    )
  }

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            background: #111;
            font-family: Arial, Helvetica, sans-serif;
          }

          .relatorio-container {
            width: 100%;
            min-height: 100vh;
            padding: 25px;
            background: #111;
          }

          .pagina-relatorio {
            width: 100%;
            max-width: 850px;
            margin: 0 auto;
            background: #fff;
            color: #111;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }

            html,
            body {
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            .nao-imprimir {
              display: none !important;
            }

            .relatorio-container {
              width: 100% !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 14mm 16mm 16mm 16mm !important;
              background: #fff !important;
            }

            .pagina-relatorio {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }

            .bloco {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            table {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse !important;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            th,
            td {
              word-break: normal;
              overflow-wrap: anywhere;
            }
          }
        `}
      </style>

      {/* CONTROLES */}
      <div className="nao-imprimir">
        <div
          style={{
            maxWidth: 850,
            margin: '0 auto',
            padding: '25px 25px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() =>
              navigate(`/ordens/${ordem.id}`)
            }
            style={{
              background: '#29292d',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 8,
              padding: '11px 18px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← VOLTAR PARA O.S.
          </button>

          <button
            onClick={imprimir}
            style={{
              background: '#e30613',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '11px 20px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🖨 IMPRIMIR
          </button>
        </div>
      </div>

      {/* ÁREA DO RELATÓRIO */}
      <div className="relatorio-container">
        <div
          className="pagina-relatorio"
          style={{
            padding: 32,
            borderRadius: 4,
            boxShadow:
              '0 10px 40px rgba(0,0,0,.3)',
          }}
        >
          {/* CABEÇALHO */}
          <div
            className="bloco"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              borderBottom: '2px solid #111',
              paddingBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: 1,
                }}
              >
                DIESEL CENTER
              </div>

              <div
                style={{
                  fontSize: 13,
                  marginTop: 5,
                  color: '#555',
                }}
              >
                Relatório da Ordem de Serviço
              </div>
            </div>

            <div
              style={{
                textAlign: 'right',
                minWidth: 130,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: '#666',
                  fontWeight: 700,
                }}
              >
                ORDEM DE SERVIÇO
              </div>

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                Nº {ordem.numero ?? '-'}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: '#555',
                  marginTop: 4,
                }}
              >
                Entrada:{' '}
                {dataHora(
                  entrada?.criado_em ||
                    ordem.data_entrada,
                )}
              </div>
            </div>
          </div>

          {/* CLIENTE */}
          <section
            className="bloco"
            style={{
              marginTop: 20,
            }}
          >
            <SectionTitle>
              CLIENTE
            </SectionTitle>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 1fr) 220px',
                gap: 15,
              }}
            >
              <InfoBox
                titulo="Nome"
                valor={
                  entrada?.cliente_nome ||
                  '-'
                }
              />

              <InfoBox
                titulo="Telefone"
                valor={
                  entrada?.telefone ||
                  '-'
                }
              />
            </div>
          </section>

          {/* DADOS DA ENTRADA */}
          <section
            className="bloco"
            style={{
              marginTop: 20,
            }}
          >
            <SectionTitle>
              DADOS DA ENTRADA
            </SectionTitle>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)',
                gap: 12,
              }}
            >
              <InfoBox
                titulo="Modelo"
                valor={
                  entrada?.modelo ||
                  '-'
                }
              />

              <InfoBox
                titulo="Placa"
                valor={
                  entrada?.placa ||
                  '-'
                }
              />

              <InfoBox
                titulo="Ano"
                valor={
                  entrada?.ano
                    ? String(
                        entrada.ano,
                      )
                    : '-'
                }
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 12,
                marginTop: 12,
              }}
            >
              <InfoBox
                titulo="Frota"
                valor={
                  entrada?.frota ||
                  '-'
                }
              />

              <InfoBox
                titulo="Tipo de entrada"
                valor={
                  entrada?.tipo_entrada ||
                  entrada?.tipo_peca ||
                  '-'
                }
              />
            </div>

            {entrada?.descricao_peca && (
              <div
                style={{
                  marginTop: 12,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: 11,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#777',
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  DESCRIÇÃO DA PEÇA
                </div>

                <div
                  style={{
                    fontSize: 13,
                  }}
                >
                  {entrada.descricao_peca}
                </div>
              </div>
            )}

            {(entrada?.observacao ||
              ordem.observacoes) && (
              <div
                style={{
                  marginTop: 12,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: 11,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#777',
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  OBSERVAÇÃO
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {entrada?.observacao ||
                    ordem.observacoes}
                </div>
              </div>
            )}
          </section>

          {/* TÉCNICO */}
          <section
            className="bloco"
            style={{
              marginTop: 20,
            }}
          >
            <SectionTitle>
              RESPONSÁVEL PELO SERVIÇO
            </SectionTitle>

            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: 12,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {tecnico?.nome ||
                'Técnico não informado'}
            </div>
          </section>

          {/* SERVIÇOS */}
          <section
            className="bloco"
            style={{
              marginTop: 20,
            }}
          >
            <SectionTitle>
              SERVIÇOS E PEÇAS REALIZADOS
            </SectionTitle>

            {tarefas.length === 0 ? (
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: 18,
                  textAlign: 'center',
                  color: '#777',
                  fontSize: 13,
                }}
              >
                Nenhum serviço ou peça
                registrado.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                  fontSize: 13,
                }}
              >
                <colgroup>
                  <col
                    style={{
                      width: 45,
                    }}
                  />
                  <col />
                  <col
                    style={{
                      width: 80,
                    }}
                  />
                  <col
                    style={{
                      width: 125,
                    }}
                  />
                </colgroup>

                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom:
                          '2px solid #111',
                        textAlign: 'center',
                      }}
                    >
                      #
                    </th>

                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom:
                          '2px solid #111',
                        textAlign: 'left',
                      }}
                    >
                      DESCRIÇÃO
                    </th>

                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom:
                          '2px solid #111',
                        textAlign: 'center',
                      }}
                    >
                      QTD.
                    </th>

                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom:
                          '2px solid #111',
                        textAlign: 'right',
                      }}
                    >
                      VALOR
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tarefas.map(
                    (tarefa, index) => (
                      <tr key={tarefa.id}>
                        <td
                          style={{
                            padding:
                              '10px 8px',
                            borderBottom:
                              '1px solid #ddd',
                            textAlign:
                              'center',
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            padding:
                              '10px 8px',
                            borderBottom:
                              '1px solid #ddd',
                            textAlign:
                              'left',
                            overflowWrap:
                              'anywhere',
                          }}
                        >
                          {tarefa.descricao ||
                            tarefa.titulo ||
                            'Serviço / Peça'}
                        </td>

                        <td
                          style={{
                            padding:
                              '10px 8px',
                            borderBottom:
                              '1px solid #ddd',
                            textAlign:
                              'center',
                          }}
                        >
                          {Number(
                            tarefa.quantidade ??
                              1,
                          ).toLocaleString(
                            'pt-BR',
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              '10px 8px',
                            borderBottom:
                              '1px solid #ddd',
                            textAlign:
                              'right',
                            fontWeight: 700,
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {moeda(
                            tarefa.valor_total ??
                              tarefa.valor_unitario ??
                              0,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
          </section>

          {/* TOTAIS */}
          <div
            className="bloco"
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                width: 300,
                maxWidth: '100%',
              }}
            >
              <TotalLinha
                titulo="Serviços"
                valor={moeda(
                  ordem.valor_servicos ??
                    total,
                )}
              />

              <TotalLinha
                titulo="Peças"
                valor={moeda(
                  ordem.valor_pecas ??
                    0,
                )}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 15,
                  padding:
                    '14px 0 0',
                  marginTop: 8,
                  borderTop:
                    '2px solid #111',
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                <span>TOTAL</span>

                <span
                  style={{
                    whiteSpace:
                      'nowrap',
                  }}
                >
                  {moeda(total)}
                </span>
              </div>
            </div>
          </div>

          {/* RODAPÉ */}
          <div
            className="bloco"
            style={{
              marginTop: 35,
              paddingTop: 15,
              borderTop:
                '1px solid #ccc',
              display: 'flex',
              justifyContent:
                'space-between',
              gap: 20,
              fontSize: 11,
              color: '#666',
              flexWrap: 'wrap',
            }}
          >
            <div>
              Técnico responsável:{' '}
              <strong
                style={{
                  color: '#111',
                }}
              >
                {tecnico?.nome ||
                  'Não informado'}
              </strong>
            </div>

            <div>
              O.S. Nº{' '}
              {ordem.numero ??
                '-'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: 0.5,
        borderBottom:
          '1px solid #bbb',
        paddingBottom: 7,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function InfoBox({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 6,
        padding: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#777',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          overflowWrap: 'anywhere',
        }}
      >
        {valor}
      </div>
    </div>
  )
}

function TotalLinha({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent:
          'space-between',
        gap: 15,
        padding: '6px 0',
        fontSize: 13,
      }}
    >
      <span>{titulo}</span>

      <strong
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        {valor}
      </strong>
    </div>
  )
}