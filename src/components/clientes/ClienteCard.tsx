import type { Cliente } from '../../services/clientes'

interface ClienteCardProps {
  cliente: Cliente
  onEditar: (cliente: Cliente) => void
  onExcluir: (cliente: Cliente) => void
  onAlterarStatus: (cliente: Cliente) => void
}

export default function ClienteCard({
  cliente,
  onEditar,
  onExcluir,
  onAlterarStatus,
}: ClienteCardProps) {
  const inicial =
    cliente.nome?.charAt(0).toUpperCase() || '?'

  return (
    <article className="cliente-card">
      <div className="cliente-card-main">
        <div className="cliente-avatar">
          {inicial}
        </div>

        <div className="cliente-info">
          <div className="cliente-name-row">
            <h3>{cliente.nome}</h3>

            <span
              className={`cliente-status ${
                cliente.ativo
                  ? 'cliente-ativo'
                  : 'cliente-inativo'
              }`}
            >
              <span className="cliente-status-dot" />
              {cliente.ativo
                ? 'Ativo'
                : 'Inativo'}
            </span>
          </div>

          <div className="cliente-details">
            {cliente.documento && (
              <span>
                <strong>Documento:</strong>{' '}
                {cliente.documento}
              </span>
            )}

            {cliente.telefone && (
              <span>
                📞 {cliente.telefone}
              </span>
            )}

            {cliente.email && (
              <span>
                ✉️ {cliente.email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="cliente-card-footer">
        <button
          type="button"
          className="cliente-action-button"
          onClick={() => onEditar(cliente)}
        >
          <span>✏️</span>
          Editar
        </button>

        <button
          type="button"
          className="cliente-action-button"
          onClick={() =>
            onAlterarStatus(cliente)
          }
        >
          <span>
            {cliente.ativo ? '🚫' : '✅'}
          </span>

          {cliente.ativo
            ? 'Desativar'
            : 'Ativar'}
        </button>

        <button
          type="button"
          className="cliente-action-button cliente-delete"
          onClick={() => onExcluir(cliente)}
        >
          <span>🗑️</span>
          Excluir
        </button>
      </div>
    </article>
  )
}