import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import type {
  Cliente,
  ClienteInput,
} from '../../services/clientes'

interface ClienteFormProps {
  cliente?: Cliente | null
  salvando: boolean
  onSalvar: (
    dados: ClienteInput
  ) => Promise<void>
  onCancelar: () => void
}

export default function ClienteForm({
  cliente,
  salvando,
  onSalvar,
  onCancelar,
}: ClienteFormProps) {
  const [nome, setNome] = useState('')
  const [documento, setDocumento] =
    useState('')
  const [telefone, setTelefone] =
    useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] =
    useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [observacoes, setObservacoes] =
    useState('')

  useEffect(() => {
    setNome(cliente?.nome ?? '')
    setDocumento(
      cliente?.documento ?? ''
    )
    setTelefone(
      cliente?.telefone ?? ''
    )
    setEmail(cliente?.email ?? '')
    setEndereco(
      cliente?.endereco ?? ''
    )
    setCidade(cliente?.cidade ?? '')
    setEstado(cliente?.estado ?? '')
    setObservacoes(
      cliente?.observacoes ?? ''
    )
  }, [cliente])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!nome.trim()) {
      alert(
        'Informe o nome do cliente.'
      )

      return
    }

    await onSalvar({
      nome: nome.trim(),
      documento: documento.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
      endereco: endereco.trim(),
      cidade: cidade.trim(),
      estado: estado
        .trim()
        .toUpperCase(),
      observacoes:
        observacoes.trim(),
    })
  }

  return (
    <div
      className="cliente-form-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onCancelar()
        }
      }}
    >
      <div
        className="cliente-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cliente-form-title"
      >
        {/* CABEÇALHO */}

        <div className="cliente-form-header">
          <div>
            <div className="cliente-form-kicker">
              MASTERTEC
            </div>

            <h2 id="cliente-form-title">
              {cliente
                ? 'Editar cliente'
                : 'Novo cliente'}
            </h2>

            <p>
              {cliente
                ? 'Atualize as informações do cliente.'
                : 'Cadastre um novo cliente da DIESEL CENTER.'}
            </p>
          </div>

          <button
            type="button"
            className="cliente-form-close"
            onClick={onCancelar}
            disabled={salvando}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* FORMULÁRIO */}

        <form
          onSubmit={handleSubmit}
          className="cliente-form"
        >
          <div className="form-section-title">
            Dados principais
          </div>

          <div className="form-grid">
            <div className="form-field form-field-full">
              <label htmlFor="cliente-nome">
                Nome / Razão social
                <span>*</span>
              </label>

              <input
                id="cliente-nome"
                value={nome}
                onChange={(event) =>
                  setNome(
                    event.target.value
                  )
                }
                placeholder="Ex.: Transportadora ABC Ltda."
                autoFocus
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliente-documento">
                CPF / CNPJ
              </label>

              <input
                id="cliente-documento"
                value={documento}
                onChange={(event) =>
                  setDocumento(
                    event.target.value
                  )
                }
                placeholder="CPF ou CNPJ"
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliente-telefone">
                Telefone
              </label>

              <input
                id="cliente-telefone"
                value={telefone}
                onChange={(event) =>
                  setTelefone(
                    event.target.value
                  )
                }
                placeholder="(65) 99999-9999"
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="cliente-email">
                E-mail
              </label>

              <input
                id="cliente-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          <div className="form-section-title">
            Endereço
          </div>

          <div className="form-grid">
            <div className="form-field form-field-full">
              <label htmlFor="cliente-endereco">
                Endereço
              </label>

              <input
                id="cliente-endereco"
                value={endereco}
                onChange={(event) =>
                  setEndereco(
                    event.target.value
                  )
                }
                placeholder="Rua, número, bairro..."
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliente-cidade">
                Cidade
              </label>

              <input
                id="cliente-cidade"
                value={cidade}
                onChange={(event) =>
                  setCidade(
                    event.target.value
                  )
                }
                placeholder="Ex.: Tangará da Serra"
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliente-estado">
                Estado
              </label>

              <input
                id="cliente-estado"
                value={estado}
                onChange={(event) =>
                  setEstado(
                    event.target.value
                  )
                }
                placeholder="MT"
                maxLength={2}
              />
            </div>
          </div>

          <div className="form-section-title">
            Observações
          </div>

          <div className="form-grid">
            <div className="form-field form-field-full">
              <label htmlFor="cliente-observacoes">
                Observações
              </label>

              <textarea
                id="cliente-observacoes"
                value={observacoes}
                onChange={(event) =>
                  setObservacoes(
                    event.target.value
                  )
                }
                placeholder="Informações adicionais sobre o cliente..."
                rows={4}
              />
            </div>
          </div>

          {/* AÇÕES */}

          <div className="cliente-form-actions">
            <button
              type="button"
              className="cliente-cancel-button"
              onClick={onCancelar}
              disabled={salvando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="cliente-save-button"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <span className="button-spinner" />
                  Salvando...
                </>
              ) : (
                <>
                  <span>✓</span>

                  {cliente
                    ? 'Salvar alterações'
                    : 'Cadastrar cliente'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}