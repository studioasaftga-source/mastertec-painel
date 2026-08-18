import { useState } from 'react'
import type { ReactNode } from 'react'

import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({
  children,
}: LayoutProps) {
  const [menuAberto, setMenuAberto] =
    useState(false)

  function fecharMenu() {
    setMenuAberto(false)
  }

  return (
    <div className="app-layout">
      <Sidebar
        aberta={menuAberto}
        onFechar={fecharMenu}
      />

      <div className="app-main">
        <Header
          onMenuClick={() =>
            setMenuAberto(true)
          }
        />

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}