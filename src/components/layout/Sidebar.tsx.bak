import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

interface SidebarProps {
  aberta: boolean
  onFechar: () => void
}

interface MenuItemProps {
  icon: string
  label: string
  ativo?: boolean
  onClick?: () => void
}

function MenuItem({
  icon,
  label,
  ativo = false,
  onClick,
}: MenuItemProps) {
  return (
    <button
      type="button"
      className={`sidebar-item ${
        ativo ? 'active' : ''
      }`}
      onClick={onClick}
    >
      <span className="sidebar-item-icon">
        {icon}
      </span>

      <span>{label}</span>
    </button>
  )
}

export default function Sidebar({
  aberta,
  onFechar,
}: SidebarProps) {
  const { usuario, signOut } = useAuth()

  const navigate = useNavigate()

  function navegarPara(
    caminho: string
  ) {
    navigate(caminho)
    onFechar()
  }

  async function handleLogout() {
    await signOut()
  }

  return (
    <>
      {aberta && (
        <div
          className="sidebar-overlay"
          onClick={onFechar}
        />
      )}

      <aside
        className={`sidebar ${
          aberta ? 'sidebar-open' : ''
        }`}
      >
        {/* CABEÇALHO */}

        <div className="sidebar-header">
          <div className="sidebar-logo">
            MT
          </div>

          <div className="sidebar-brand">
            <div>
              MASTER<span>TEC</span>
            </div>

            <small>
              {usuario?.role === 'admin'
                ? 'Administrador'
                : 'Usuário'}
            </small>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onFechar}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        {/* MENU */}

        <nav className="sidebar-nav">
          {/* PRINCIPAL */}

          <div className="sidebar-section-title">
            PRINCIPAL
          </div>

          <MenuItem
            icon="📊"
            label="Dashboard"
            onClick={() =>
              navegarPara('/dashboard')
            }
          />

          <MenuItem
            icon="👥"
            label="Clientes"
            onClick={() =>
              navegarPara('/clientes')
            }
          />

          <MenuItem
            icon="🚗"
            label="Veículos"
            onClick={onFechar}
          />

          {/* OFICINA */}

          <div className="sidebar-section-title">
            OFICINA
          </div>

          <MenuItem
            icon="🔧"
            label="Serviços"
            onClick={onFechar}
          />

          <MenuItem
            icon="📋"
            label="Ordens de Serviço"
            onClick={onFechar}
          />

          <MenuItem
            icon="🛠️"
            label="Tarefas"
            onClick={onFechar}
          />

          {/* ADMINISTRAÇÃO */}

          <div className="sidebar-section-title">
            ADMINISTRAÇÃO
          </div>

          <MenuItem
            icon="👤"
            label="Usuários"
            onClick={onFechar}
          />

          <MenuItem
            icon="🧰"
            label="Técnicos"
            onClick={() =>
              navegarPara('/tecnicos')
            }
          />

          <MenuItem
            icon="⚙️"
            label="Configurações"
            onClick={onFechar}
          />
        </nav>

        {/* RODAPÉ */}

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <span>🚪</span>

            <span>
              Sair do sistema
            </span>
          </button>

          <div className="sidebar-version">
            MasterTec v1.0.0
          </div>
        </div>
      </aside>
    </>
  )
}