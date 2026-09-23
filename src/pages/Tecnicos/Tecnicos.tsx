import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../../components/layout/Layout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Tecnico = {
  id: string
  empresa_id: string
  nome: string
  codigo_acesso: string | null
  percentual_comissao: number | null
  ativo: boolean | null
}

function formatarPercentual(valor: number | null | undefined) {
  const numero = Number(valor ?? 0)
  return `${numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}

function parsePercentual(valor: string) {
  let texto = valor.trim().replace(/\s/g, '')
  if (!texto) return 0

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  }

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : NaN
}

export default function Tecnicos() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [modoEdicaoId, setModoEdicaoId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [percentual, setPercentual] = useState('')

  const administracaoPermitida = useMemo(
    () => usuario?.role === 'admin',
    [usuario?.role],
  )

  const carregarTecnicos = useCallback(async () => {
    if (!usuario?.empresa_id || !administracaoPermitida) {
      setTecnicos([])
      setCarregando(false)
      return
    }

    try {
      setCarregando(true)
      setErro('')

      const { data, error } = await supabase
        .from('usuarios')
        .select('id,empresa_id,nome,codigo_acesso,percentual_comissao,ativo')
        .eq('empresa_id', usuario.empresa_id)
        .order('ativo', { ascending: false })
        .order('nome', { ascending: true })

      if (error) throw error

      setTecnicos((data ?? []) as Tecnico[])
    } catch (error: any) {
      console.error('Erro ao carregar técnicos:', error)
      setErro(error?.message || 'Não foi possível carregar os técnicos.')
    } finally {
      setCarregando(false)
    }
  }, [administracaoPermitida, usuario?.empresa_id])

  useEffect(() => {
    void carregarTecnicos()
  }, [carregarTecnicos])

  function limparFormulario() {
    setModoEdicaoId(null)
    setNome('')
    setPercentual('')
  }

  function iniciarEdicao(tecnico: Tecnico) {
    setErro('')
    setSucesso('')
    setModoEdicaoId(tecnico.id)
    setNome(tecnico.nome)
    setPercentual(String(tecnico.percentual_comissao ?? 0).replace('.', ','))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvarTecnico() {
    if (!administracaoPermitida || !usuario?.empresa_id || salvando) return

    const nomeLimpo = nome.trim()
    const percentualNumero = parsePercentual(percentual)

    setErro('')
    setSucesso('')

    if (!nomeLimpo) {
      setErro('Informe o nome do técnico.')
      return
    }

    if (!Number.isFinite(percentualNumero) || percentualNumero < 0 || percentualNumero > 100) {
      setErro('A comissão deve estar entre 0 e 100%.')
      return
    }

    try {
      setSalvando(true)

      if (modoEdicaoId) {
        const { error } = await supabase.rpc('atualizar_tecnico', {
          p_id: modoEdicaoId,
          p_nome: nomeLimpo,
          p_percentual_comissao: percentualNumero,
          p_ativo: tecnicos.find(tecnico => tecnico.id === modoEdicaoId)?.ativo ?? true,
        })

        if (error) throw error
        setSucesso('Técnico atualizado com sucesso.')
      } else {
        const { data, error } = await supabase.rpc('cadastrar_tecnico', {
          p_nome: nomeLimpo,
          p_percentual_comissao: percentualNumero,
        })

        if (error) throw error

        const tecnicoCriado = Array.isArray(data) ? data[0] : data
        const codigo = tecnicoCriado?.codigo_acesso

        setSucesso(
          codigo
            ? `Técnico cadastrado. Código de acesso: ${codigo}.`
            : 'Técnico cadastrado com sucesso.',
        )
      }

      limparFormulario()
      await carregarTecnicos()
    } catch (error: any) {
      console.error('Erro ao salvar técnico:', error)
      setErro(error?.message || 'Não foi possível salvar o técnico.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(tecnico: Tecnico) {
    if (!administracaoPermitida || salvando) return

    const desejaAtivar = !Boolean(tecnico.ativo)
    const mensagem = desejaAtivar
      ? `Ativar o técnico ${tecnico.nome}?`
      : `Inativar o técnico ${tecnico.nome}? Ele deixará de aparecer para novas atribuições.`

    if (!window.confirm(mensagem)) return

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      const { error } = await supabase.rpc('atualizar_tecnico', {
        p_id: tecnico.id,
        p_nome: tecnico.nome,
        p_percentual_comissao: Number(tecnico.percentual_comissao ?? 0),
        p_ativo: desejaAtivar,
      })

      if (error) throw error

      setSucesso(desejaAtivar ? 'Técnico ativado.' : 'Técnico inativado.')
      await carregarTecnicos()
    } catch (error: any) {
      console.error('Erro ao alterar status do técnico:', error)
      setErro(error?.message || 'Não foi possível alterar o status do técnico.')
    } finally {
      setSalvando(false)
    }
  }

  if (!administracaoPermitida) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.card}>
            <h1 style={styles.title}>Acesso restrito</h1>
            <p style={styles.muted}>Somente administradores podem cadastrar e alterar técnicos.</p>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate('/')}>
              VOLTAR AO DASHBOARD
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.kicker}>ADMINISTRAÇÃO</div>
            <h1 style={styles.title}>Técnicos</h1>
            <p style={styles.muted}>Cadastre o técnico e defina a porcentagem usada nas próximas O.S.</p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/')}>
            ← DASHBOARD
          </button>
        </div>

        {erro && <div style={styles.error}>{erro}</div>}
        {sucesso && <div style={styles.success}>{sucesso}</div>}

        <section style={styles.card}>
          <div style={styles.sectionTitle}>{modoEdicaoId ? 'EDITAR TÉCNICO' : 'NOVO TÉCNICO'}</div>

          <div style={styles.formGrid}>
            <label style={styles.field}>
              <span style={styles.label}>NOME</span>
              <input
                value={nome}
                onChange={event => setNome(event.target.value)}
                placeholder="Nome do técnico"
                maxLength={120}
                disabled={salvando}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>COMISSÃO (%)</span>
              <input
                value={percentual}
                onChange={event => setPercentual(event.target.value.replace(/[^0-9,\.]/g, ''))}
                placeholder="Ex.: 25"
                inputMode="decimal"
                disabled={salvando}
                style={styles.input}
              />
            </label>
          </div>

          <div style={styles.formActions}>
            <button type="button" style={styles.primaryButton} onClick={() => void salvarTecnico()} disabled={salvando}>
              {salvando ? 'SALVANDO...' : modoEdicaoId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR TÉCNICO'}
            </button>
            {modoEdicaoId && (
              <button type="button" style={styles.secondaryButton} onClick={limparFormulario} disabled={salvando}>
                CANCELAR
              </button>
            )}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <div style={styles.sectionTitle}>TÉCNICOS CADASTRADOS</div>
              <div style={styles.countText}>{tecnicos.length} técnico(s)</div>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={() => void carregarTecnicos()} disabled={carregando || salvando}>
              ↻ ATUALIZAR
            </button>
          </div>

          {carregando ? (
            <div style={styles.empty}>Carregando técnicos...</div>
          ) : tecnicos.length === 0 ? (
            <div style={styles.empty}>Nenhum técnico cadastrado.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>NOME</th>
                    <th style={styles.th}>CÓDIGO</th>
                    <th style={styles.th}>COMISSÃO</th>
                    <th style={styles.th}>STATUS</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.map(tecnico => (
                    <tr key={tecnico.id}>
                      <td style={styles.tdStrong}>{tecnico.nome}</td>
                      <td style={styles.td}>
                        <span style={styles.codeBadge}>{tecnico.codigo_acesso || '---'}</span>
                      </td>
                      <td style={styles.tdStrong}>{formatarPercentual(tecnico.percentual_comissao)}</td>
                      <td style={styles.td}>
                        <span style={tecnico.ativo ? styles.activeBadge : styles.inactiveBadge}>
                          {tecnico.ativo ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td style={styles.tdActions}>
                        <button type="button" style={styles.smallButton} onClick={() => iniciarEdicao(tecnico)} disabled={salvando}>
                          EDITAR
                        </button>
                        <button type="button" style={styles.smallDangerButton} onClick={() => void alternarAtivo(tecnico)} disabled={salvando}>
                          {tecnico.ativo ? 'INATIVAR' : 'ATIVAR'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { width: '100%', maxWidth: 1200, margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  kicker: { color: '#e30613', fontSize: 11, fontWeight: 900, letterSpacing: 1 },
  title: { margin: '5px 0 4px', color: '#fff', fontSize: 28 },
  muted: { margin: 0, color: '#8d8d8d', lineHeight: 1.5 },
  card: { background: '#111', border: '1px solid #2e2e2e', borderRadius: 14, padding: 18, marginBottom: 18 },
  sectionTitle: { color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: 0.6 },
  sectionHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  countText: { marginTop: 4, color: '#777', fontSize: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(160px, 1fr)', gap: 14, marginTop: 15 },
  field: { display: 'grid', gap: 7 },
  label: { color: '#888', fontSize: 10, fontWeight: 900 },
  input: { width: '100%', minHeight: 44, border: '1px solid #3b3b3b', borderRadius: 9, background: '#1a1a1a', color: '#fff', padding: '10px 12px', outline: 'none' },
  formActions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  primaryButton: { border: 'none', borderRadius: 9, background: '#e30613', color: '#fff', padding: '11px 15px', fontWeight: 900, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #444', borderRadius: 9, background: '#1b1b1b', color: '#fff', padding: '10px 13px', fontWeight: 800, cursor: 'pointer' },
  smallButton: { border: '1px solid #4a4a4a', borderRadius: 7, background: '#202020', color: '#fff', padding: '7px 9px', fontSize: 10, fontWeight: 900, cursor: 'pointer' },
  smallDangerButton: { border: '1px solid #5b2b2b', borderRadius: 7, background: '#2a1515', color: '#ff9292', padding: '7px 9px', fontSize: 10, fontWeight: 900, cursor: 'pointer' },
  error: { marginBottom: 14, padding: 12, border: '1px solid #6f1f1f', borderRadius: 9, background: '#291010', color: '#ff9999' },
  success: { marginBottom: 14, padding: 12, border: '1px solid #285c32', borderRadius: 9, background: '#122316', color: '#8ee69a' },
  empty: { padding: '35px 15px', textAlign: 'center', color: '#777' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760 },
  th: { textAlign: 'left', padding: '11px 10px', color: '#777', fontSize: 10, fontWeight: 900, borderBottom: '1px solid #2e2e2e' },
  td: { padding: '12px 10px', color: '#aaa', borderBottom: '1px solid #242424', verticalAlign: 'middle' },
  tdStrong: { padding: '12px 10px', color: '#fff', borderBottom: '1px solid #242424', verticalAlign: 'middle', fontWeight: 800 },
  tdActions: { padding: '10px', borderBottom: '1px solid #242424', textAlign: 'right', whiteSpace: 'nowrap' },
  codeBadge: { display: 'inline-block', minWidth: 46, textAlign: 'center', padding: '5px 8px', borderRadius: 7, background: '#252525', border: '1px solid #3d3d3d', color: '#fff', fontWeight: 900, letterSpacing: 1 },
  activeBadge: { display: 'inline-block', padding: '5px 8px', borderRadius: 999, background: '#16351a', color: '#70d77c', fontSize: 10, fontWeight: 900 },
  inactiveBadge: { display: 'inline-block', padding: '5px 8px', borderRadius: 999, background: '#2a2a2a', color: '#999', fontSize: 10, fontWeight: 900 },
}
