import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const { usuario } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          ☰
        </button>

        <div className="header-brand">
          <div className="header-brand-mark">
            MT
          </div>

          <div>
            <div className="header-brand-name">
              MASTER<span>TEC</span>
            </div>

            <div className="header-brand-company">
              {usuario?.empresa_id
                ? 'Gestão de Oficina'
                : 'Sistema de Gestão'}
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button
          className="notification-button"
          aria-label="Notificações"
        >
          🔔
        </button>

        <div className="user-area">
          <button
            className="user-button"
            onClick={() =>
              setMenuAberto(!menuAberto)
            }
          >
            <div className="user-avatar">
              {usuario?.nome
                ?.charAt(0)
                .toUpperCase() || 'U'}
            </div>

            <div className="user-info">
              <strong>
                {usuario?.nome || 'Usuário'}
              </strong>

              <span>
                {usuario?.role || 'Usuário'}
              </span>
            </div>

            <span className="user-arrow">
              {menuAberto ? '▲' : '▼'}
            </span>
          </button>

          {menuAberto && (
            <div className="user-dropdown">
              <div className="dropdown-user-name">
                {usuario?.nome}
              </div>

              <div className="dropdown-user-role">
                {usuario?.email}
              </div>

              <div className="dropdown-divider" />

              <button className="dropdown-item">
                Meu perfil
              </button>

              <button className="dropdown-item">
                Configurações
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}