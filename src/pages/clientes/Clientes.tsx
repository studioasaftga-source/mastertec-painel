import { useEffect, useMemo, useState } from 'react'

import Layout from '../../components/layout/Layout'
import ClienteCard from '../../components/clientes/ClienteCard'
import ClienteForm from '../../components/clientes/ClienteForm'

import { useAuth } from '../../contexts/AuthContext'

import {
  alterarStatusCliente,
  buscarClientes,
  criarCliente,
  excluirCliente,
  atualizarCliente,
  type Cliente,
  type ClienteInput,
} from '../../services/clientes'

export default function Clientes() {
  const { usuario } = useAuth()

  const [clientes, setClientes] =
    useState<Cliente[]>([])

  const [loading, setLoading] =
    useState(true)

  const [salvando, setSalvando] =
    useState(false)

  const [erro, setErro] =
    useState('')

  const [busca, setBusca] =
    useState('')

  const [formAberto, setFormAberto] =
    useState(false)

  const [clienteEditando, setClienteEditando] =
    useState<Cliente | null>(null)

  async function carregarClientes() {
    if (!usuario?.empresa_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErro('')

      const dados =
        await buscarClientes(
          usuario.empresa_id
        )

      setClientes(dados)
    } catch (error) {
      console.error(
        'Erro ao carregar clientes:',
        error
      )

      setErro(
        'Não foi possível carregar os clientes.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [usuario?.empresa_id])

  const clientesFiltrados = useMemo(() => {
    const termo =
      busca.trim().toLowerCase()

    if (!termo) {
      return clientes
    }

    return clientes.filter((cliente) => {
      return (
        cliente.nome
          .toLowerCase()
          .includes(termo) ||
        cliente.documento
          ?.toLowerCase()
          .includes(termo) ||
        cliente.telefone
          ?.toLowerCase()
          .includes(termo) ||
        cliente.email
          ?.toLowerCase()
          .includes(termo)
      )
    })
  }, [clientes, busca])

  function abrirNovoCliente() {
    setClienteEditando(null)
    setFormAberto(true)
  }

  function abrirEdicao(
    cliente: Cliente
  ) {
    setClienteEditando(cliente)
    setFormAberto(true)
  }

  function fecharFormulario() {
    if (salvando) {
      return
    }

    setFormAberto(false)
    setClienteEditando(null)
  }

  async function salvarCliente(
    dados: ClienteInput
  ) {
    if (!usuario?.empresa_id) {
      alert(
        'Empresa do usuário não encontrada.'
      )

      return
    }

    try {
      setSalvando(true)

      if (clienteEditando) {
        await atualizarCliente(
          clienteEditando.id,
          usuario.empresa_id,
          dados
        )
      } else {
        await criarCliente(
          usuario.empresa_id,
          dados
        )
      }

      setFormAberto(false)
      setClienteEditando(null)

      await carregarClientes()
    } catch (error) {
      console.error(
        'Erro ao salvar cliente:',
        error
      )

      alert(
        'Não foi possível salvar o cliente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(
    cliente: Cliente
  ) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o cliente "${cliente.nome}"?`
    )

    if (!confirmou) {
      return
    }

    if (!usuario?.empresa_id) {
      alert(
        'Empresa do usuário não encontrada.'
      )

      return
    }

    try {
      await excluirCliente(
        cliente.id,
        usuario.empresa_id
      )

      await carregarClientes()
    } catch (error) {
      console.error(
        'Erro ao excluir cliente:',
        error
      )

      alert(
        'Não foi possível excluir o cliente.'
      )
    }
  }

  async function handleAlterarStatus(
    cliente: Cliente
  ) {
    if (!usuario?.empresa_id) {
      alert(
        'Empresa do usuário não encontrada.'
      )

      return
    }

    const novoStatus =
      !cliente.ativo

    try {
      await alterarStatusCliente(
        cliente.id,
        usuario.empresa_id,
        novoStatus
      )

      await carregarClientes()
    } catch (error) {
      console.error(
        'Erro ao alterar status:',
        error
      )

      alert(
        'Não foi possível alterar o status do cliente.'
      )
    }
  }

  return (
    <Layout>
      <div className="clientes-page">
        <div className="clientes-header">
          <div>
            <h1>
              Clientes
            </h1>

            <p>
              Gerencie os clientes da
              DIESEL CENTER.
            </p>
          </div>

          <button
            type="button"
            className="clientes-new-button"
            onClick={
              abrirNovoCliente
            }
          >
            + Novo cliente
          </button>
        </div>

        <div className="clientes-toolbar">
          <div className="clientes-search">
            <span>
              🔎
            </span>

            <input
              value={busca}
              onChange={(event) =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Pesquisar cliente, CPF/CNPJ, telefone ou e-mail..."
            />
          </div>

          <div className="clientes-count">
            {clientesFiltrados.length}{' '}
            {clientesFiltrados.length ===
            1
              ? 'cliente'
              : 'clientes'}
          </div>
        </div>

        {erro && (
          <div className="clientes-error">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="clientes-loading">
            <div className="clientes-loading-icon">
              MT
            </div>

            <h2>
              Carregando clientes...
            </h2>

            <p>
              Aguarde enquanto buscamos
              os dados.
            </p>
          </div>
        ) : clientesFiltrados.length ===
          0 ? (
          <div className="clientes-empty">
            <div className="clientes-empty-icon">
              👥
            </div>

            {busca ? (
              <>
                <h2>
                  Nenhum cliente
                  encontrado
                </h2>

                <p>
                  Tente pesquisar por
                  outro nome, documento,
                  telefone ou e-mail.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setBusca('')
                  }
                >
                  Limpar pesquisa
                </button>
              </>
            ) : (
              <>
                <h2>
                  Nenhum cliente
                  cadastrado
                </h2>

                <p>
                  Comece cadastrando o
                  primeiro cliente da
                  empresa.
                </p>

                <button
                  type="button"
                  onClick={
                    abrirNovoCliente
                  }
                >
                  + Cadastrar primeiro
                  cliente
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="clientes-grid">
            {clientesFiltrados.map(
              (cliente) => (
                <ClienteCard
                  key={cliente.id}
                  cliente={cliente}
                  onEditar={
                    abrirEdicao
                  }
                  onExcluir={
                    handleExcluir
                  }
                  onAlterarStatus={
                    handleAlterarStatus
                  }
                />
              )
            )}
          </div>
        )}

        {formAberto && (
          <ClienteForm
            cliente={
              clienteEditando
            }
            salvando={salvando}
            onSalvar={
              salvarCliente
            }
            onCancelar={
              fecharFormulario
            }
          />
        )}
      </div>
    </Layout>
  )
}