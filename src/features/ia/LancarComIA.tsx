'use client'

import { Camera, Check, Mic, MicOff, PencilLine, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import Folha from '@/components/app/Folha'
import { useEditor } from '@/features/financas/components/Editor'
import { lancamentoVazio, nomeDaCategoria, parcelar } from '@/features/financas/fabrica'
import { useDados } from '@/features/financas/store'
import type { Lancamento } from '@/features/financas/tipos'
import { dataBR } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { lerComIA } from './actions'
import { contextoIA } from './contexto'
import type { Anexo, Rascunho } from './ler'

// Reconhecimento de voz do navegador (Chrome, Edge, Safari). Sem ele, o botão de microfone some.
type Reconhecimento = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
const criarReconhecimento = (): Reconhecimento | null => {
  const w = window as unknown as Record<string, (new () => Reconhecimento) | undefined>
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return C ? new C() : null
}

const MAX_PDF = 4 * 1024 * 1024

/** Foto reduzida para no máximo 1600 px em JPEG: lê bem e viaja leve. */
async function prepararImagem(arquivo: File): Promise<Anexo> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/jpeg', 0.85)
  return { tipo: 'image/jpeg', base64: url.slice(url.indexOf(',') + 1) }
}

async function prepararPdf(arquivo: File): Promise<Anexo> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { tipo: 'application/pdf', base64: btoa(bin) }
}

export default function LancarComIA() {
  const { dados, ia, aplicar } = useDados()
  const { novo } = useEditor()
  const avisar = useAvisar()
  const [aberta, setAberta] = useState(false)
  const [texto, setTexto] = useState('')
  const [anexo, setAnexo] = useState<{ nome: string; dado: Anexo } | null>(null)
  const [estado, setEstado] = useState<'livre' | 'lendo' | 'ouvindo'>('livre')
  const [itens, setItens] = useState<Rascunho[] | null>(null)
  const [observacao, setObservacao] = useState<string | null>(null)
  const [temVoz, setTemVoz] = useState(false)
  const voz = useRef<Reconhecimento | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTemVoz(criarReconhecimento() !== null)
  }, [])
  if (!ia) return null

  const limpar = () => {
    setTexto('')
    setAnexo(null)
    setItens(null)
    setObservacao(null)
  }

  const ouvir = () => {
    if (estado === 'ouvindo') return voz.current?.stop()
    const r = criarReconhecimento()
    if (!r) return
    r.lang = 'pt-BR'
    r.interimResults = true
    r.continuous = false
    const antes = texto ? `${texto.trim()} ` : ''
    r.onresult = (e) => {
      let falado = ''
      for (let i = 0; i < e.results.length; i++) falado += e.results[i][0].transcript
      setTexto(antes + falado)
    }
    r.onend = () => setEstado('livre')
    r.onerror = () => setEstado('livre')
    voz.current = r
    setEstado('ouvindo')
    r.start()
  }

  const escolherArquivo = async (f: File | undefined) => {
    if (!f) return
    try {
      if (f.type === 'application/pdf') {
        if (f.size > MAX_PDF)
          return avisar({ tipo: 'erro', texto: 'PDF grande demais (máximo 4 MB).' })
        setAnexo({ nome: f.name, dado: await prepararPdf(f) })
      } else if (f.type.startsWith('image/')) {
        setAnexo({ nome: f.name || 'Foto', dado: await prepararImagem(f) })
      } else avisar({ tipo: 'erro', texto: 'Envie uma foto ou um PDF.' })
    } catch {
      avisar({ tipo: 'erro', texto: 'Não consegui abrir este arquivo.' })
    }
  }

  const ler = async () => {
    setEstado('lendo')
    setItens(null)
    setObservacao(null)
    const r = await lerComIA({
      texto,
      anexo: anexo?.dado ?? null,
      contexto: contextoIA(dados),
    }).catch(() => null)
    setEstado('livre')
    if (!r) return avisar({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' })
    if (!r.ok) return avisar({ tipo: 'erro', texto: r.mensagem })
    setItens(r.itens)
    setObservacao(r.observacao ?? (r.itens.length ? null : 'Não encontrei nenhum lançamento.'))
  }

  // Conta padrão quando a IA não soube: a primeira conta ativa.
  const contaPadrao = dados.contas.find((c) => !c.arquivada)?.id ?? null
  const paraLancamento = (r: Rascunho): Lancamento =>
    lancamentoVazio({
      tipo: r.tipo,
      data: r.data,
      valor: r.valor,
      descricao: r.descricao,
      categoria_id: r.categoria_id,
      cartao_id: r.cartao_id,
      conta_id: r.cartao_id ? null : (r.conta_id ?? contaPadrao),
      forma_pagamento: r.forma_pagamento,
    })

  const origem = (r: Rascunho) => {
    if (r.cartao_id) return dados.cartoes.find((c) => c.id === r.cartao_id)?.nome ?? 'Cartão'
    const id = r.conta_id ?? contaPadrao
    return dados.contas.find((c) => c.id === id)?.nome ?? 'Sem conta'
  }

  const revisar = (r: Rascunho) => {
    setAberta(false)
    novo(r.tipo, paraLancamento(r))
  }

  const salvarTodos = async () => {
    if (!itens?.length) return
    const linhas = itens.flatMap((r) => parcelar(paraLancamento(r), r.parcelas ?? 1))
    const ok = await aplicar(
      [{ op: 'inserir', tabela: 'lancamentos', linhas }],
      itens.length === 1 ? 'Lançamento salvo' : `${itens.length} lançamentos salvos`,
    )
    if (ok) {
      limpar()
      setAberta(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="b b-realce"
        onClick={() => setAberta(true)}
        title="Lançar com IA: texto, voz, foto ou PDF"
      >
        <Sparkles size={17} aria-hidden="true" />
        <span className="max-[760px]:sr-only">Lançar com IA</span>
      </button>

      <Folha
        aberta={aberta}
        aoFechar={() => {
          voz.current?.stop()
          setAberta(false)
        }}
        titulo="Lançar com IA"
        pe={
          itens?.length ? (
            <>
              <button type="button" className="b b-suave flex-1" onClick={limpar}>
                Começar de novo
              </button>
              <button
                type="button"
                className="b b-primario flex-1"
                onClick={() => void salvarTodos()}
              >
                <Check size={17} aria-hidden="true" /> Salvar {itens.length > 1 ? 'todos' : ''}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="b b-primario b-grande w-full"
              disabled={estado === 'lendo' || (!texto.trim() && !anexo)}
              onClick={() => void ler()}
            >
              <Sparkles size={18} aria-hidden="true" />
              {estado === 'lendo' ? 'Lendo...' : 'Interpretar'}
            </button>
          )
        }
      >
        {!itens ? (
          <div className="grid gap-3">
            <p className="text-t2">
              Escreva ou fale do jeito que você falaria, ou envie a foto da nota ou o PDF de um
              boleto. Você confere antes de salvar.
            </p>
            <textarea
              data-autofoco
              className="controle min-h-[96px] resize-y py-3"
              maxLength={2000}
              placeholder="Ex.: almoço 32 reais no pix e uber 18 ontem"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label="O que você quer lançar"
            />
            <div className="flex flex-wrap gap-2">
              {temVoz && (
                <button
                  type="button"
                  className={`b ${estado === 'ouvindo' ? 'b-perigo' : 'b-suave'}`}
                  onClick={ouvir}
                  aria-pressed={estado === 'ouvindo'}
                >
                  {estado === 'ouvindo' ? (
                    <>
                      <MicOff size={17} aria-hidden="true" /> Parar
                    </>
                  ) : (
                    <>
                      <Mic size={17} aria-hidden="true" /> Falar
                    </>
                  )}
                </button>
              )}
              <button type="button" className="b b-suave" onClick={() => arquivo.current?.click()}>
                <Camera size={17} aria-hidden="true" /> Foto ou PDF
              </button>
              <input
                ref={arquivo}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  void escolherArquivo(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            {anexo && (
              <p className="flex items-center gap-2 rounded-xl bg-painel2 px-3 py-2 text-[.9375rem]">
                <span className="min-w-0 flex-1 truncate">{anexo.nome}</span>
                <button
                  type="button"
                  className="b b-fantasma b-icone -my-1"
                  onClick={() => setAnexo(null)}
                  aria-label="Remover anexo"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {observacao && <p className="text-t2">{observacao}</p>}
            {itens.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-painel2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[620]">{r.descricao || 'Sem descrição'}</p>
                  <p className="miudo truncate">
                    {dataBR(r.data)} · {nomeDaCategoria(r.categoria_id, dados.categorias)} ·{' '}
                    {origem(r)}
                    {r.parcelas ? ` · ${r.parcelas}x` : ''}
                  </p>
                </div>
                <span className={`num font-[650] ${r.tipo === 'receita' ? 'text-menta' : ''}`}>
                  {r.tipo === 'receita' ? '+' : '-'} {formatarReais(r.valor)}
                </span>
                <button
                  type="button"
                  className="b b-fantasma b-icone"
                  onClick={() => revisar(r)}
                  aria-label={`Revisar ${r.descricao}`}
                  title="Revisar antes de salvar"
                >
                  <PencilLine size={17} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Folha>
    </>
  )
}
