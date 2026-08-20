import { useEffect, useMemo, useState } from 'react'

import Layout from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'

interface EntradaVeiculo {
  id: string
  empresa_id: string
  placa: string | null
  ano: number | null
  modelo: string | null
  cliente_nome: string
  telefone: string | null
  foto_url: string | null
  foto_url_2: string | null
  criado_em: string
  tipo_entrada: string | null
  tipo_peca: string | null
  descricao_peca: string | null
  observacao: string | null
  frota: string | null
}

interface EntradaComFoto extends EntradaVeiculo {
  foto_exibicao: string | null
  foto_exibicao_2: string | null
}

type FiltroTipo = 'todos' | 'veiculos' | 'pecas'

function obterDataCuiaba() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function criarInicioDoDia(data: string) {
  return new Date(`${data}T00:00:00-04:00`).toISOString()
}

function criarInicioDoDiaSeguinte(data: string) {
  const inicio = new Date(`${data}T00:00:00-04:00`)

  inicio.setUTCDate(inicio.getUTCDate() + 1)

  return inicio.toISOString()
}

function obterCaminhoStorage(valor: string) {
  let caminho = valor.trim()

  caminho = caminho.replace(/^\/+/, '')

  caminho = caminho.replace(/^fotos-entrada\//, '')

  const marcadores = [
    '/storage/v1/object/public/fotos-entrada/',
    '/storage/v1/object/sign/fotos-entrada/',
    '/storage/v1/object/authenticated/fotos-entrada/',
  ]

  for (const marcador of marcadores) {
    const posicao = caminho.indexOf(marcador)

    if (posicao !== -1) {
      caminho = caminho.substring(
        posicao + marcador.length,
      )

      break
    }
  }

  caminho = caminho.split('?')[0]

  return caminho
}

// =====================================================
// ÍCONE WHATSAPP
// =====================================================

function IconeWhatsApp() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 .16.16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L.05 24l6.29-1.65a11.88 11.88 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.43ZM12.07 21.8h-.01a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.73.98 1-3.64-.23-.37a9.87 9.87 0 0 1-1.51-5.28C2.19 6.44 6.62 2 12.07 2c2.64 0 5.12 1.03 6.99 2.91a9.84 9.84 0 0 1 2.9 7c0 5.45-4.44 9.89-9.89 9.89Zm5.42-7.41c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.65-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Dashboard() {
  const [entradas, setEntradas] =
    useState<EntradaComFoto[]>([])

  const [loading, setLoading] = useState(true)

  const [erro, setErro] = useState('')

  const [busca, setBusca] = useState('')

  const [dataFiltro, setDataFiltro] =
    useState(obterDataCuiaba())

  const [filtroTipo, setFiltroTipo] =
    useState<FiltroTipo>('todos')

  const [entradaAberta, setEntradaAberta] =
    useState<string | null>(null)

  const [fotoAberta, setFotoAberta] =
    useState<string | null>(null)

  // =====================================================
  // EDIÇÃO
  // =====================================================

  const [editandoId, setEditandoId] =
    useState<string | null>(null)

  const [salvandoEdicao, setSalvandoEdicao] =
    useState(false)

  const [formEdicao, setFormEdicao] = useState({
    placa: '',
    modelo: '',
    ano: '',
    cliente_nome: '',
    telefone: '',
  })

  // =====================================================
  // EXCLUSÃO
  // =====================================================

  const [excluindoId, setExcluindoId] =
    useState<string | null>(null)

  // =====================================================
  // GERAR URL DA FOTO
  // =====================================================

  async function gerarUrlFoto(
    fotoUrl: string | null,
  ) {
    if (!fotoUrl) {
      return null
    }

    try {
      const caminho =
        obterCaminhoStorage(fotoUrl)

      if (!caminho) {
        return null
      }

      const { data, error } =
        await supabase.storage
          .from('fotos-entrada')
          .createSignedUrl(
            caminho,
            60 * 60,
          )

      if (!error && data?.signedUrl) {
        return data.signedUrl
      }

      const publicUrl =
        supabase.storage
          .from('fotos-entrada')
          .getPublicUrl(caminho)
          .data.publicUrl

      return publicUrl || null
    } catch (error) {
      console.error(
        'Erro ao gerar URL da foto:',
        error,
      )

      return null
    }
  }

  // =====================================================
  // CARREGAR ENTRADAS
  // =====================================================

  async function carregarEntradas() {
    try {
      setLoading(true)
      setErro('')

      const inicio =
        criarInicioDoDia(dataFiltro)

      const fim =
        criarInicioDoDiaSeguinte(dataFiltro)

      const { data, error } =
        await supabase
          .from('entradas_veiculos')
          .select(
            `
              id,
              empresa_id,
              placa,
              ano,
              modelo,
              cliente_nome,
              telefone,
              foto_url,
              foto_url_2,
              criado_em,
              tipo_entrada,
              tipo_peca,
              descricao_peca,
              observacao,
              frota
            `,
          )
          .gte('criado_em', inicio)
          .lt('criado_em', fim)
          .order('criado_em', {
            ascending: false,
          })

      if (error) {
        throw error
      }

      const registros = data ?? []

      const registrosComFotos =
        await Promise.all(
          registros.map(async (entrada) => {
            const [
              fotoExibicao,
              fotoExibicao2,
            ] = await Promise.all([
              gerarUrlFoto(
                entrada.foto_url,
              ),
              gerarUrlFoto(
                entrada.foto_url_2,
              ),
            ])

            return {
              ...entrada,
              foto_exibicao:
                fotoExibicao,
              foto_exibicao_2:
                fotoExibicao2,
            }
          }),
        )

      setEntradas(registrosComFotos)
      setEntradaAberta(null)
      setEditandoId(null)
    } catch (error) {
      console.error(
        'Erro ao carregar entradas:',
        error,
      )

      setErro(
        'Não foi possível carregar as entradas.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEntradas()
  }, [dataFiltro])

  // =====================================================
  // IDENTIFICAR TIPO
  // =====================================================

  function ehPeca(
    entrada: EntradaVeiculo,
  ) {
    return (
      entrada.tipo_entrada?.toLowerCase() ===
        'peca' ||
      entrada.tipo_entrada?.toLowerCase() ===
        'peça'
    )
  }

  function ehVeiculo(
    entrada: EntradaVeiculo,
  ) {
    return !ehPeca(entrada)
  }

  // =====================================================
  // CONTADORES
  // =====================================================

  const totalEntradas =
    entradas.length

  const totalVeiculos =
    entradas.filter(
      (entrada) => ehVeiculo(entrada),
    ).length

  const totalPecas =
    entradas.filter(
      (entrada) => ehPeca(entrada),
    ).length

  // =====================================================
  // ABRIR / FECHAR
  // =====================================================

  function alternarEntrada(id: string) {
    if (editandoId) {
      return
    }

    setEntradaAberta((atual) =>
      atual === id ? null : id,
    )

    setEditandoId(null)
  }

  // =====================================================
  // FORMATAR DATA
  // =====================================================

  function formatarData(data: string) {
    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Cuiaba',
      },
    ).format(new Date(data))
  }

  function formatarDataSelecionada(
    data: string,
  ) {
    if (!data) {
      return ''
    }

    const [ano, mes, dia] =
      data.split('-')

    return `${dia}/${mes}/${ano}`
  }

  // =====================================================
  // WHATSAPP
  // =====================================================

  function obterSaudacao() {
    const horaTexto =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Cuiaba',
          hour: '2-digit',
          hour12: false,
        },
      ).format(new Date())

    const hora = Number(horaTexto)

    if (hora < 12) {
      return 'Bom dia'
    }

    if (hora < 18) {
      return 'Boa tarde'
    }

    return 'Boa noite'
  }

  function formatarNumeroWhatsApp(
    telefone: string,
  ) {
    let numero =
      telefone.replace(/\D/g, '')

    if (!numero) {
      return ''
    }

    if (!numero.startsWith('55')) {
      numero = `55${numero}`
    }

    return numero
  }

  // =====================================================
  // WHATSAPP DO CLIENTE
  // =====================================================

  function abrirWhatsAppCliente(
    entrada: EntradaVeiculo,
  ) {
    if (!entrada.telefone) {
      alert(
        'Este cliente não possui telefone cadastrado.',
      )
      return
    }

    const numero =
      formatarNumeroWhatsApp(
        entrada.telefone,
      )

    if (!numero) {
      alert('Telefone inválido.')
      return
    }

    const saudacao =
      obterSaudacao()

    const nome =
      entrada.cliente_nome?.trim() ||
      'cliente'

    let mensagem = ''

    if (ehPeca(entrada)) {
      const descricao =
        entrada.descricao_peca?.trim() ||
        'Não informada'

      // CORRIGIDO:
      // O PWA salva o modelo/código da peça
      // na coluna "modelo".
      const modeloCodigo =
        entrada.modelo?.trim() ||
        'Não informado'

      mensagem =
        `${saudacao}, ${nome}!\n\n` +
        `Estou entrando em contato para falar sobre a peça que foi deixada na Diesel Center.\n\n` +
        `*Descrição da peça:* ${descricao}\n` +
        `*Modelo ou código da peça:* ${modeloCodigo}\n\n` +
        `Qualquer dúvida, estamos à disposição.`
    } else {
      const modelo =
        entrada.modelo?.trim() ||
        'Não informado'

      const placa =
        entrada.placa?.trim() ||
        'Não informada'

      const ano =
        entrada.ano
          ? String(entrada.ano)
          : 'Não informado'

      mensagem =
        `${saudacao}, ${nome}!\n\n` +
        `Estou entrando em contato para falar sobre o seu veículo que está na Diesel Center.\n\n` +
        `*Veículo:* ${modelo}\n` +
        `*Placa:* ${placa}\n` +
        `*Ano:* ${ano}\n\n` +
        `Qualquer dúvida, estamos à disposição.`
    }

    const url =
      `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensagem)}`

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    )
  }

  // =====================================================
  // WHATSAPP DA EMPRESA
  // =====================================================

  function abrirWhatsAppEmpresa(
    entrada: EntradaVeiculo,
  ) {
    const numeroEmpresa =
      '556599865717'

    const saudacao =
      obterSaudacao()

    const cliente =
      entrada.cliente_nome?.trim() ||
      'Não informado'

    const telefone =
      entrada.telefone?.trim() ||
      'Não informado'

    let mensagem = ''

    if (ehPeca(entrada)) {
      const descricaoPeca =
        entrada.descricao_peca?.trim() ||
        'Não informada'

      // CORRIGIDO:
      // O modelo/código da peça está em "modelo".
      const modeloCodigo =
        entrada.modelo?.trim() ||
        'Não informado'

      const observacao =
        entrada.observacao?.trim() ||
        'Nenhuma'

      mensagem =
        `*NOVA ENTRADA DE PEÇA - DIESEL CENTER*\n\n` +
        `${saudacao}!\n\n` +
        `*DESCRIÇÃO DA PEÇA:* ${descricaoPeca}\n` +
        `*MODELO OU CÓDIGO DA PEÇA:* ${modeloCodigo}\n` +
        `*NOME COMPLETO DO CLIENTE:* ${cliente}\n` +
        `*TELEFONE:* ${telefone}\n` +
        `*OBSERVAÇÃO:* ${observacao}\n\n` +
        `Entrada registrada pelo sistema.`
    } else {
      const placa =
        entrada.placa?.trim() ||
        'Não informada'

      const modelo =
        entrada.modelo?.trim() ||
        'Não informado'

      const ano =
        entrada.ano
          ? String(entrada.ano)
          : 'Não informado'

      const frota =
        entrada.frota?.trim() ||
        'Não informada'

      const observacao =
        entrada.observacao?.trim() ||
        'Nenhuma'

      mensagem =
        `*NOVA ENTRADA DE VEÍCULO - DIESEL CENTER*\n\n` +
        `${saudacao}!\n\n` +
        `*CLIENTE:* ${cliente}\n` +
        `*VEÍCULO:* ${modelo}\n` +
        `*PLACA:* ${placa}\n` +
        `*ANO:* ${ano}\n` +
        `*FROTA:* ${frota}\n` +
        `*TELEFONE:* ${telefone}\n` +
        `*OBSERVAÇÃO:* ${observacao}\n\n` +
        `Entrada registrada pelo sistema.`
    }

    const url =
      `https://web.whatsapp.com/send?phone=${numeroEmpresa}&text=${encodeURIComponent(mensagem)}`

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    )
  }

  // =====================================================
  // INICIAR EDIÇÃO
  // =====================================================

  function iniciarEdicao(
    entrada: EntradaVeiculo,
  ) {
    setEntradaAberta(entrada.id)

    setEditandoId(entrada.id)

    setFormEdicao({
      placa: entrada.placa || '',
      modelo: entrada.modelo || '',
      ano: entrada.ano
        ? String(entrada.ano)
        : '',
      cliente_nome:
        entrada.cliente_nome || '',
      telefone:
        entrada.telefone || '',
    })
  }

  // =====================================================
  // CANCELAR EDIÇÃO
  // =====================================================

  function cancelarEdicao() {
    setEditandoId(null)
  }

  // =====================================================
  // SALVAR EDIÇÃO
  // =====================================================

  async function salvarEdicao(id: string) {
    try {
      setSalvandoEdicao(true)

      const placa =
        formEdicao.placa
          .trim()
          .toUpperCase()

      const modelo =
        formEdicao.modelo.trim()

      const cliente =
        formEdicao.cliente_nome.trim()

      const telefone =
        formEdicao.telefone.trim()

      const anoTexto =
        formEdicao.ano.trim()

      if (!placa) {
        alert('Informe a placa.')
        return
      }

      if (!cliente) {
        alert(
          'Informe o nome do cliente.',
        )
        return
      }

      let ano: number | null = null

      if (anoTexto) {
        const anoNumero =
          Number(anoTexto)

        if (
          !Number.isInteger(
            anoNumero,
          )
        ) {
          alert(
            'O ano informado é inválido.',
          )
          return
        }

        ano = anoNumero
      }

      const { error } =
        await supabase
          .from('entradas_veiculos')
          .update({
            placa,
            modelo:
              modelo || null,
            ano,
            cliente_nome:
              cliente,
            telefone:
              telefone || null,
          })
          .eq('id', id)

      if (error) {
        throw error
      }

      setEntradas((atual) =>
        atual.map((entrada) =>
          entrada.id === id
            ? {
                ...entrada,
                placa,
                modelo:
                  modelo || null,
                ano,
                cliente_nome:
                  cliente,
                telefone:
                  telefone || null,
              }
            : entrada,
        ),
      )

      setEditandoId(null)

      alert(
        'Entrada atualizada com sucesso.',
      )
    } catch (error) {
      console.error(
        'Erro ao editar entrada:',
        error,
      )

      alert(
        'Não foi possível salvar as alterações.',
      )
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // =====================================================
  // EXCLUIR ENTRADA
  // =====================================================

  async function excluirEntrada(
    entrada: EntradaVeiculo,
  ) {
    const confirmou =
      window.confirm(
        `Tem certeza que deseja excluir a entrada da placa ${entrada.placa || entrada.cliente_nome}?`,
      )

    if (!confirmou) {
      return
    }

    try {
      setExcluindoId(entrada.id)

      const { error } =
        await supabase
          .from('entradas_veiculos')
          .delete()
          .eq('id', entrada.id)

      if (error) {
        throw error
      }

      setEntradas((atual) =>
        atual.filter(
          (item) =>
            item.id !== entrada.id,
        ),
      )

      setEntradaAberta(null)
      setEditandoId(null)

      alert(
        'Entrada excluída com sucesso.',
      )
    } catch (error) {
      console.error(
        'Erro ao excluir entrada:',
        error,
      )

      alert(
        'Não foi possível excluir a entrada. Verifique as permissões do Supabase.',
      )
    } finally {
      setExcluindoId(null)
    }
  }

  // =====================================================
  // FILTRO
  // =====================================================

  const entradasFiltradas =
    useMemo(() => {
      let resultado = [...entradas]

      if (filtroTipo === 'veiculos') {
        resultado =
          resultado.filter(
            (entrada) =>
              ehVeiculo(entrada),
          )
      }

      if (filtroTipo === 'pecas') {
        resultado =
          resultado.filter(
            (entrada) =>
              ehPeca(entrada),
          )
      }

      const termo =
        busca
          .trim()
          .toLowerCase()

      if (!termo) {
        return resultado
      }

      return resultado.filter(
        (entrada) => {
          const placa =
            entrada.placa
              ?.toLowerCase() || ''

          const cliente =
            entrada.cliente_nome
              ?.toLowerCase() || ''

          const modelo =
            entrada.modelo
              ?.toLowerCase() || ''

          const telefone =
            entrada.telefone
              ?.toLowerCase() || ''

          const tipoPeca =
            entrada.tipo_peca
              ?.toLowerCase() || ''

          const descricaoPeca =
            entrada.descricao_peca
              ?.toLowerCase() || ''

          return (
            placa.includes(termo) ||
            cliente.includes(termo) ||
            modelo.includes(termo) ||
            telefone.includes(termo) ||
            tipoPeca.includes(termo) ||
            descricaoPeca.includes(termo)
          )
        },
      )
    }, [entradas, busca, filtroTipo])

  // =====================================================
  // ESTILO DOS INPUTS
  // =====================================================

  const estiloInputEdicao = {
    width: '100%',
    boxSizing: 'border-box' as const,
    marginTop: '6px',
    padding: '9px 10px',
    background: '#151515',
    border: '1px solid #444',
    borderRadius: '7px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 600,
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <Layout>
        <div className="loading-screen">
          <div className="loading-content">
            <div className="loading-logo">
              MT
            </div>

            <h1>
              MASTER<span>TEC</span>
            </h1>

            <p>
              Carregando entradas...
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  // =====================================================
  // ERRO
  // =====================================================

  if (erro) {
    return (
      <Layout>
        <div className="loading-screen">
          <div className="loading-content">
            <div className="loading-logo">
              !
            </div>

            <h1>
              MASTER<span>TEC</span>
            </h1>

            <p>{erro}</p>

            <button
              onClick={carregarEntradas}
              style={{
                marginTop: '20px',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                background: '#e30613',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <Layout>
      <div
        style={{
          padding: '32px',
          color: '#fff',
        }}
      >
        {/* CABEÇALHO */}

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 800,
              }}
            >
              Entradas de Veículos e Peças
            </h1>

            <p
              style={{
                marginTop: '8px',
                marginBottom: 0,
                color: '#999',
              }}
            >
              Controle de entrada da oficina
            </p>

            <div
              style={{
                marginTop: '10px',
                color: '#e30613',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              DIESEL CENTER
            </div>
          </div>

          <button
            onClick={carregarEntradas}
            style={{
              padding: '10px 16px',
              border: '1px solid #333',
              borderRadius: '8px',
              background: '#1d1d1d',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ↻ Atualizar
          </button>
        </div>

        {/* FILTROS */}

        <div
          style={{
            marginTop: '28px',
            display: 'grid',
            gridTemplateColumns:
              'minmax(250px, 1fr) 190px auto',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '7px',
                color: '#888',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              BUSCAR ENTRADA
            </label>

            <div
              style={{
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: '13px',
                  top: '50%',
                  transform:
                    'translateY(-50%)',
                  color: '#666',
                  fontSize: '16px',
                }}
              >
                🔎
              </span>

              <input
                type="text"
                value={busca}
                onChange={(event) =>
                  setBusca(
                    event.target.value,
                  )
                }
                placeholder="Placa, cliente, telefone ou peça..."
                style={{
                  width: '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '12px 14px 12px 40px',
                  background: '#151515',
                  border:
                    '1px solid #292929',
                  borderRadius: '9px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '7px',
                color: '#888',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              DATA DAS ENTRADAS
            </label>

            <input
              type="date"
              value={dataFiltro}
              onChange={(event) =>
                setDataFiltro(
                  event.target.value,
                )
              }
              style={{
                width: '100%',
                boxSizing:
                  'border-box',
                padding: '11px 12px',
                background: '#151515',
                border:
                  '1px solid #292929',
                borderRadius: '9px',
                color: '#fff',
                outline: 'none',
                fontSize: '14px',
                colorScheme: 'dark',
              }}
            />
          </div>

          <button
            onClick={() => {
              setBusca('')
              setDataFiltro(
                obterDataCuiaba(),
              )
              setFiltroTipo('todos')
            }}
            style={{
              height: '42px',
              padding: '0 16px',
              border:
                '1px solid #333',
              borderRadius: '9px',
              background: '#1d1d1d',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Limpar
          </button>
        </div>

        {/* CARDS */}

        <div
          style={{
            marginTop: '24px',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              setFiltroTipo('todos')
            }
            style={{
              textAlign: 'left',
              padding: '20px',
              background:
                filtroTipo === 'todos'
                  ? '#1b1b1b'
                  : '#151515',
              border:
                filtroTipo === 'todos'
                  ? '1px solid #e30613'
                  : '1px solid #292929',
              borderRadius: '14px',
              borderLeft:
                '3px solid #e30613',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: '#888',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              TOTAL DE ENTRADAS
            </div>

            <div
              style={{
                marginTop: '8px',
                fontSize: '32px',
                fontWeight: 800,
              }}
            >
              {totalEntradas}
            </div>

            <div
              style={{
                marginTop: '5px',
                color: '#666',
                fontSize: '12px',
              }}
            >
              Veículos + peças
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroTipo('veiculos')
            }
            style={{
              textAlign: 'left',
              padding: '20px',
              background:
                filtroTipo === 'veiculos'
                  ? '#1b1b1b'
                  : '#151515',
              border:
                filtroTipo === 'veiculos'
                  ? '1px solid #e30613'
                  : '1px solid #292929',
              borderRadius: '14px',
              borderLeft:
                '3px solid #e30613',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: '#888',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ENTRADAS DE VEÍCULOS
            </div>

            <div
              style={{
                marginTop: '8px',
                fontSize: '32px',
                fontWeight: 800,
              }}
            >
              {totalVeiculos}
            </div>

            <div
              style={{
                marginTop: '5px',
                color: '#666',
                fontSize: '12px',
              }}
            >
              Clique para visualizar
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroTipo('pecas')
            }
            style={{
              textAlign: 'left',
              padding: '20px',
              background:
                filtroTipo === 'pecas'
                  ? '#1b1b1b'
                  : '#151515',
              border:
                filtroTipo === 'pecas'
                  ? '1px solid #e30613'
                  : '1px solid #292929',
              borderRadius: '14px',
              borderLeft:
                '3px solid #e30613',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: '#888',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ENTRADAS DE PEÇAS
            </div>

            <div
              style={{
                marginTop: '8px',
                fontSize: '32px',
                fontWeight: 800,
              }}
            >
              {totalPecas}
            </div>

            <div
              style={{
                marginTop: '5px',
                color: '#666',
                fontSize: '12px',
              }}
            >
              Clique para visualizar
            </div>
          </button>
        </div>

        {/* ENTRADAS */}

        <section
          style={{
            marginTop: '30px',
            padding: '24px',
            background: '#151515',
            border:
              '1px solid #292929',
            borderRadius: '16px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '19px',
              }}
            >
              {filtroTipo === 'todos'
                ? 'Todas as entradas'
                : filtroTipo ===
                  'veiculos'
                ? 'Entradas de veículos'
                : 'Entradas de peças'}{' '}
              de{' '}
              {formatarDataSelecionada(
                dataFiltro,
              )}
            </h2>

            <p
              style={{
                marginTop: '6px',
                marginBottom: 0,
                color: '#777',
                fontSize: '13px',
              }}
            >
              {busca
                ? `Resultado da busca por "${busca}".`
                : filtroTipo === 'todos'
                ? 'Veículos e peças registrados pelo PWA.'
                : filtroTipo ===
                  'veiculos'
                ? 'Veículos registrados pelo PWA.'
                : 'Peças registradas pelo PWA.'}
            </p>
          </div>

          {entradasFiltradas.length ===
          0 ? (
            <div
              style={{
                marginTop: '25px',
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: '12px',
                background: '#0d0d0d',
                border:
                  '1px dashed #292929',
              }}
            >
              <div
                style={{
                  fontSize: '35px',
                  marginBottom: '10px',
                }}
              >
                {filtroTipo === 'pecas'
                  ? '🔧'
                  : '🚚'}
              </div>

              <p
                style={{
                  margin: 0,
                  color: '#777',
                }}
              >
                {busca
                  ? 'Nenhuma entrada encontrada para essa busca.'
                  : 'Nenhuma entrada registrada nesta data.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                marginTop: '22px',
                display: 'grid',
                gap: '10px',
              }}
            >
              {entradasFiltradas.map(
                (entrada) => {
                  const aberta =
                    entradaAberta ===
                    entrada.id

                  const editando =
                    editandoId ===
                    entrada.id

                  const excluindo =
                    excluindoId ===
                    entrada.id

                  const peca =
                    ehPeca(entrada)

                  return (
                    <div
                      key={
                        entrada.id
                      }
                      style={{
                        background:
                          '#0d0d0d',
                        border:
                          aberta
                            ? '1px solid #e30613'
                            : '1px solid #242424',
                        borderRadius:
                          '12px',
                        overflow:
                          'hidden',
                      }}
                    >
                      <button
                        type="button"
                        disabled={editando}
                        onClick={() =>
                          alternarEntrada(
                            entrada.id,
                          )
                        }
                        style={{
                          width: '100%',
                          display: 'grid',
                          gridTemplateColumns:
                            'auto 1fr auto',
                          gap: '16px',
                          alignItems:
                            'center',
                          padding:
                            '16px 18px',
                          border: 'none',
                          background:
                            'transparent',
                          color: '#fff',
                          cursor:
                            editando
                              ? 'default'
                              : 'pointer',
                          textAlign:
                            'left',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems:
                              'center',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              width: '9px',
                              height: '9px',
                              borderRadius:
                                '50%',
                              background:
                                '#e30613',
                            }}
                          />

                          <span
                            style={{
                              padding:
                                '5px 9px',
                              background:
                                'rgba(227, 6, 19, 0.12)',
                              color:
                                '#e30613',
                              borderRadius:
                                '5px',
                              fontSize:
                                '10px',
                              fontWeight: 800,
                            }}
                          >
                            {peca
                              ? 'PEÇA'
                              : 'VEÍCULO'}
                          </span>
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          {peca ? (
                            <>
                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: '10px',
                                  flexWrap:
                                    'wrap',
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize:
                                      '17px',
                                  }}
                                >
                                  {/* CORRIGIDO:
                                      modelo/código da peça vem de "modelo" */}
                                  {entrada.modelo ||
                                    'Modelo/código não informado'}
                                </strong>

                                <span
                                  style={{
                                    color:
                                      '#777',
                                    fontSize:
                                      '13px',
                                  }}
                                >
                                  {entrada.descricao_peca ||
                                    'Descrição não informada'}
                                </span>
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    '4px',
                                  color:
                                    '#999',
                                  fontSize:
                                    '13px',
                                }}
                              >
                                {
                                  entrada.cliente_nome
                                }
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  gap: '10px',
                                  flexWrap:
                                    'wrap',
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize:
                                      '17px',
                                  }}
                                >
                                  {entrada.placa ||
                                    'Sem placa'}
                                </strong>

                                <span
                                  style={{
                                    color:
                                      '#777',
                                    fontSize:
                                      '13px',
                                  }}
                                >
                                  {entrada.modelo ||
                                    'Modelo não informado'}

                                  {entrada.ano
                                    ? ` • ${entrada.ano}`
                                    : ''}
                                </span>
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    '4px',
                                  color:
                                    '#999',
                                  fontSize:
                                    '13px',
                                }}
                              >
                                {
                                  entrada.cliente_nome
                                }
                              </div>
                            </>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems:
                              'center',
                            gap: '12px',
                          }}
                        >
                          <span
                            style={{
                              color:
                                '#777',
                              fontSize:
                                '12px',
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {formatarData(
                              entrada.criado_em,
                            )}
                          </span>

                          <span
                            style={{
                              color:
                                '#e30613',
                              fontSize:
                                '16px',
                              transform:
                                aberta
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                            }}
                          >
                            ▼
                          </span>
                        </div>
                      </button>

                      {aberta && (
                        <div
                          style={{
                            borderTop:
                              '1px solid #242424',
                            padding: '20px',
                            background:
                              '#111',
                          }}
                        >
                          {/* BOTÕES */}

                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: '10px',
                              flexWrap:
                                'wrap',
                              marginBottom:
                                '20px',
                            }}
                          >
                            {!editando && (
                              <button
                                type="button"
                                onClick={() =>
                                  iniciarEdicao(
                                    entrada,
                                  )
                                }
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  gap: '7px',
                                  padding:
                                    '10px 15px',
                                  border:
                                    '1px solid #3a3a3a',
                                  borderRadius:
                                    '8px',
                                  background:
                                    '#1d1d1d',
                                  color:
                                    '#fff',
                                  cursor:
                                    'pointer',
                                  fontWeight:
                                    700,
                                  fontSize:
                                    '13px',
                                }}
                              >
                                ✏️ Editar
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={
                                excluindo ||
                                editando
                              }
                              onClick={() =>
                                excluirEntrada(
                                  entrada,
                                )
                              }
                              style={{
                                display:
                                  'inline-flex',
                                alignItems:
                                  'center',
                                gap: '7px',
                                padding:
                                  '10px 15px',
                                border:
                                  '1px solid rgba(227, 6, 19, 0.45)',
                                borderRadius:
                                  '8px',
                                background:
                                  'rgba(227, 6, 19, 0.10)',
                                color:
                                  '#ff4a54',
                                cursor:
                                  excluindo ||
                                  editando
                                    ? 'not-allowed'
                                    : 'pointer',
                                fontWeight:
                                  700,
                                fontSize:
                                  '13px',
                                opacity:
                                  excluindo ||
                                  editando
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              🗑️{' '}
                              {excluindo
                                ? 'Excluindo...'
                                : 'Excluir'}
                            </button>

                            {entrada.telefone &&
                              !editando && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirWhatsAppCliente(
                                      entrada,
                                    )
                                  }
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    gap: '8px',
                                    padding:
                                      '9px 15px',
                                    border:
                                      'none',
                                    borderRadius:
                                      '8px',
                                    background:
                                      '#25D366',
                                    color:
                                      '#fff',
                                    cursor:
                                      'pointer',
                                    fontWeight:
                                      800,
                                    fontSize:
                                      '13px',
                                    boxShadow:
                                      '0 3px 10px rgba(37, 211, 102, 0.20)',
                                  }}
                                >
                                  <IconeWhatsApp />
                                  WhatsApp Cliente
                                </button>
                              )}

                            {!editando && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirWhatsAppEmpresa(
                                    entrada,
                                  )
                                }
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  gap: '8px',
                                  padding:
                                    '9px 15px',
                                  border:
                                    'none',
                                  borderRadius:
                                    '8px',
                                  background:
                                    '#128C7E',
                                  color:
                                    '#fff',
                                  cursor:
                                    'pointer',
                                  fontWeight:
                                    800,
                                  fontSize:
                                    '13px',
                                  boxShadow:
                                    '0 3px 10px rgba(18, 140, 126, 0.20)',
                                }}
                              >
                                <IconeWhatsApp />
                                WhatsApp Empresa
                              </button>
                            )}
                          </div>

                          {/* FOTOS + DADOS */}

                          <div
                            style={{
                              display:
                                'grid',
                              gridTemplateColumns:
                                'minmax(240px, 360px) 1fr',
                              gap: '24px',
                              alignItems:
                                'start',
                            }}
                          >
                            {/* FOTOS */}

                            <div>
                              <div
                                style={{
                                  marginBottom:
                                    '8px',
                                  color:
                                    '#777',
                                  fontSize:
                                    '11px',
                                  fontWeight:
                                    700,
                                }}
                              >
                                FOTOS DA ENTRADA
                              </div>

                              <div
                                style={{
                                  display:
                                    'grid',
                                  gridTemplateColumns:
                                    entrada.foto_exibicao &&
                                    entrada.foto_exibicao_2
                                      ? '1fr 1fr'
                                      : '1fr',
                                  gap: '10px',
                                }}
                              >
                                {/* FOTO 1 */}

                                {entrada.foto_exibicao && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFotoAberta(
                                        entrada.foto_exibicao!,
                                      )
                                    }
                                    title="Clique para ampliar a primeira foto"
                                    style={{
                                      width:
                                        '100%',
                                      height:
                                        '220px',
                                      padding:
                                        0,
                                      border:
                                        '1px solid #292929',
                                      borderRadius:
                                        '10px',
                                      background:
                                        '#1b1b1b',
                                      cursor:
                                        'zoom-in',
                                      overflow:
                                        'hidden',
                                      display:
                                        'flex',
                                      alignItems:
                                        'center',
                                      justifyContent:
                                        'center',
                                    }}
                                  >
                                    <img
                                      src={
                                        entrada.foto_exibicao
                                      }
                                      alt={
                                        peca
                                          ? 'Foto 1 da peça'
                                          : `Foto 1 - placa ${entrada.placa || ''}`
                                      }
                                      style={{
                                        width:
                                          '100%',
                                        height:
                                          '100%',
                                        objectFit:
                                          'cover',
                                        display:
                                          'block',
                                      }}
                                    />
                                  </button>
                                )}

                                {/* FOTO 2 */}

                                {entrada.foto_exibicao_2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFotoAberta(
                                        entrada.foto_exibicao_2!,
                                      )
                                    }
                                    title="Clique para ampliar a segunda foto"
                                    style={{
                                      width:
                                        '100%',
                                      height:
                                        '220px',
                                      padding:
                                        0,
                                      border:
                                        '1px solid #292929',
                                      borderRadius:
                                        '10px',
                                      background:
                                        '#1b1b1b',
                                      cursor:
                                        'zoom-in',
                                      overflow:
                                        'hidden',
                                      display:
                                        'flex',
                                      alignItems:
                                        'center',
                                      justifyContent:
                                        'center',
                                    }}
                                  >
                                    <img
                                      src={
                                        entrada.foto_exibicao_2
                                      }
                                      alt={
                                        peca
                                          ? 'Foto 2 da peça'
                                          : `Foto 2 - placa ${entrada.placa || ''}`
                                      }
                                      style={{
                                        width:
                                          '100%',
                                        height:
                                          '100%',
                                        objectFit:
                                          'cover',
                                        display:
                                          'block',
                                      }}
                                    />
                                  </button>
                                )}

                                {/* NENHUMA FOTO */}

                                {!entrada.foto_exibicao &&
                                  !entrada.foto_exibicao_2 && (
                                    <div
                                      style={{
                                        width:
                                          '100%',
                                        height:
                                          '220px',
                                        borderRadius:
                                          '10px',
                                        overflow:
                                          'hidden',
                                        background:
                                          '#1b1b1b',
                                        border:
                                          '1px solid #292929',
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        justifyContent:
                                          'center',
                                      }}
                                    >
                                      <div
                                        style={{
                                          color:
                                            '#555',
                                          textAlign:
                                            'center',
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize:
                                              '35px',
                                          }}
                                        >
                                          📷
                                        </div>

                                        <div
                                          style={{
                                            marginTop:
                                              '8px',
                                            fontSize:
                                              '12px',
                                          }}
                                        >
                                          Foto não disponível
                                        </div>
                                      </div>
                                    </div>
                                  )}
                              </div>

                              {(entrada.foto_exibicao ||
                                entrada.foto_exibicao_2) && (
                                <div
                                  style={{
                                    marginTop:
                                      '7px',
                                    color:
                                      '#666',
                                    fontSize:
                                      '11px',
                                    textAlign:
                                      'center',
                                  }}
                                >
                                  Clique em uma foto para ampliar
                                </div>
                              )}
                            </div>

                            {/* DADOS */}

                            <div>
                              <div
                                style={{
                                  color:
                                    '#777',
                                  fontSize:
                                    '11px',
                                  fontWeight:
                                    700,
                                  marginBottom:
                                    '14px',
                                }}
                              >
                                DADOS DA ENTRADA
                              </div>

                              <div
                                style={{
                                  display:
                                    'grid',
                                  gridTemplateColumns:
                                    'repeat(auto-fit, minmax(150px, 1fr))',
                                  gap: '12px',
                                }}
                              >
                                {/* PLACA */}

                                {!peca && (
                                  <div
                                    style={{
                                      padding:
                                        '14px',
                                      background:
                                        '#0d0d0d',
                                      border:
                                        editando
                                          ? '1px solid #e30613'
                                          : '1px solid #242424',
                                      borderRadius:
                                        '9px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          '#666',
                                        fontSize:
                                          '11px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      PLACA
                                    </div>

                                    {editando ? (
                                      <input
                                        type="text"
                                        value={
                                          formEdicao.placa
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setFormEdicao(
                                            (
                                              atual,
                                            ) => ({
                                              ...atual,
                                              placa:
                                                event
                                                  .target
                                                  .value,
                                            }),
                                          )
                                        }
                                        style={
                                          estiloInputEdicao
                                        }
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          marginTop:
                                            '6px',
                                          fontSize:
                                            '17px',
                                          fontWeight:
                                            800,
                                        }}
                                      >
                                        {entrada.placa ||
                                          'Não informada'}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* MODELO */}

                                {!peca && (
                                  <div
                                    style={{
                                      padding:
                                        '14px',
                                      background:
                                        '#0d0d0d',
                                      border:
                                        editando
                                          ? '1px solid #e30613'
                                          : '1px solid #242424',
                                      borderRadius:
                                        '9px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          '#666',
                                        fontSize:
                                          '11px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      MODELO
                                    </div>

                                    {editando ? (
                                      <input
                                        type="text"
                                        value={
                                          formEdicao.modelo
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setFormEdicao(
                                            (
                                              atual,
                                            ) => ({
                                              ...atual,
                                              modelo:
                                                event
                                                  .target
                                                  .value,
                                            }),
                                          )
                                        }
                                        style={
                                          estiloInputEdicao
                                        }
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          marginTop:
                                            '6px',
                                          fontSize:
                                            '15px',
                                          fontWeight:
                                            700,
                                        }}
                                      >
                                        {entrada.modelo ||
                                          'Não informado'}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ANO */}

                                {!peca && (
                                  <div
                                    style={{
                                      padding:
                                        '14px',
                                      background:
                                        '#0d0d0d',
                                      border:
                                        editando
                                          ? '1px solid #e30613'
                                          : '1px solid #242424',
                                      borderRadius:
                                        '9px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          '#666',
                                        fontSize:
                                          '11px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      ANO
                                    </div>

                                    {editando ? (
                                      <input
                                        type="number"
                                        value={
                                          formEdicao.ano
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setFormEdicao(
                                            (
                                              atual,
                                            ) => ({
                                              ...atual,
                                              ano:
                                                event
                                                  .target
                                                  .value,
                                            }),
                                          )
                                        }
                                        style={
                                          estiloInputEdicao
                                        }
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          marginTop:
                                            '6px',
                                          fontSize:
                                            '15px',
                                          fontWeight:
                                            700,
                                        }}
                                      >
                                        {entrada.ano ||
                                          'Não informado'}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* MODELO/CÓDIGO DA PEÇA */}

                                {peca && (
                                  <div
                                    style={{
                                      padding:
                                        '14px',
                                      background:
                                        '#0d0d0d',
                                      border:
                                        '1px solid #242424',
                                      borderRadius:
                                        '9px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          '#666',
                                        fontSize:
                                          '11px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      MODELO OU CÓDIGO DA PEÇA
                                    </div>

                                    <div
                                      style={{
                                        marginTop:
                                          '6px',
                                        fontSize:
                                          '15px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {/* CORRIGIDO */}
                                      {entrada.modelo ||
                                        'Não informado'}
                                    </div>
                                  </div>
                                )}

                                {/* DESCRIÇÃO DA PEÇA */}

                                {peca && (
                                  <div
                                    style={{
                                      padding:
                                        '14px',
                                      background:
                                        '#0d0d0d',
                                      border:
                                        '1px solid #242424',
                                      borderRadius:
                                        '9px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          '#666',
                                        fontSize:
                                          '11px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      DESCRIÇÃO DA PEÇA
                                    </div>

                                    <div
                                      style={{
                                        marginTop:
                                          '6px',
                                        fontSize:
                                          '14px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {entrada.descricao_peca ||
                                        'Não informada'}
                                    </div>
                                  </div>
                                )}

                                {/* CLIENTE */}

                                <div
                                  style={{
                                    padding:
                                      '14px',
                                    background:
                                      '#0d0d0d',
                                    border:
                                      editando
                                        ? '1px solid #e30613'
                                        : '1px solid #242424',
                                    borderRadius:
                                      '9px',
                                  }}
                                >
                                  <div
                                    style={{
                                      color:
                                        '#666',
                                      fontSize:
                                        '11px',
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    CLIENTE
                                  </div>

                                  {editando ? (
                                    <input
                                      type="text"
                                      value={
                                        formEdicao.cliente_nome
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setFormEdicao(
                                          (
                                            atual,
                                          ) => ({
                                            ...atual,
                                            cliente_nome:
                                              event
                                                .target
                                                .value,
                                          }),
                                        )
                                      }
                                      style={
                                        estiloInputEdicao
                                      }
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        marginTop:
                                          '6px',
                                        fontSize:
                                          '15px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {
                                        entrada.cliente_nome
                                      }
                                    </div>
                                  )}
                                </div>

                                {/* TELEFONE */}

                                <div
                                  style={{
                                    padding:
                                      '14px',
                                    background:
                                      '#0d0d0d',
                                    border:
                                      editando
                                        ? '1px solid #e30613'
                                        : '1px solid #242424',
                                    borderRadius:
                                      '9px',
                                  }}
                                >
                                  <div
                                    style={{
                                      color:
                                        '#666',
                                      fontSize:
                                        '11px',
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    TELEFONE
                                  </div>

                                  {editando ? (
                                    <input
                                      type="tel"
                                      value={
                                        formEdicao.telefone
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setFormEdicao(
                                          (
                                            atual,
                                          ) => ({
                                            ...atual,
                                            telefone:
                                              event
                                                .target
                                                .value,
                                          }),
                                        )
                                      }
                                      placeholder="(65) 99999-9999"
                                      style={
                                        estiloInputEdicao
                                      }
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        marginTop:
                                          '6px',
                                        fontSize:
                                          '14px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {entrada.telefone ||
                                        'Não informado'}
                                    </div>
                                  )}
                                </div>

                                {/* FROTA */}

                                {!peca && (
                                  <div
                                    style={{
                                      padding:
                                        '14px',
                                      background:
                                        '#0d0d0d',
                                      border:
                                        '1px solid #242424',
                                      borderRadius:
                                        '9px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          '#666',
                                        fontSize:
                                          '11px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      FROTA
                                    </div>

                                    <div
                                      style={{
                                        marginTop:
                                          '6px',
                                        fontSize:
                                          '14px',
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {entrada.frota ||
                                        'Não informada'}
                                    </div>
                                  </div>
                                )}

                                {/* OBSERVAÇÃO */}

                                <div
                                  style={{
                                    padding:
                                      '14px',
                                    background:
                                      '#0d0d0d',
                                    border:
                                      '1px solid #242424',
                                    borderRadius:
                                      '9px',
                                    gridColumn:
                                      '1 / -1',
                                  }}
                                >
                                  <div
                                    style={{
                                      color:
                                        '#666',
                                      fontSize:
                                        '11px',
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    OBSERVAÇÃO
                                  </div>

                                  <div
                                    style={{
                                      marginTop:
                                        '6px',
                                      fontSize:
                                        '14px',
                                      fontWeight:
                                        600,
                                      color:
                                        '#ddd',
                                    }}
                                  >
                                    {entrada.observacao ||
                                      'Nenhuma observação'}
                                  </div>
                                </div>

                                {/* DATA */}

                                <div
                                  style={{
                                    padding:
                                      '14px',
                                    background:
                                      '#0d0d0d',
                                    border:
                                      '1px solid #242424',
                                    borderRadius:
                                      '9px',
                                  }}
                                >
                                  <div
                                    style={{
                                      color:
                                        '#666',
                                      fontSize:
                                        '11px',
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    DATA E HORA
                                  </div>

                                  <div
                                    style={{
                                      marginTop:
                                        '6px',
                                      fontSize:
                                        '13px',
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    {formatarData(
                                      entrada.criado_em,
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* SALVAR / CANCELAR */}

                              {editando && (
                                <div
                                  style={{
                                    display:
                                      'flex',
                                    gap: '10px',
                                    marginTop:
                                      '15px',
                                    flexWrap:
                                      'wrap',
                                  }}
                                >
                                  <button
                                    type="button"
                                    disabled={
                                      salvandoEdicao
                                    }
                                    onClick={() =>
                                      salvarEdicao(
                                        entrada.id,
                                      )
                                    }
                                    style={{
                                      padding:
                                        '10px 18px',
                                      border:
                                        'none',
                                      borderRadius:
                                        '8px',
                                      background:
                                        '#e30613',
                                      color:
                                        '#fff',
                                      cursor:
                                        salvandoEdicao
                                          ? 'not-allowed'
                                          : 'pointer',
                                      fontWeight:
                                        800,
                                      opacity:
                                        salvandoEdicao
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {salvandoEdicao
                                      ? 'Salvando...'
                                      : 'Salvar alterações'}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      salvandoEdicao
                                    }
                                    onClick={
                                      cancelarEdicao
                                    }
                                    style={{
                                      padding:
                                        '10px 18px',
                                      border:
                                        '1px solid #333',
                                      borderRadius:
                                        '8px',
                                      background:
                                        '#1d1d1d',
                                      color:
                                        '#fff',
                                      cursor:
                                        salvandoEdicao
                                          ? 'not-allowed'
                                          : 'pointer',
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                },
              )}
            </div>
          )}
        </section>
      </div>

      {/* MODAL DA FOTO */}

      {fotoAberta && (
        <div
          onClick={() =>
            setFotoAberta(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background:
              'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding: '30px',
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setFotoAberta(null)
            }}
            aria-label="Fechar foto"
            style={{
              position: 'fixed',
              top: '20px',
              right: '25px',
              width: '48px',
              height: '48px',
              border:
                '1px solid #555',
              borderRadius: '50%',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              zIndex: 10000,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
          >
            ✕
          </button>

          <img
            src={fotoAberta}
            alt="Foto ampliada da entrada"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow:
                '0 10px 50px rgba(0,0,0,0.7)',
              cursor: 'default',
              display: 'block',
            }}
          />
        </div>
      )}
    </Layout>
  )
}