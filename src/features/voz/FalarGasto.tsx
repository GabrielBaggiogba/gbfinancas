'use client'

import { Check, Keyboard, Mic, Pencil, RotateCcw, Undo2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import Folha from '@/components/app/Folha'
import { useEditor } from '@/features/financas/components/Editor'
import { lancamentoVazio, nomeDaCategoria, parcelar } from '@/features/financas/fabrica'
import { useDados } from '@/features/financas/store'
import type { Lancamento } from '@/features/financas/tipos'
import { lerComIA, ouvirAudio } from '@/features/ia/actions'
import { contextoIA } from '@/features/ia/contexto'
import { dataBR } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { interpretarFala, type Falado } from './interpretar'

// Reconhecimento de voz do navegador (Chrome, Edge, Android, Safari).
type Reconhecimento = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>
      }) => void)
    | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
}
const criarReconhecimento = (): Reconhecimento | null => {
  const w = window as unknown as Record<string, (new () => Reconhecimento) | undefined>
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return C ? new C() : null
}

async function base64De(arquivo: Blob): Promise<string> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

type Estado = 'parado' | 'ouvindo' | 'lendo' | 'pronto'

/**
 * Aperta, fala "gastei 45 no mercado ontem" e o gasto já fica registrado.
 * Funciona sem nenhuma chave (o navegador transcreve e o app interpreta); com a IA ligada,
 * a interpretação fica ainda melhor e aceita vários gastos numa frase.
 */
export default function FalarGasto() {
  const { dados, hoje, ia, audio, aplicar } = useDados()
  const { editar } = useEditor()
  const avisar = useAvisar()
  const [aberta, setAberta] = useState(false)
  const [estado, setEstado] = useState<Estado>('parado')
  const [fala, setFala] = useState('')
  const [digitando, setDigitando] = useState(false)
  const [salvos, setSalvos] = useState<Lancamento[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const voz = useRef<Reconhecimento | null>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const [suporte, setSuporte] = useState<'navegador' | 'servidor' | null>(null)

  useEffect(() => {
    const s = criarReconhecimento()
      ? 'navegador'
      : audio && typeof MediaRecorder !== 'undefined'
        ? 'servidor'
        : null
    setSuporte(s)
    const abrir = (e: Event) => {
      if ((e as CustomEvent<string>).detail === 'voz') setAberta(true)
    }
    window.addEventListener('gbf:abrir', abrir)
    return () => window.removeEventListener('gbf:abrir', abrir)
  }, [audio])

  const contaPadrao = dados.contas.find((c) => !c.arquivada)?.id ?? null

  const paraLancamentos = (f: Omit<Falado, 'parcelas'> & { parcelas?: number | null }) =>
    parcelar(
      lancamentoVazio({
        tipo: f.tipo,
        data: f.data,
        valor: f.valor,
        descricao: f.descricao,
        categoria_id: f.categoria_id,
        cartao_id: f.cartao_id,
        conta_id: f.cartao_id ? null : (f.conta_id ?? contaPadrao),
        forma_pagamento: f.forma_pagamento,
      }),
      f.parcelas ?? 1,
    )

  /** Com a IA ligada, ela interpreta; sem ela (ou se falhar), o interpretador local. */
  const interpretar = async (texto: string): Promise<Lancamento[]> => {
    const ctx = contextoIA(dados)
    if (ia) {
      const r = await lerComIA({ texto, anexo: null, contexto: ctx }).catch(() => null)
      if (r?.ok && r.itens.length) return r.itens.flatMap((i) => paraLancamentos(i))
    }
    const local = interpretarFala(texto, {
      hoje,
      categorias: ctx.categorias,
      contas: ctx.contas,
      cartoes: ctx.cartoes,
    })
    // O app guarda valores em centavos; o interpretador devolve reais.
    return local ? paraLancamentos({ ...local, valor: Math.round(local.valor * 100) }) : []
  }

  const registrar = async (texto: string) => {
    const t = texto.trim()
    if (!t) return setEstado('parado')
    setFala(t)
    setEstado('lendo')
    const linhas = await interpretar(t)
    if (!linhas.length) {
      setErro('Não achei o valor. Fale, por exemplo: "gastei 45 reais no mercado ontem".')
      return setEstado('parado')
    }
    if (!contaPadrao && linhas.some((l) => !l.cartao_id)) {
      setErro('Cadastre uma conta em Contas antes de lançar por voz.')
      return setEstado('parado')
    }
    const ok = await aplicar([{ op: 'inserir', tabela: 'lancamentos', linhas }])
    if (!ok) return setEstado('parado')
    setSalvos(linhas)
    setEstado('pronto')
  }

  const ouvirNoNavegador = () => {
    const r = criarReconhecimento()
    if (!r) return
    r.lang = 'pt-BR'
    r.interimResults = true
    r.continuous = false
    let final = ''
    r.onresult = (e) => {
      let texto = ''
      for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript
      final = texto
      setFala(texto)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
        setErro('Permita o uso do microfone para falar o gasto.')
      else if (e.error !== 'no-speech' && e.error !== 'aborted')
        setErro('Não consegui ouvir. Tente de novo ou digite.')
    }
    r.onend = () => {
      voz.current = null
      if (final.trim()) void registrar(final)
      else setEstado((s) => (s === 'ouvindo' ? 'parado' : s))
    }
    voz.current = r
    setEstado('ouvindo')
    r.start()
  }

  const gravarParaServidor = async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setErro('Permita o uso do microfone para falar o gasto.')
    }
    const tipo = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) =>
      MediaRecorder.isTypeSupported(t),
    )
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined)
    const partes: Blob[] = []
    const limite = window.setTimeout(() => rec.state === 'recording' && rec.stop(), 60_000)
    rec.ondataavailable = (e) => {
      if (e.data.size) partes.push(e.data)
    }
    rec.onstop = async () => {
      window.clearTimeout(limite)
      stream.getTracks().forEach((t) => t.stop())
      gravador.current = null
      const gravado = new Blob(partes, { type: rec.mimeType || tipo || 'audio/webm' })
      if (!gravado.size) return setEstado('parado')
      setEstado('lendo')
      const r = await ouvirAudio({ tipo: gravado.type, base64: await base64De(gravado) }).catch(
        () => null,
      )
      if (!r?.ok) {
        setErro(r?.mensagem ?? 'Sem conexão. Tente de novo.')
        return setEstado('parado')
      }
      await registrar(r.texto)
    }
    gravador.current = rec
    rec.start()
    setEstado('ouvindo')
  }

  const comecar = () => {
    setErro(null)
    setFala('')
    setSalvos([])
    if (suporte === 'navegador') ouvirNoNavegador()
    else if (suporte === 'servidor') void gravarParaServidor()
    else setDigitando(true)
  }

  const parar = () => {
    voz.current?.stop()
    if (gravador.current?.state === 'recording') gravador.current.stop()
  }

  const fechar = () => {
    voz.current?.abort()
    if (gravador.current?.state === 'recording') gravador.current.stop()
    setAberta(false)
    setEstado('parado')
    setDigitando(false)
    setErro(null)
  }

  // Ao abrir, já começa a ouvir: é só falar.
  const abrirEOuvir = () => {
    setAberta(true)
    setSalvos([])
    setFala('')
    setErro(null)
    if (suporte) window.setTimeout(comecar, 250)
    else setDigitando(true)
  }

  const desfazer = async () => {
    const ok = await aplicar(
      [{ op: 'excluir', tabela: 'lancamentos', ids: salvos.map((l) => l.id) }],
      'Lançamento desfeito',
    )
    if (ok) {
      setSalvos([])
      setEstado('parado')
    }
  }

  const ouvindo = estado === 'ouvindo'
  const principais = salvos.filter((l) => !l.parcela_atual || l.parcela_atual === 1)
  const origem = (l: Lancamento) =>
    l.cartao_id
      ? (dados.cartoes.find((c) => c.id === l.cartao_id)?.nome ?? 'Cartão')
      : (dados.contas.find((c) => c.id === l.conta_id)?.nome ?? '')

  return (
    <>
      <button
        type="button"
        className="b b-primario"
        onClick={abrirEOuvir}
        title="Falar um gasto"
        aria-label="Falar um gasto"
      >
        <Mic size={17} aria-hidden="true" />
        <span className="max-[760px]:sr-only">Falar</span>
      </button>

      <Folha
        aberta={aberta}
        aoFechar={fechar}
        titulo="Falar um gasto"
        pe={
          estado === 'pronto' ? (
            <>
              <button type="button" className="b b-suave" onClick={() => void desfazer()}>
                <Undo2 size={17} aria-hidden="true" /> Desfazer
              </button>
              <button type="button" className="b b-primario flex-1" onClick={comecar}>
                <Mic size={17} aria-hidden="true" /> Falar outro
              </button>
            </>
          ) : digitando ? (
            <button
              type="button"
              className="b b-primario b-grande w-full"
              disabled={!fala.trim() || estado === 'lendo'}
              onClick={() => void registrar(fala)}
            >
              <Check size={18} aria-hidden="true" />{' '}
              {estado === 'lendo' ? 'Registrando...' : 'Registrar'}
            </button>
          ) : undefined
        }
      >
        {estado === 'pronto' ? (
          <div className="grid gap-3">
            <p className="flex items-center gap-2 font-[650] text-menta">
              <Check size={18} aria-hidden="true" /> Registrado
            </p>
            {fala && <p className="miudo">Você disse: “{fala}”</p>}
            <ul className="grid gap-2">
              {principais.map((l) => (
                <li
                  key={l.id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl bg-painel2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[620]">
                      {l.descricao}
                      {l.parcela_total ? ` · ${l.parcela_total}x` : ''}
                    </p>
                    <p className="miudo truncate">
                      {nomeDaCategoria(l.categoria_id, dados.categorias)} · {origem(l)} ·{' '}
                      {dataBR(l.data)}
                    </p>
                  </div>
                  <span className={`num font-[680] ${l.tipo === 'receita' ? 'text-menta' : ''}`}>
                    {l.tipo === 'receita' ? '+' : '-'}
                    {formatarReais(l.valor * (l.parcela_total ?? 1))}
                  </span>
                  <button
                    type="button"
                    className="b b-fantasma b-icone"
                    aria-label={`Corrigir ${l.descricao}`}
                    title="Corrigir"
                    onClick={() => {
                      fechar()
                      editar(l)
                    }}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : digitando ? (
          <div className="grid gap-3">
            <p className="text-t2">
              {suporte
                ? 'Escreva do jeito que você falaria.'
                : 'Este navegador não libera o microfone para o app. Escreva do jeito que você falaria:'}
            </p>
            <input
              data-autofoco
              className="controle"
              placeholder="Ex.: gastei 45 no mercado ontem no pix"
              value={fala}
              maxLength={300}
              onChange={(e) => setFala(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void registrar(fala)
              }}
              aria-label="O que você gastou"
            />
            {erro && <p className="text-[.9375rem] text-erro">{erro}</p>}
            {suporte && (
              <button
                type="button"
                className="b b-suave justify-self-start"
                onClick={() => {
                  setDigitando(false)
                  comecar()
                }}
              >
                <Mic size={17} aria-hidden="true" /> Voltar a falar
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <button
              type="button"
              onClick={ouvindo ? parar : comecar}
              disabled={estado === 'lendo'}
              aria-label={ouvindo ? 'Parar de ouvir' : 'Começar a falar'}
              className={`relative grid h-24 w-24 place-items-center rounded-full text-white transition-transform active:scale-95 ${
                ouvindo ? 'bg-erro' : 'bg-verde'
              }`}
            >
              {ouvindo && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-erro"
                  animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              <Mic size={38} aria-hidden="true" className="relative" />
            </button>
            <p className="text-[1.0625rem] font-[650]">
              {estado === 'lendo'
                ? 'Registrando...'
                : ouvindo
                  ? 'Pode falar, estou ouvindo'
                  : 'Toque no microfone e fale'}
            </p>
            <p className="min-h-[1.5em] text-t2">
              {fala ? `“${fala}”` : 'Ex.: “gastei 45 reais no mercado ontem no pix”'}
            </p>
            {erro && <p className="text-[.9375rem] text-erro">{erro}</p>}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="b b-fantasma"
                onClick={() => {
                  voz.current?.abort()
                  setEstado('parado')
                  setDigitando(true)
                }}
              >
                <Keyboard size={17} aria-hidden="true" /> Prefiro digitar
              </button>
              {erro && (
                <button type="button" className="b b-suave" onClick={comecar}>
                  <RotateCcw size={17} aria-hidden="true" /> Tentar de novo
                </button>
              )}
            </div>
          </div>
        )}
      </Folha>
    </>
  )
}
