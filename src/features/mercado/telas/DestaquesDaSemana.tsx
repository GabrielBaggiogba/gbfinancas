'use client'

import { Activity, Pause, Play, TrendingUp } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { FUSO, dataBR, diasEntre, hojeEmSaoPaulo } from '@/lib/datas'
import { formatarVariacao, type Destaque, type Destaques } from '../destaques'

const CHAVE_PAUSA = 'gbf_faixa_pausada'
/** Velocidade da faixa em px por segundo: devagar o bastante para ler sem pressa. */
const VELOCIDADE = 32

const horario = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

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
 * Faixa "Destaques da semana" no topo da área logada. Mostra os ativos com maior
 * alta no período semanal da API configurada; sem API, diz que os dados estão
 * indisponíveis. Nada aqui é inventado nem recomendação.
 */
export default function DestaquesDaSemana() {
  const [dados, setDados] = useState<Destaques | null>(null)

  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/destaques', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Destaques) => setDados(d))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          setDados({ situacao: 'indisponivel', motivo: 'falhou' })
      })
    return () => controle.abort()
  }, [])

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
          Destaques da semana
        </h2>
        {dados === null ? (
          <div className="ticker-janela" aria-busy="true">
            <span className="osso h-4 w-full max-w-[420px]" />
            <span className="sr-only">Carregando destaques</span>
          </div>
        ) : dados.situacao === 'ok' ? (
          <Fita itens={dados.itens} />
        ) : (
          <p className="ticker-janela ticker-aviso">
            {dados.situacao === 'sem-alta'
              ? 'Nenhum ativo acompanhado subiu no período'
              : 'Dados semanais indisponíveis'}
          </p>
        )}
      </div>

      {dados && <Rodape dados={dados} />}
    </motion.section>
  )
}

function Rodape({ dados }: { dados: Destaques }) {
  if (dados.situacao === 'indisponivel') {
    return (
      <p className="ticker-meta">
        {dados.motivo === 'nao-configurado'
          ? 'A fonte de cotações ainda não foi conectada. Nenhum valor é exibido sem uma fonte de dados.'
          : 'A fonte de cotações não respondeu agora. Uma nova tentativa é feita em alguns minutos.'}
      </p>
    )
  }
  const { periodo, fonte, atualizado_em } = dados
  const antigo = diasEntre(periodo.fim, hojeEmSaoPaulo()) > 7
  return (
    <p className="ticker-meta">
      <span>
        Período: {dataBR(periodo.inicio).slice(0, 5)} a {dataBR(periodo.fim)}
      </span>
      <span>Fonte: {fonte}</span>
      <span>
        Atualizado em{' '}
        <time dateTime={atualizado_em}>{horario.format(new Date(atualizado_em))}</time>
      </span>
      {antigo && <span className="selo selo-aviso">Período antigo</span>}
      <span className="ticker-aviso-legal">
        Maiores altas percentuais do período. Não é recomendação de investimento; desempenho passado
        não garante resultados futuros.
      </span>
    </p>
  )
}

function Fita({ itens }: { itens: Destaque[] }) {
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
  }, [itens])

  const movendo = transborda && !reduzir && !pausada
  const alternar = () => {
    setPausada((p) => {
      gravarPausa(!p)
      return !p
    })
  }

  return (
    <>
      <div
        ref={janela}
        className="ticker-janela"
        data-movendo={movendo}
        // Parada e maior que a tela, a lista rola com o dedo, o mouse ou o teclado.
        tabIndex={!movendo && transborda ? 0 : undefined}
        role={!movendo && transborda ? 'region' : undefined}
        aria-label={!movendo && transborda ? 'Lista de destaques, role para ver mais' : undefined}
      >
        <div className="ticker-trilho" style={{ '--duracao': `${duracao}s` } as CSSProperties}>
          <ul ref={lista} className="ticker-lista">
            {itens.map((d) => (
              <Item key={d.codigo} d={d} />
            ))}
          </ul>
          {movendo && (
            <ul className="ticker-lista" aria-hidden="true">
              {itens.map((d) => (
                <Item key={d.codigo} d={d} />
              ))}
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

function Item({ d }: { d: Destaque }) {
  return (
    <li className="ticker-item">
      <span className="ticker-codigo">{d.codigo}</span>
      {d.nome && <span className="ticker-nome">{d.nome}</span>}
      <span className="ticker-alta">
        <TrendingUp size={14} aria-hidden="true" />
        <span className="sr-only">alta de</span>
        {formatarVariacao(d.variacao_pct)}
      </span>
    </li>
  )
}
