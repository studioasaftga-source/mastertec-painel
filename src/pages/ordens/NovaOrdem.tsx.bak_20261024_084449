import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../../components/layout/Layout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type TipoItem = 'servico' | 'peca'

type Linha = {
  id: string
  tipo: TipoItem
  descricao: string
  quantidade: string
  valor: string
}

type Tecnico = {
  id: string
  nome: string
  percentual_comissao: number | null
  usa_comissao: boolean | null
  ativo: boolean | null
}

function novoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function converterNumero(valor: string) {
  if (!valor) return 0

  let texto = valor.trim().replace(/\s/g, '').replace(/R\$/gi, '')

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  }

  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : 0
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function NovaOrdem() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [placa, setPlaca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState('')
  const [frota, setFrota] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [prioridade, setPrioridade] = useState('normal')
  const [tecnicoId, setTecnicoId] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([
    {
      id: novoId(),
      tipo: 'servico',
      descricao: '',
      quantidade: '1',
      valor: '',
    },
  ])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregarTecnicos = useCallback(async () => {
    if (!usuario?.empresa_id || usuario.role !== 'admin') {
      setTecnicos([])
      return
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id,nome,percentual_comissao,usa_comissao,ativo')
      .eq('empresa_id', usuario.empresa_id)
      .eq('ativo', true)
      .eq('usa_comissao', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar técnicos:', error)
      return
    }

    setTecnicos((data ?? []) as Tecnico[])
  }, [usuario?.empresa_id, usuario?.role])

  useEffect(() => {
    void carregarTecnicos()
  }, [carregarTecnicos])

  const tecnicoSelecionado = useMemo(
    () => tecnicos.find(tecnico => tecnico.id === tecnicoId) ?? null,
    [tecnicos, tecnicoId],
  )

  const totais = useMemo(() => {
    return linhas.reduce(
      (acc, linha) => {
        const quantidade = converterNumero(linha.quantidade) || 1
        const valor = converterNumero(linha.valor)
        const total = quantidade * valor

        if (linha.tipo === 'peca') {
          acc.pecas += total
        } else {
          acc.servicos += total
        }

        acc.total += total
        return acc
      },
      { servicos: 0, pecas: 0, total: 0 },
    )
  }, [linhas])

  const percentual = Number(tecnicoSelecionado?.percentual_comissao ?? 0)
  const comissao = (totais.servicos * percentual) / 100

  function atualizarLinha(
    id: string,
    campo: keyof Omit<Linha, 'id'>,
    valor: string,
  ) {
    setLinhas(atual =>
      atual.map(linha =>
        linha.id === id ? { ...linha, [campo]: valor } : linha,
      ),
    )
  }

  function removerLinha(id: string) {
    setLinhas(atual => atual.filter(linha => linha.id !== id))
  }

  function adicionarLinha(tipo: TipoItem) {
    setLinhas(atual => [
      ...atual,
      {
        id: novoId(),
        tipo,
        descricao: '',
        quantidade: '1',
        valor: '',
      },
    ])
  }

  async function salvar() {
    setErro('')

    if (usuario?.role !== 'admin') {
      setErro('Somente administradores podem criar uma O.S. por esta tela.')
      return
    }

    if (!cliente.trim()) {
      setErro('Informe o nome do cliente.')
      return
    }

    if (!placa.trim()) {
      setErro('Informe a placa do veículo.')
      return
    }

    if (!modelo.trim()) {
      setErro('Informe o modelo do veículo.')
      return
    }

    if (!titulo.trim()) {
      setErro('Informe o título/serviço principal da O.S.')
      return
    }

    const itens = linhas
      .map(linha => ({
        tipo: linha.tipo,
        descricao: linha.descricao.trim(),
        quantidade: converterNumero(linha.quantidade) || 1,
        valor: converterNumero(linha.valor),
      }))
      .filter(linha => linha.descricao || linha.valor > 0)

    try {
      setSalvando(true)

      const { data, error } = await supabase.rpc('criar_os_manual', {
        p_cliente_nome: cliente.trim(),
        p_telefone: telefone.trim() || null,
        p_placa: placa.trim().toUpperCase(),
        p_modelo: modelo.trim(),
        p_ano: ano.trim() ? Number(ano) : null,
        p_frota: frota.trim() || null,
        p_titulo: titulo.trim(),
        p_descricao: descricao.trim() || null,
        p_observacoes: observacoes.trim() || null,
        p_prioridade: prioridade,
        p_responsavel_id: tecnicoId || null,
        p_itens: itens,
      })

      if (error) throw error

      const ordemId = String(data || '')

      if (!ordemId) {
        throw new Error('A O.S. foi criada, mas o identificador não foi retornado.')
      }

      alert('O.S. criada com sucesso!')
      navigate(`/ordens/${ordemId}`)
    } catch (error: any) {
      console.error('Erro ao criar O.S. manual:', error)
      setErro(error?.message || 'Não foi possível criar a O.S.')
    } finally {
      setSalvando(false)
    }
  }

  if (usuario?.role !== 'admin') {
    return (
      <Layout>
        <div style={styles.page}>
          <section style={styles.card}>
            <div style={styles.kicker}>ADMINISTRAÇÃO</div>
            <h1 style={styles.title}>Nova O.S.</h1>
            <p style={styles.muted}>Esta tela está disponível somente para administradores.</p>
            <button type="button" onClick={() => navigate('/ordens')} style={styles.secondaryButton}>
              ← VOLTAR
            </button>
          </section>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>MASTERTEC • ADMINISTRAÇÃO</div>
            <h1 style={styles.title}>Nova O.S.</h1>
            <p style={styles.muted}>
              Crie uma O.S. manualmente, monte o orçamento e já encaminhe para o técnico.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/ordens')} style={styles.secondaryButton}>
            ← VOLTAR
          </button>
        </div>

        {erro && <div style={styles.error}>{erro}</div>}

        <section style={styles.card}>
          <div style={styles.sectionTitle}>CLIENTE E VEÍCULO</div>
          <div style={styles.grid}>
            <div style={styles.fieldWide}>
              <label style={styles.label}>CLIENTE *</label>
              <input value={cliente} onChange={e => setCliente(e.target.value)} style={styles.input} placeholder="Nome do cliente" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>TELEFONE</label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)} style={styles.input} placeholder="(65) 99999-9999" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>PLACA *</label>
              <input value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} style={styles.input} placeholder="ABC1D23" maxLength={7} />
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>MODELO *</label>
              <input value={modelo} onChange={e => setModelo(e.target.value)} style={styles.input} placeholder="Caminhão / veículo" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>ANO</label>
              <input value={ano} onChange={e => setAno(e.target.value)} style={styles.input} inputMode="numeric" placeholder="2020" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>FROTA</label>
              <input value={frota} onChange={e => setFrota(e.target.value)} style={styles.input} placeholder="Número da frota" />
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionTitle}>DADOS DA O.S.</div>
          <div style={styles.grid}>
            <div style={styles.fieldWide}>
              <label style={styles.label}>TÍTULO / SERVIÇO PRINCIPAL *</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} style={styles.input} placeholder="Ex.: Reparo de bomba injetora" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>PRIORIDADE</label>
              <select value={prioridade} onChange={e => setPrioridade(e.target.value)} style={styles.input}>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>DESCRIÇÃO</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={styles.textarea} placeholder="Descrição inicial do orçamento/serviço" />
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>OBSERVAÇÕES</label>
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} style={styles.textarea} placeholder="Observações para a oficina" />
            </div>

            <div style={styles.fieldWide}>
              <label style={styles.label}>TÉCNICO RESPONSÁVEL</label>
              <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} style={styles.input}>
                <option value="">Deixar sem técnico por enquanto</option>
                {tecnicos.map(tecnico => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome} — {Number(tecnico.percentual_comissao ?? 0).toLocaleString('pt-BR')}% comissão
                  </option>
                ))}
              </select>
              <div style={styles.help}>
                Só aparecem técnicos ativos habilitados para O.S. no PWA.
              </div>
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTitle}>SERVIÇOS E PEÇAS</div>
              <div style={styles.mutedSmall}>Serviços geram comissão. Peças entram no total, mas não geram comissão.</div>
            </div>
            <div style={styles.buttonsRow}>
              <button type="button" onClick={() => adicionarLinha('servico')} style={styles.secondaryButton}>+ SERVIÇO</button>
              <button type="button" onClick={() => adicionarLinha('peca')} style={styles.secondaryButton}>+ PEÇA</button>
            </div>
          </div>

          <div style={styles.itemsTable}>
            <div style={styles.tableHeader}>
              <div>TIPO</div>
              <div>DESCRIÇÃO</div>
              <div>QTD.</div>
              <div>VALOR UNIT.</div>
              <div>TOTAL</div>
              <div />
            </div>

            {linhas.map(linha => {
              const quantidade = converterNumero(linha.quantidade) || 1
              const valor = converterNumero(linha.valor)
              const total = quantidade * valor

              return (
                <div key={linha.id} style={styles.itemRow}>
                  <select value={linha.tipo} onChange={e => atualizarLinha(linha.id, 'tipo', e.target.value)} style={styles.inputCompact}>
                    <option value="servico">Serviço</option>
                    <option value="peca">Peça</option>
                  </select>
                  <input value={linha.descricao} onChange={e => atualizarLinha(linha.id, 'descricao', e.target.value)} style={styles.inputCompact} placeholder="Descrição" />
                  <input value={linha.quantidade} onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} style={{ ...styles.inputCompact, textAlign: 'center' }} inputMode="decimal" />
                  <input value={linha.valor} onChange={e => atualizarLinha(linha.id, 'valor', e.target.value)} style={{ ...styles.inputCompact, textAlign: 'right' }} inputMode="decimal" placeholder="0,00" />
                  <div style={styles.rowTotal}>{moeda(total)}</div>
                  <button type="button" onClick={() => removerLinha(linha.id)} style={styles.deleteButton}>×</button>
                </div>
              )
            })}
          </div>
        </section>

        <section style={styles.totalGrid}>
          <div style={styles.summaryCard}>
            <span>SERVIÇOS</span>
            <strong>{moeda(totais.servicos)}</strong>
          </div>
          <div style={styles.summaryCard}>
            <span>PEÇAS</span>
            <strong>{moeda(totais.pecas)}</strong>
          </div>
          <div style={styles.summaryCard}>
            <span>COMISSÃO {tecnicoSelecionado ? `(${percentual.toLocaleString('pt-BR')}%)` : ''}</span>
            <strong style={{ color: '#72dc7d' }}>{moeda(comissao)}</strong>
          </div>
          <div style={{ ...styles.summaryCard, borderColor: '#e30613' }}>
            <span>TOTAL DA O.S.</span>
            <strong style={{ color: '#fff', fontSize: 22 }}>{moeda(totais.total)}</strong>
          </div>
        </section>

        <div style={styles.footerActions}>
          <button type="button" onClick={() => navigate('/ordens')} disabled={salvando} style={styles.secondaryButton}>
            CANCELAR
          </button>
          <button type="button" onClick={() => void salvar()} disabled={salvando} style={styles.primaryButton}>
            {salvando ? 'CRIANDO O.S....' : 'CRIAR O.S.'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { width: '100%', maxWidth: 1200, minHeight: '100vh', margin: '0 auto', padding: '22px 24px 40px', boxSizing: 'border-box', background: '#080808', color: '#fff' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 18 },
  kicker: { color: '#e30613', fontSize: 11, fontWeight: 900, letterSpacing: 1.2 },
  title: { margin: '4px 0 5px', fontSize: 28, fontWeight: 900 },
  muted: { margin: 0, color: '#888', fontSize: 13, lineHeight: 1.5 },
  mutedSmall: { color: '#777', fontSize: 11, lineHeight: 1.4 },
  card: { background: '#111', border: '1px solid #2b2b2b', borderRadius: 14, padding: 18, marginBottom: 14 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: 900, marginBottom: 12, letterSpacing: .4 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  field: { minWidth: 0 },
  fieldWide: { minWidth: 0, gridColumn: 'span 2' },
  label: { display: 'block', color: '#999', fontSize: 10, fontWeight: 900, marginBottom: 5 },
  input: { width: '100%', boxSizing: 'border-box', height: 42, borderRadius: 8, border: '1px solid #3b3b40', background: '#1a1a1d', color: '#fff', padding: '0 12px', outline: 'none', fontSize: 14 },
  inputCompact: { width: '100%', boxSizing: 'border-box', height: 38, borderRadius: 7, border: '1px solid #36363b', background: '#18181b', color: '#fff', padding: '0 9px', outline: 'none', fontSize: 13 },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: 85, resize: 'vertical', borderRadius: 8, border: '1px solid #3b3b40', background: '#1a1a1d', color: '#fff', padding: 12, outline: 'none', fontSize: 14, fontFamily: 'inherit' },
  help: { color: '#666', fontSize: 10, marginTop: 5 },
  buttonsRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryButton: { border: 'none', background: '#e30613', color: '#fff', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontWeight: 900 },
  secondaryButton: { border: '1px solid #414145', background: '#242427', color: '#fff', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 800 },
  error: { marginBottom: 14, padding: 14, borderRadius: 10, border: '1px solid #e30613', background: '#351014', color: '#fff', fontWeight: 700 },
  itemsTable: { display: 'flex', flexDirection: 'column', gap: 8, overflowX: 'auto' },
  tableHeader: { display: 'grid', gridTemplateColumns: '130px minmax(240px,1fr) 90px 130px 130px 42px', gap: 8, padding: '0 8px 4px', color: '#777', fontSize: 9, fontWeight: 900, minWidth: 790 },
  itemRow: { display: 'grid', gridTemplateColumns: '130px minmax(240px,1fr) 90px 130px 130px 42px', gap: 8, alignItems: 'center', minWidth: 790 },
  rowTotal: { color: '#fff', fontWeight: 900, textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13 },
  deleteButton: { width: 38, height: 38, border: '1px solid #5b2024', background: '#321215', color: '#ff5a66', borderRadius: 7, cursor: 'pointer', fontSize: 18, fontWeight: 800 },
  totalGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 },
  summaryCard: { padding: 14, background: '#111', border: '1px solid #2b2b2b', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 5 },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
}
