import { useState, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')
    setLoading(true)

    const { error } = await signIn(email.trim(), password)

    if (error) {
      setError(
        error.message || 'Não foi possível realizar o login.'
      )
    }

    setLoading(false)
  }

  return (
    <main className="login-page">
      <section className="login-card">

        <div className="login-brand">
          <div className="login-logo">
            MT
          </div>

          <h1>MASTER<span>TEC</span></h1>

          <p>
            Gestão inteligente para sua oficina
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Senha
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>

        </form>

        <div className="login-footer">
          MASTERTEC • Sistema de Gestão
        </div>

      </section>
    </main>
  )
}