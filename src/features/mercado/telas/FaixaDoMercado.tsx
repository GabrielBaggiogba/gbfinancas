'use client'

import { Activity, ArrowRight, Pause, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { formatarPreco, type Acao } from '../acoes'
import { Logo, Variacao, horario } from './partes'

const CHAVE_PAUSA = 'gbf_faixa_pausada'
/** Velocidade da faixa em px por segundo: devagar o bastante para ler sem pressa. */
const VELOCIDADE = 32

type Dados =
  | { situacao: 'ok'; consultado_em: string; fonte: string; altas: Acao[]; baixas: Acao[] }
  | { situacao: 'indisponivel' }

function lerPausa(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_PAUSA) === '1'
  } catch {
    return false
  }
}

function gravarPausa(pausada: boolean) {
  try {
    window.localStorage.setItem(CHAVE_PAUSA, pausada ? '1' : '0')
  } catch {
    // Sem armazenamento (aba anônima, por exemplo): a escolha vale só nesta visita.
  }
}

/**
 * Faixa no topo da área logada com as maiores altas e baixas do dia na B3. Os dados
 * vêm da brapi.dev pelo servidor; sem resposta, a faixa diz que estão indisponíveis.
 */
export default function FaixaDoMercado() {
  const [dados, setDados] = useState<Dados | null>(null)

  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/mercado', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Dados) => setDados(d))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          setDados({ situacao: 'indisponivel' })
      })
    return () => controle.abort()
  }, [])

  const vazio = dados?.situacao === 'ok' && dados.altas.length + dados.baixas.length === 0

  return (
    <motion.section
      className="ticker"
      aria-labelledby="ticker-titulo"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
    >
      <div className="ticker-linha">
        <h2 id="ticker-titulo" className="ticker-titulo">
          <Activity size={16} aria-hidden="true" />
          Altas e baixas do dia
        </h2>
        {dados === null ? (
          <div className="ticker-janela" aria-busy="true">
            <span className="osso h-4 w-full max-w-[420px]" />
            <span className="sr-only">Carregando cotações</span>
          </div>
        ) : dados.situacao === 'ok' && !vazio ? (
          <Fita altas={dados.altas} baixas={dados.baixas} />
        ) : (
          <p className="ticker-janela ticker-aviso">Cotações indisponíveis no momento</p>
        )}
        <Link href="/mercado" className="b b-fantasma ticker-mais" title="Ver o mercado">
          <span className="max-[1180px]:sr-only">Mercado</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {dados && (
        <p className="ticker-meta">
          {dados.situacao === 'ok' ? (
            <>
              <span>Variação no último pregão</span>
              <span>Fonte: {dados.fonte}, com atraso</span>
              <span>
                Consultado em{' '}
                <time dateTime={dados.consultado_em}>
                  {horario.format(new Date(dados.consultado_em))}
                </time>
              </span>
              <span>Não é recomendação de investimento.</span>
            </>
          ) : (
            <span>
              A fonte de cotações não respondeu. Uma nova tentativa é feita em alguns minutos.
            </span>
          )}
        </p>
      )}
    </motion.section>
  )
}

function Fita({ altas, baixas }: { altas: Acao[]; baixas: Acao[] }) {
  const reduzir = useReducedMotion() ?? false
  const [pausada, setPausada] = useState(false)
  const [transborda, setTransborda] = useState(false)
  const [duracao, setDuracao] = useState(40)
  const janela = useRef<HTMLDivElement>(null)
  const lista = useRef<HTMLUListElement>(null)

  useEffect(() => setPausada(lerPausa()), [])

  // Só anda quando a lista não cabe; a duração acompanha a largura para manter a velocidade.
  useLayoutEffect(() => {
    const j = janela.current
    const l = lista.current
    if (!j || !l) return
    const medir = () => {
      setTransborda(l.scrollWidth > j.clientWidth + 1)
      setDuracao(Math.max(20, l.scrollWidth / VELOCIDADE))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(j)
    observador.observe(l)
    return () => observador.disconnect()
  }, [altas, baixas])

  const movendo = transborda && !reduzir && !pausada
  const alternar = () => {
    setPausada((p) => {
      gravarPausa(!p)
      return !p
    })
  }

  const conteudo = (
    <>
      {altas.length > 0 && <li className="ticker-grupo">Maiores altas</li>}
      {altas.map((a) => (
        <Item key={a.codigo} a={a} />
      ))}
      {baixas.length > 0 && <li className="ticker-grupo">Maiores baixas</li>}
      {baixas.map((a) => (
        <Item key={a.codigo} a={a} />
      ))}
    </>
  )

  return (
    <>
      <div
        ref={janela}
        className="ticker-janela"
        data-movendo={movendo}
        // Parada e maior que a tela, a lista rola com o dedo, o mouse ou o teclado.
        tabIndex={!movendo && transborda ? 0 : undefined}
        role={!movendo && transborda ? 'region' : undefined}
        aria-label={!movendo && transborda ? 'Altas e baixas, role para ver mais' : undefined}
      >
        <div className="ticker-trilho" style={{ '--duracao': `${duracao}s` } as CSSProperties}>
          <ul ref={lista} className="ticker-lista">
            {conteudo}
          </ul>
          {movendo && (
            <ul className="ticker-lista" aria-hidden="true">
              {conteudo}
            </ul>
          )}
        </div>
      </div>
      {transborda && !reduzir && (
        <button
          type="button"
          className="b b-fantasma b-icone ticker-botao"
          aria-pressed={pausada}
          aria-label={pausada ? 'Retomar movimento da faixa' : 'Pausar movimento da faixa'}
          title={pausada ? 'Retomar movimento' : 'Pausar movimento'}
          onClick={alternar}
        >
          {pausada ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
        </button>
      )}
    </>
  )
}

function Item({ a }: { a: Acao }) {
  return (
    <li className="ticker-item">
      <Logo codigo={a.codigo} tamanho={20} />
      <span className="ticker-codigo">{a.codigo}</span>
      <span className="ticker-preco">{formatarPreco(a.preco)}</span>
      <Variacao valor={a.variacao} />
    </li>
  )
}
