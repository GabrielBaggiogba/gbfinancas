'use client'

import { Pause, Play, TrendingUp } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { FUSO, dataBR } from '@/lib/datas'
import { formatarAlta } from '../destaques'
import type { AtivoEmAlta, Destaques, MotivoIndisponivel } from '../tipos'

const CHAVE_PAUSA = 'gbf_faixa_pausada'
/** Segundos por ativo em uma volta completa: devagar o bastante para ler. */
const SEGUNDOS_POR_ATIVO = 7

const ESTADO: Record<MotivoIndisponivel, { titulo: string; texto: string }> = {
  'nao-configurado': {
    titulo: 'Dados semanais indisponíveis',
    texto: 'A fonte de cotações ainda não foi conectada.',
  },
  falha: {
    titulo: 'Dados semanais indisponíveis',
    texto: 'A fonte de cotações não respondeu. Tente de novo mais tarde.',
  },
  'sem-altas': {
    titulo: 'Nenhum ativo em alta nesta semana',
    texto: 'A fonte de cotações não informou altas no período.',
  },
}

function dataEHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function Ativos({ ativos, copia = false }: { ativos: AtivoEmAlta[]; copia?: boolean }) {
  return (
    <ul className={copia ? 'faixa-lista faixa-copia' : 'faixa-lista'} aria-hidden={copia}>
      {ativos.map((a) => (
        <li key={a.codigo} className="faixa-item">
          <span className="font-[650]">{a.codigo}</span>
          {a.nome && <span className="faixa-nome">{a.nome}</span>}
          <span className="faixa-alta">
            <TrendingUp size={14} aria-hidden="true" />
            <span className="sr-only">alta de </span>
            {formatarAlta(a.variacao)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Faixa do topo com os ativos em alta na semana. Busca depois que a tela abre, para não
 * atrasar nada. Sem dados, mostra o estado em vez de números.
 */
export default function FaixaDestaques() {
  const [dados, setDados] = useState<Destaques | null>(null)
  const [pausada, setPausada] = useState(false)

  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/destaques', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Destaques) => setDados(d))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          setDados({ situacao: 'indisponivel', motivo: 'falha' })
      })
    return () => controle.abort()
  }, [])

  useEffect(() => {
    try {
      setPausada(window.localStorage.getItem(CHAVE_PAUSA) === '1')
    } catch {
      // Sem acesso ao armazenamento: a faixa só não lembra a escolha.
    }
  }, [])

  const alternar = () => {
    const nova = !pausada
    setPausada(nova)
    try {
      window.localStorage.setItem(CHAVE_PAUSA, nova ? '1' : '0')
    } catch {
      // idem
    }
  }

  return (
    <section className="faixa nao-imprimir" aria-labelledby="faixa-titulo">
      <div className="faixa-corpo">
        <h2 id="faixa-titulo" className="faixa-titulo">
          <TrendingUp size={16} aria-hidden="true" className="text-gelo" />
          Destaques da semana
        </h2>

        {dados === null && (
          <div className="min-w-0 flex-1" role="status" aria-label="Carregando destaques">
            <div className="osso h-4 w-full max-w-[420px]" />
          </div>
        )}

        {dados?.situacao === 'indisponivel' && (
          <p className="faixa-estado" role="status">
            <span className="font-[620] text-t1">{ESTADO[dados.motivo].titulo}</span>
            <span className="text-t3"> · {ESTADO[dados.motivo].texto}</span>
          </p>
        )}

        {dados?.situacao === 'ok' && (
          <>
            <div
              className="faixa-janela"
              data-parada={pausada}
              role="group"
              aria-label="Ativos em alta na semana"
              tabIndex={0}
            >
              <div
                className="faixa-rolo"
                style={
                  {
                    '--faixa-tempo': `${Math.max(28, dados.ativos.length * SEGUNDOS_POR_ATIVO)}s`,
                  } as CSSProperties
                }
              >
                <Ativos ativos={dados.ativos} />
                {!pausada && <Ativos ativos={dados.ativos} copia />}
              </div>
            </div>
            <button
              type="button"
              className="faixa-pausa b b-fantasma b-icone"
              aria-label={pausada ? 'Retomar o movimento da faixa' : 'Pausar o movimento da faixa'}
              title={pausada ? 'Retomar o movimento' : 'Pausar o movimento'}
              onClick={alternar}
            >
              {pausada ? (
                <Play size={16} aria-hidden="true" />
              ) : (
                <Pause size={16} aria-hidden="true" />
              )}
            </button>
          </>
        )}
      </div>

      {dados?.situacao === 'ok' && (
        <p className="faixa-rodape">
          Maiores altas de {dataBR(dados.inicio)} a {dataBR(dados.fim)} · Fonte: {dados.fonte} ·
          Atualizado em {dataEHora(dados.atualizado_em)}. Desempenho passado não garante resultados
          futuros. Os destaques não são recomendação de investimento.
        </p>
      )}
    </section>
  )
}
