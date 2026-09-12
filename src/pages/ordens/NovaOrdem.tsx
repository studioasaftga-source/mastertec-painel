import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Layout from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'

interface EntradaVeiculo {
  id: string
  empresa_id: string | null
  placa: string | null
  ano: number | null
  modelo: string | null
  cliente_nome: string
  telefone: string | null
  observacao: string | null
  frota: string | null
  descricao_peca: string | null
  tipo_entrada: string | null
}

interface Cliente {
  id: string
  nome: string
  telefone: string | null
  empresa_id: string | null
}

interface Veiculo {
  id: string
  placa: string
  modelo: string | null
  ano: number | null
  cliente_id: string | null
  empresa_id: string | null
}

interface Servico {
  id: string
  nome: string
  descricao: string | null
  categoria: string | null
  valor_padrao: number
  tempo_estimado_minutos: number | null
}

interface Usuario {
  id: string
  nome: string
  email: string
  cargo: string | null
  role: string
  ativo: boolean
  empresa_id: string | null
}

interface ServicoSelecionado {
  id: string
  servico_id: string
  tecnico_id: string
}

type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente'

export default function NovaOrdem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const entradaId = searchParams.get('entrada')

  const [entrada, setEntrada] = useState<EntradaVeiculo | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [tecnicos, setTecnicos] = useState<Usuario[]>([])

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('normal')

  const [servicosSelecionados, setServicosSelecionados] = useState<
    ServicoSelecionado[]
  >([])

  const [servicoAtual, setServicoAtual] = useState('')
  const [tecnicoAtual, setTecnicoAtual] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [empresaId, setEmpresaId] = useState<string | null>(null)

  useEffect(() => {
    carregarDados()
  }, [entradaId])

  async function carregarDados() {
    try {
      setCarregando(true)
      setErro('')

      if (!entradaId) {
        throw new Error(
          'Nenhuma entrada foi informada. Abra a OS a partir de uma entrada.'
        )
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Usuário não autenticado.')
      }

      /*
       * Descobrimos a empresa através do usuário logado.
       */
      const { data: usuarioAtual, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, empresa_id, nome, email, cargo, role, ativo')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (usuarioError) {
        throw usuarioError
      }

      if (!usuarioAtual?.empresa_id) {
        throw new Error(
          'Não foi possível identificar a empresa do usuário logado.'
        )
      }

      setEmpresaId(usuarioAtual.empresa_id)

      /*
       * Carrega a entrada.
       */
      const { data: entradaData, error: entradaError } = await supabase
        .from('entradas_veiculos')
        .select(
          `
          id,
          empresa_id,
          placa,
          ano,
          modelo,
          cliente_nome,
          telefone,
          observacao,
          frota,
          descricao_peca,
          tipo_entrada
        `
        )
        .eq('id', entradaId)
        .maybeSingle()

      if (entradaError) {
        throw entradaError
      }

      if (!entradaData) {
        throw new Error('Entrada não encontrada.')
      }

      setEntrada(entradaData)

      /*
       * Título inicial da OS.
       */
      const tituloInicial = entradaData.modelo
        ? `Serviço - ${entradaData.modelo}`
        : entradaData.descricao_peca
          ? `Serviço - ${entradaData.descricao_peca}`
          : 'Ordem de Serviço'

      setTitulo(tituloInicial)

      /*
       * Descrição inicial.
       */
      const descricaoInicial =
        entradaData.observacao ||
        entradaData.descricao_peca ||
        ''

      setDescricao(descricaoInicial)

      /*
       * Procura o cliente existente.
       *
       * Primeiro tenta pelo telefone.
       * Se não houver telefone, tenta pelo nome.
       */
      let clienteEncontrado: Cliente | null = null

      if (entradaData.telefone) {
        const { data: clienteTelefone, error: clienteTelefoneError } =
          await supabase
            .from('clientes')
            .select('id, nome, telefone, empresa_id')
            .eq('empresa_id', usuarioAtual.empresa_id)
            .eq('telefone', entradaData.telefone)
            .limit(1)
            .maybeSingle()

        if (clienteTelefoneError) {
          throw clienteTelefoneError
        }

        if (clienteTelefone) {
          clienteEncontrado = clienteTelefone
        }
      }

      /*
       * Se não encontrou pelo telefone, tenta pelo nome.
       */
      if (!clienteEncontrado) {
        const { data: clienteNome, error: clienteNomeError } = await supabase
          .from('clientes')
          .select('id, nome, telefone, empresa_id')
          .eq('empresa_id', usuarioAtual.empresa_id)
          .ilike('nome', entradaData.cliente_nome)
          .limit(1)
          .maybeSingle()

        if (clienteNomeError) {
          throw clienteNomeError
        }

        if (clienteNome) {
          clienteEncontrado = clienteNome
        }
      }

      /*
       * Se o cliente ainda não existe, criamos.
       */
      if (!clienteEncontrado) {
        const { data: novoCliente, error: novoClienteError } =
          await supabase
            .from('clientes')
            .insert({
              empresa_id: usuarioAtual.empresa_id,
              nome: entradaData.cliente_nome,
              telefone: entradaData.telefone,
              ativo: true,
            })
            .select('id, nome, telefone, empresa_id')
            .single()

        if (novoClienteError) {
          throw novoClienteError
        }

        clienteEncontrado = novoCliente
      }

      setCliente(clienteEncontrado)

      /*
       * Veículo.
       *
       * Se a entrada tiver placa, procura o veículo.
       */
      if (entradaData.placa) {
        const placaNormalizada = entradaData.placa
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()

        const { data: veiculoEncontrado, error: veiculoError } =
          await supabase
            .from('veiculos')
            .select(
              'id, placa, modelo, ano, cliente_id, empresa_id'
            )
            .eq('empresa_id', usuarioAtual.empresa_id)
            .eq('placa', placaNormalizada)
            .limit(1)
            .maybeSingle()

        if (veiculoError) {
          throw veiculoError
        }

        if (veiculoEncontrado) {
          setVeiculo(veiculoEncontrado)
        } else {
          /*
           * Se não existir, cria o veículo automaticamente.
           */
          const { data: novoVeiculo, error: novoVeiculoError } =
            await supabase
              .from('veiculos')
              .insert({
                empresa_id: usuarioAtual.empresa_id,
                cliente_id: clienteEncontrado.id,
                placa: placaNormalizada,
                modelo: entradaData.modelo,
                ano: entradaData.ano,
                ativo: true,
              })
              .select(
                'id, placa, modelo, ano, cliente_id, empresa_id'
              )
              .single()

          if (novoVeiculoError) {
            throw novoVeiculoError
          }

          setVeiculo(novoVeiculo)
        }
      }

      /*
       * Carrega serviços ativos da empresa.
       */
      const { data: servicosData, error: servicosError } = await supabase
        .from('servicos')
        .select(
          `
          id,
          nome,
          descricao,
          categoria,
          valor_padrao,
          tempo_estimado_minutos
        `
        )
        .eq('empresa_id', usuarioAtual.empresa_id)
        .eq('ativo', true)
        .order('nome')

      if (servicosError) {
        throw servicosError
      }

      setServicos(servicosData || [])

      /*
       * Carrega usuários ativos que são técnicos.
       *
       * Aceitamos role "tecnico" ou cargos que contenham "técnico".
       */
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select(
          `
          id,
          nome,
          email,
          cargo,
          role,
          ativo,
          empresa_id
        `
        )
        .eq('empresa_id', usuarioAtual.empresa_id)
        .eq('ativo', true)
        .order('nome')

      if (usuariosError) {
        throw usuariosError
      }

      const somenteTecnicos = (usuariosData || []).filter((usuario) => {
        const role = (usuario.role || '').toLowerCase()
        const cargo = (usuario.cargo || '').toLowerCase()

        return (
          role === 'tecnico' ||
          role === 'técnico' ||
          cargo.includes('tecnico') ||
          cargo.includes('técnico')
        )
      })

      setTecnicos(somenteTecnicos)
    } catch (error: any) {
      console.error('Erro ao carregar nova OS:', error)

      setErro(
        error?.message ||
          'Não foi possível carregar os dados para criar a OS.'
      )
    } finally {
      setCarregando(false)
    }
  }

  function adicionarServico() {
    setErro('')
    setSucesso('')

    if (!servicoAtual) {
      setErro('Selecione um serviço.')
      return
    }

    if (!tecnicoAtual) {
      setErro('Selecione o técnico responsável pelo serviço.')
      return
    }

    const servicoExiste = servicosSelecionados.some(
      (item) => item.servico_id === servicoAtual
    )

    if (servicoExiste) {
      setErro('Esse serviço já foi adicionado à OS.')
      return
    }

    setServicosSelecionados((atual) => [
      ...atual,
      {
        id: crypto.randomUUID(),
        servico_id: servicoAtual,
        tecnico_id: tecnicoAtual,
      },
    ])

    setServicoAtual('')
    setTecnicoAtual('')
  }

  function removerServico(id: string) {
    setServicosSelecionados((atual) =>
      atual.filter((item) => item.id !== id)
    )
  }

  function alterarTecnico(itemId: string, tecnicoId: string) {
    setServicosSelecionados((atual) =>
      atual.map((item) =>
        item.id === itemId
          ? {
              ...item,
              tecnico_id: tecnicoId,
            }
          : item
      )
    )
  }

  const servicosDisponiveis = useMemo(() => {
    const selecionados = new Set(
      servicosSelecionados.map((item) => item.servico_id)
    )

    return servicos.filter((servico) => !selecionados.has(servico.id))
  }, [servicos, servicosSelecionados])

  const valorTotal = useMemo(() => {
    return servicosSelecionados.reduce((total, item) => {
      const servico = servicos.find(
        (servico) => servico.id === item.servico_id
      )

      return total + Number(servico?.valor_padrao || 0)
    }, 0)
  }, [servicosSelecionados, servicos])

  function nomeServico(servicoId: string) {
    return (
      servicos.find((servico) => servico.id === servicoId)?.nome ||
      'Serviço'
    )
  }

 

  async function criarOrdem() {
    try {
      setErro('')
      setSucesso('')

      if (!empresaId) {
        setErro('Empresa não identificada.')
        return
      }

      if (!entrada) {
        setErro('Entrada não carregada.')
        return
      }

      if (!cliente) {
        setErro('Cliente não identificado.')
        return
      }

      if (servicosSelecionados.length === 0) {
        setErro('Adicione pelo menos um serviço à OS.')
        return
      }

      const algumSemTecnico = servicosSelecionados.some(
        (item) => !item.tecnico_id
      )

      if (algumSemTecnico) {
        setErro(
          'Todos os serviços precisam ter um técnico responsável.'
        )
        return
      }

      if (!titulo.trim()) {
        setErro('Informe um título para a Ordem de Serviço.')
        return
      }

      setSalvando(true)

      /*
       * Responsável geral da OS:
       * usamos o primeiro técnico escolhido.
       *
       * Cada tarefa continua tendo seu próprio responsável_id.
       */
      const responsavelPrincipal =
        servicosSelecionados[0]?.tecnico_id || null

      /*
       * Cria a Ordem de Serviço.
       */
      const { data: novaOS, error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          empresa_id: empresaId,
          cliente_id: cliente.id,
          veiculo_id: veiculo?.id || null,
          responsavel_id: responsavelPrincipal,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          status: 'pendente',
          prioridade,
          data_entrada: new Date().toISOString(),
          observacoes: entrada.observacao || null,
        })
        .select(
          `
          id,
          numero,
          titulo,
          status,
          prioridade
        `
        )
        .single()

      if (osError) {
        throw osError
      }

      if (!novaOS) {
        throw new Error('A OS não foi criada.')
      }

      /*
       * Cria as tarefas da OS.
       */
      const tarefas = servicosSelecionados.map((item, index) => {
        const servico = servicos.find(
          (servico) => servico.id === item.servico_id
        )

        return {
          ordem_servico_id: novaOS.id,
          servico_id: item.servico_id,
          responsavel_id: item.tecnico_id,
          titulo: servico?.nome || 'Serviço',
          descricao: servico?.descricao || null,
          tipo: 'servico',
          status: 'pendente',
          prioridade,
          ordem: index + 1,
          observacoes: null,
        }
      })

      const { error: tarefasError } = await supabase
        .from('os_tarefas')
        .insert(tarefas)

      if (tarefasError) {
        /*
         * Se as tarefas falharem, tentamos remover a OS
         * para não deixar uma ordem incompleta.
         */
        await supabase
          .from('ordens_servico')
          .delete()
          .eq('id', novaOS.id)

        throw tarefasError
      }

      setSucesso(
        `Ordem de Serviço ${
          novaOS.numero ? `#${novaOS.numero}` : ''
        } criada com sucesso!`
      )

      /*
       * Depois de uma pequena pausa, abre os detalhes.
       */
      setTimeout(() => {
        navigate(`/ordens/${novaOS.id}`)
      }, 700)
    } catch (error: any) {
      console.error('Erro ao criar OS:', error)

      setErro(
        error?.message ||
          'Não foi possível criar a Ordem de Serviço.'
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <Layout>
        <div style={styles.centerContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>
            Carregando dados da entrada...
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={styles.backButton}
            >
              ← Voltar
            </button>

            <h1 style={styles.title}>
              Nova Ordem de Serviço
            </h1>

            <p style={styles.subtitle}>
              Transforme a entrada em uma Ordem de Serviço
            </p>
          </div>
        </div>

        {erro && (
          <div style={styles.alertError}>
            <strong>Erro:</strong> {erro}
          </div>
        )}

        {sucesso && (
          <div style={styles.alertSuccess}>
            {sucesso}
          </div>
        )}

        {!tecnicos.length && (
          <div style={styles.alertWarning}>
            <strong>⚠️ Nenhum técnico cadastrado.</strong>
            <br />
            Cadastre pelo menos um usuário com cargo ou role de
            técnico para poder atribuir os serviços.
          </div>
        )}

        <div style={styles.grid}>
          {/* DADOS DA ENTRADA */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}>🚗</div>

              <div>
                <h2 style={styles.cardTitle}>
                  Dados da entrada
                </h2>

                <p style={styles.cardSubtitle}>
                  Informações recebidas na entrada do veículo
                </p>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <InfoItem
                label="Cliente"
                value={entrada?.cliente_nome || '-'}
              />

              <InfoItem
                label="Telefone"
                value={entrada?.telefone || '-'}
              />

              <InfoItem
                label="Veículo"
                value={entrada?.modelo || '-'}
              />

              <InfoItem
                label="Placa"
                value={entrada?.placa || '-'}
              />

              <InfoItem
                label="Ano"
                value={entrada?.ano?.toString() || '-'}
              />

              <InfoItem
                label="Frota"
                value={entrada?.frota || '-'}
              />
            </div>

            {entrada?.tipo_entrada && (
              <div style={styles.entryType}>
                <strong>Tipo de entrada:</strong>{' '}
                {entrada.tipo_entrada}
              </div>
            )}

            {entrada?.descricao_peca && (
              <div style={styles.observationBox}>
                <strong>Descrição da peça:</strong>
                <p>{entrada.descricao_peca}</p>
              </div>
            )}

            {entrada?.observacao && (
              <div style={styles.observationBox}>
                <strong>Observação da entrada:</strong>
                <p>{entrada.observacao}</p>
              </div>
            )}
          </section>

          {/* CLIENTE / VEÍCULO */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}>👤</div>

              <div>
                <h2 style={styles.cardTitle}>
                  Cadastro relacionado
                </h2>

                <p style={styles.cardSubtitle}>
                  Registros vinculados à Ordem de Serviço
                </p>
              </div>
            </div>

            <div style={styles.relatedBox}>
              <div>
                <span style={styles.relatedLabel}>
                  Cliente
                </span>

                <strong style={styles.relatedValue}>
                  {cliente?.nome || 'Não encontrado'}
                </strong>

                <small style={styles.relatedSmall}>
                  {cliente
                    ? 'Cliente localizado/cadastrado automaticamente'
                    : 'Cliente não identificado'}
                </small>
              </div>
            </div>

            <div style={styles.relatedBox}>
              <div>
                <span style={styles.relatedLabel}>
                  Veículo
                </span>

                <strong style={styles.relatedValue}>
                  {veiculo
                    ? `${veiculo.modelo || 'Veículo'} • ${veiculo.placa}`
                    : entrada?.placa
                      ? 'Veículo não encontrado'
                      : 'Entrada sem placa'}
                </strong>

                <small style={styles.relatedSmall}>
                  {veiculo
                    ? 'Veículo localizado/cadastrado automaticamente'
                    : entrada?.placa
                      ? 'O veículo foi criado ou localizado durante o carregamento'
                      : 'Esta entrada não possui veículo associado'}
                </small>
              </div>
            </div>
          </section>
        </div>

        {/* DADOS DA OS */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>📋</div>

            <div>
              <h2 style={styles.cardTitle}>
                Dados da Ordem de Serviço
              </h2>

              <p style={styles.cardSubtitle}>
                Defina as informações principais da OS
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Título da OS *
              </label>

              <input
                type="text"
                value={titulo}
                onChange={(event) =>
                  setTitulo(event.target.value)
                }
                placeholder="Ex.: Diagnóstico do sistema de injeção"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Prioridade
              </label>

              <select
                value={prioridade}
                onChange={(event) =>
                  setPrioridade(
                    event.target.value as Prioridade
                  )
                }
                style={styles.input}
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Descrição
            </label>

            <textarea
              value={descricao}
              onChange={(event) =>
                setDescricao(event.target.value)
              }
              placeholder="Descreva o serviço, problema relatado ou informações importantes..."
              rows={4}
              style={styles.textarea}
            />
          </div>
        </section>

        {/* SERVIÇOS */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>🔧</div>

            <div>
              <h2 style={styles.cardTitle}>
                Serviços da OS
              </h2>

              <p style={styles.cardSubtitle}>
                Adicione os serviços e atribua cada um a um técnico
              </p>
            </div>
          </div>

          <div style={styles.addServiceBox}>
            <div style={styles.addServiceGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Serviço
                </label>

                <select
                  value={servicoAtual}
                  onChange={(event) =>
                    setServicoAtual(event.target.value)
                  }
                  style={styles.input}
                  disabled={!servicosDisponiveis.length}
                >
                  <option value="">
                    {servicosDisponiveis.length
                      ? 'Selecione um serviço...'
                      : 'Todos os serviços já foram adicionados'}
                  </option>

                  {servicosDisponiveis.map((servico) => (
                    <option
                      key={servico.id}
                      value={servico.id}
                    >
                      {servico.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Técnico responsável
                </label>

                <select
                  value={tecnicoAtual}
                  onChange={(event) =>
                    setTecnicoAtual(event.target.value)
                  }
                  style={styles.input}
                  disabled={!tecnicos.length}
                >
                  <option value="">
                    {tecnicos.length
                      ? 'Selecione o técnico...'
                      : 'Nenhum técnico cadastrado'}
                  </option>

                  {tecnicos.map((tecnico) => (
                    <option
                      key={tecnico.id}
                      value={tecnico.id}
                    >
                      {tecnico.nome}
                      {tecnico.cargo
                        ? ` — ${tecnico.cargo}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={adicionarServico}
                style={styles.addButton}
                disabled={
                  !servicoAtual ||
                  !tecnicoAtual ||
                  !tecnicos.length
                }
              >
                + Adicionar
              </button>
            </div>
          </div>

          {servicosSelecionados.length === 0 ? (
            <div style={styles.emptyServices}>
              <div style={styles.emptyIcon}>🔧</div>

              <strong>
                Nenhum serviço adicionado
              </strong>

              <span>
                Selecione um serviço e um técnico acima.
              </span>
            </div>
          ) : (
            <div style={styles.servicesList}>
              {servicosSelecionados.map((item, index) => {
                const servico = servicos.find(
                  (servico) =>
                    servico.id === item.servico_id
                )

                return (
                  <div
                    key={item.id}
                    style={styles.serviceRow}
                  >
                    <div style={styles.serviceNumber}>
                      {index + 1}
                    </div>

                    <div style={styles.serviceMain}>
                      <strong style={styles.serviceName}>
                        {nomeServico(item.servico_id)}
                      </strong>

                      {servico?.categoria && (
                        <span style={styles.serviceCategory}>
                          {servico.categoria}
                        </span>
                      )}
                    </div>

                    <div style={styles.serviceTechnician}>
                      <label style={styles.miniLabel}>
                        Técnico
                      </label>

                      <select
                        value={item.tecnico_id}
                        onChange={(event) =>
                          alterarTecnico(
                            item.id,
                            event.target.value
                          )
                        }
                        style={styles.smallSelect}
                      >
                        <option value="">
                          Selecione...
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
                    </div>

                    <div style={styles.serviceValue}>
                      R${' '}
                      {Number(
                        servico?.valor_padrao || 0
                      ).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removerServico(item.id)
                      }
                      style={styles.removeButton}
                      title="Remover serviço"
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {servicosSelecionados.length > 0 && (
            <div style={styles.totalBox}>
              <span>
                {servicosSelecionados.length}{' '}
                {servicosSelecionados.length === 1
                  ? 'serviço'
                  : 'serviços'}
              </span>

              <strong>
                Total estimado: R${' '}
                {valorTotal.toFixed(2)}
              </strong>
            </div>
          )}
        </section>

        {/* AÇÕES */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={styles.cancelButton}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={criarOrdem}
            style={styles.createButton}
            disabled={
              salvando ||
              !cliente ||
              servicosSelecionados.length === 0 ||
              !tecnicos.length
            }
          >
            {salvando
              ? 'Criando OS...'
              : '✓ Criar Ordem de Serviço'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.infoValue}>{value}</strong>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px',
    boxSizing: 'border-box',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  backButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    marginBottom: 10,
    cursor: 'pointer',
    fontSize: 14,
    color: '#64748b',
  },

  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: '#0f172a',
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: 15,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 20,
    marginBottom: 20,
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },

  cardTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 750,
  },

  cardSubtitle: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: 13,
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 14,
  },

  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: 12,
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  },

  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: 700,
  },

  infoValue: {
    fontSize: 14,
    color: '#0f172a',
    wordBreak: 'break-word',
  },

  entryType: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: '#f8fafc',
    color: '#475569',
    fontSize: 13,
  },

  observationBox: {
    marginTop: 14,
    padding: 14,
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 10,
    color: '#78350f',
    fontSize: 13,
  },

  relatedBox: {
    padding: 15,
    borderRadius: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    marginBottom: 12,
  },

  relatedLabel: {
    display: 'block',
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#64748b',
    fontWeight: 700,
    marginBottom: 5,
  },

  relatedValue: {
    display: 'block',
    color: '#0f172a',
    fontSize: 15,
  },

  relatedSmall: {
    display: 'block',
    marginTop: 5,
    color: '#64748b',
    fontSize: 11,
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 2fr) minmax(180px, 1fr)',
    gap: 16,
    marginBottom: 16,
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },

  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
  },

  input: {
    width: '100%',
    minHeight: 44,
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    padding: '10px 12px',
    fontSize: 14,
    color: '#0f172a',
    background: '#ffffff',
    outline: 'none',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    padding: '11px 12px',
    fontSize: 14,
    color: '#0f172a',
    background: '#ffffff',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },

  addServiceBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },

  addServiceGrid: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(200px, 1.5fr) minmax(200px, 1.5fr) auto',
    gap: 12,
    alignItems: 'end',
  },

  addButton: {
    minHeight: 44,
    border: 'none',
    borderRadius: 9,
    padding: '0 18px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  emptyServices: {
    minHeight: 150,
    border: '1px dashed #cbd5e1',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    color: '#64748b',
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: 30,
    marginBottom: 3,
  },

  servicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },

  serviceRow: {
    display: 'grid',
    gridTemplateColumns:
      '38px minmax(180px, 1fr) minmax(190px, 260px) 100px 42px',
    gap: 12,
    alignItems: 'center',
    padding: 13,
    border: '1px solid #e2e8f0',
    borderRadius: 11,
    background: '#ffffff',
  },

  serviceNumber: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 13,
  },

  serviceMain: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  serviceName: {
    color: '#0f172a',
    fontSize: 14,
  },

  serviceCategory: {
    color: '#64748b',
    fontSize: 11,
  },

  serviceTechnician: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  miniLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 700,
    textTransform: 'uppercase',
  },

  smallSelect: {
    width: '100%',
    minHeight: 38,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '7px 9px',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 13,
  },

  serviceValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'right',
  },

  removeButton: {
    width: 38,
    height: 38,
    border: '1px solid #fecaca',
    borderRadius: 8,
    background: '#fef2f2',
    cursor: 'pointer',
    fontSize: 15,
  },

  totalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: '15px 17px',
    borderRadius: 10,
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 14,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    paddingBottom: 30,
  },

  cancelButton: {
    minHeight: 46,
    padding: '0 20px',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#ffffff',
    color: '#475569',
    fontWeight: 700,
    cursor: 'pointer',
  },

  createButton: {
    minHeight: 46,
    padding: '0 24px',
    border: 'none',
    borderRadius: 9,
    background: '#16a34a',
    color: '#ffffff',
    fontWeight: 800,
    cursor: 'pointer',
  },

  alertError: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 10,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: 14,
  },

  alertSuccess: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 10,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: 14,
    fontWeight: 700,
  },

  alertWarning: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 10,
    background: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#92400e',
    fontSize: 14,
    lineHeight: 1.5,
  },

  centerContainer: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingSpinner: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: '4px solid #e2e8f0',
    borderTopColor: '#2563eb',
  },

  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
}