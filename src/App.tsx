import { useEffect, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { useAuth } from './contexts/AuthContext'

import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Clientes from './pages/clientes/Clientes'

import OrdensServico from './pages/ordens/OrdensServico'
import DetalhesOrdem from './pages/ordens/DetalhesOrdem'
import RelatorioOrdem from './pages/ordens/RelatorioOrdem'
import Tecnicos from './pages/Tecnicos/Tecnicos'

import {
  buscarEmpresa,
  type Empresa,
} from './services/empresas'

function App() {
  const { user, usuario, loading } = useAuth()

  const [empresa, setEmpresa] =
    useState<Empresa | null>(null)

  const [
    carregandoEmpresa,
    setCarregandoEmpresa,
  ] = useState(false)

  useEffect(() => {
    async function carregarEmpresa() {
      if (!usuario?.empresa_id) {
        setEmpresa(null)
        return
      }

      try {
        setCarregandoEmpresa(true)

        const dados = await buscarEmpresa(
          usuario.empresa_id,
        )

        setEmpresa(dados)
      } catch (error) {
        console.error(
          'Erro ao carregar empresa:',
          error,
        )

        setEmpresa(null)
      } finally {
        setCarregandoEmpresa(false)
      }
    }

    void carregarEmpresa()
  }, [usuario?.empresa_id])

  /*
   * 1. Carregando sessão
   */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            MT
          </div>

          <h1>
            MASTER<span>TEC</span>
          </h1>

          <p>
            Carregando autenticação...
          </p>
        </div>
      </div>
    )
  }

  /*
   * 2. Usuário não autenticado
   */
  if (!user) {
    return <Login />
  }

  /*
   * 3. Auth existe, mas cadastro
   *    em public.usuarios não existe
   */
  if (!usuario) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            !
          </div>

          <h1>
            MASTER<span>TEC</span>
          </h1>

          <p>
            Usuário autenticado, mas não
            localizado no cadastro do sistema.
          </p>
        </div>
      </div>
    )
  }

  /*
   * 4. Carregando empresa
   */
  if (carregandoEmpresa) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            MT
          </div>

          <h1>
            MASTER<span>TEC</span>
          </h1>

          <p>
            Carregando empresa...
          </p>
        </div>
      </div>
    )
  }

  /*
   * 5. Empresa não encontrada
   */
  if (!empresa) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            !
          </div>

          <h1>
            MASTER<span>TEC</span>
          </h1>

          <p>
            Não foi possível localizar a
            empresa vinculada ao usuário.
          </p>
        </div>
      </div>
    )
  }

  /*
   * 6. Sistema autenticado
   *
   * React Router controla todas
   * as páginas do sistema.
   */
  return (
    <Routes>
      {/* INÍCIO */}

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      {/* DASHBOARD */}

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      {/* CLIENTES */}

      <Route
        path="/clientes"
        element={<Clientes />}
      />

      {/* ORDENS DE SERVIÇO */}

      <Route
        path="/ordens"
        element={<OrdensServico />}
      />

      <Route
        path="/ordens/:id"
        element={<DetalhesOrdem />}
      />

      {/* RELATÓRIO DA O.S. */}

      <Route
        path="/ordens/:id/relatorio"
        element={<RelatorioOrdem />}
      />

      {/* TÉCNICOS */}

      <Route
        path="/tecnicos"
        element={<Tecnicos />}
      />

      {/* ROTA CURINGA */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  )
}

export default App