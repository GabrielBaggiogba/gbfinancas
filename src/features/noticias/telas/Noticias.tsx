'use client'

import { ArrowUpRight, Newspaper, RefreshCw, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Vazio } from '@/components/app/Campos'
import { Holofote } from '@/components/motion/Efeitos'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { MOLA } from '@/components/motion/molas'
import { semAcento } from '../temas'
import { ROTULO_TEMA, type Noticia, type Noticias as Dados, type Tema } from '../tipos'

const PAGINA = 12
const ORDEM_TEMAS: Tema[] = [
  'investimentos',
  'economia',
  'financas-pessoais',
  'negocios',
  'cripto',
  'geral',
]

/** "agora", "há 12 min", "há 3 h", "ontem", "há 4 dias" */
export function haQuanto(iso: string | null, agora: number): string {
  if (!iso) return ''
  const min = Math.max(0, Math.round((agora - Date.parse(iso)) / 60_000))
  if (min < 2) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

/** Capa da notícia. Sem imagem (ou se ela falhar), entra um fundo com as iniciais da fonte. */
export function Capa({ n, className = '' }: { n: Noticia; className?: string }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <div className={`capa ${className}`}>
      {n.imagem && !falhou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.imagem}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFalhou(true)}
        />
      ) : (
        <span className="capa-vazia" aria-hidden="true">
          {n.fonte
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)}
        </span>
      )}
    </div>
  )
}

export default function Noticias({ dados, agora: agoraInicial }: { dados: Dados; agora: number }) {
  const router = useRouter()
  const [renovando, iniciar] = useTransition()
  const [agora, setAgora] = useState(agoraInicial)
  const [tema, setTema] = useState<Tema | 'todas'>('todas')
  const [fonte, setFonte] = useState('')
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(PAGINA)

  useEffect(() => {
    setAgora(Date.now())
    const relogio = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(relogio)
  }, [])

  const contagem = useMemo(() => {
    const mapa = new Map<Tema, number>()
    for (const n of dados.itens) mapa.set(n.tema, (mapa.get(n.tema) ?? 0) + 1)
    return mapa
  }, [dados.itens])

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    return dados.itens.filter(
      (n) =>
        (tema === 'todas' || n.tema === tema) &&
        (!fonte || n.fonte_id === fonte) &&
        (!termo || semAcento(`${n.titulo} ${n.resumo}`).includes(termo)),
    )
  }, [dados.itens, tema, fonte, busca])

  useEffect(() => setLimite(PAGINA), [tema, fonte, busca])

  const fontesAtivas = dados.fontes.filter((f) => f.itens > 0)
  const foraDoAr = dados.fontes.filter((f) => !f.ok)
  const atualizar = () => iniciar(() => router.refresh())

  if (dados.itens.length === 0) {
    return (
      <div className="cartao">
        <Vazio
          icone={<Newspaper size={28} aria-hidden="true" />}
          titulo="Não deu para buscar as notícias agora"
          texto="Os portais não responderam. Isso costuma passar em alguns minutos."
          acao={
            <button type="button" className="b b-primario" onClick={atualizar} disabled={renovando}>
              <RefreshCw size={17} aria-hidden="true" className={renovando ? 'gira' : ''} />
              Tentar de novo
            </button>
          }
        />
      </div>
    )
  }

  const [destaque, ...resto] = filtradas
  const visiveis = resto.slice(0, limite)

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <motion.div variants={itemSurgir} className="cartao cartao-pad">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="controle flex min-w-[220px] flex-1 items-center gap-2.5 !py-0">
            <Search size={18} className="flex-none text-t3" aria-hidden="true" />
            <input
              type="search"
              className="h-full min-w-0 flex-1 bg-transparent outline-none"
              placeholder="Buscar nas notícias"
              aria-label="Buscar nas notícias"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <select
            className="controle !w-auto min-w-[170px]"
            aria-label="Fonte"
            value={fonte}
            onChange={(e) => setFonte(e.target.value)}
          >
            <option value="">Todas as fontes</option>
            {fontesAtivas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="b b-suave b-icone"
            onClick={atualizar}
            disabled={renovando}
            aria-label="Atualizar notícias"
            title="Atualizar"
          >
            <RefreshCw size={18} aria-hidden="true" className={renovando ? 'gira' : ''} />
          </button>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Tema">
          <button
            type="button"
            className="chip"
            aria-pressed={tema === 'todas'}
            onClick={() => setTema('todas')}
          >
            Todas <span className="opacity-60">{dados.itens.length}</span>
          </button>
          {ORDEM_TEMAS.filter((t) => contagem.has(t)).map((t, i) => (
            <motion.button
              key={t}
              type="button"
              className="chip"
              aria-pressed={tema === t}
              onClick={() => setTema(t)}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...MOLA, delay: 0.12 + i * 0.05 }}
            >
              {ROTULO_TEMA[t]} <span className="opacity-60">{contagem.get(t)}</span>
            </motion.button>
          ))}
          <span className="miudo ml-auto flex items-center gap-2">
            <i className="ponto-vivo" aria-hidden="true" />
            Atualizado {haQuanto(dados.atualizado_em, agora)} · renova a cada 30 min
          </span>
        </div>
      </motion.div>

      {filtradas.length === 0 ? (
        <div className="cartao">
          <Vazio
            icone={<Search size={26} aria-hidden="true" />}
            titulo="Nenhuma notícia com esse filtro"
            texto="Tente outro tema, outra fonte ou limpe a busca."
          />
        </div>
      ) : (
        <>
          <motion.a
            key={destaque.id}
            href={destaque.link}
            target="_blank"
            rel="noopener noreferrer"
            className="cartao noticia noticia-destaque borda-luz"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.7 }}
          >
            <Capa n={destaque} />
            <div className="flex min-w-0 flex-col justify-center p-[calc(var(--pad)+6px)]">
              <p className="flex flex-wrap items-center gap-2">
                <span className="selo selo-azul">{ROTULO_TEMA[destaque.tema]}</span>
                <span className="miudo">
                  {destaque.fonte}
                  {destaque.publicado_em && ` · ${haQuanto(destaque.publicado_em, agora)}`}
                </span>
              </p>
              <h2 className="noticia-titulo mt-3 text-[clamp(1.375rem,2.2vw,1.875rem)]">
                {destaque.titulo}
              </h2>
              {destaque.resumo && <p className="mt-3 text-t2">{destaque.resumo}</p>}
              <span className="mt-5 inline-flex items-center gap-1.5 font-[620] text-gelo">
                Ler em {destaque.fonte}
                <ArrowUpRight size={17} aria-hidden="true" className="noticia-seta" />
              </span>
            </div>
          </motion.a>

          <ul className="grid gap-[var(--vao)] min-[700px]:grid-cols-2 min-[1180px]:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visiveis.map((n, i) => (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                  transition={{
                    type: 'spring',
                    bounce: 0,
                    duration: 0.55,
                    delay: (i % PAGINA) * 0.035,
                  }}
                >
                  <Holofote className="cartao noticia h-full">
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-full flex-col"
                    >
                      <Capa n={n} />
                      <div className="flex flex-1 flex-col p-[var(--pad)]">
                        <p className="flex items-center justify-between gap-2">
                          <span className="selo">{ROTULO_TEMA[n.tema]}</span>
                          <span className="miudo">{haQuanto(n.publicado_em, agora)}</span>
                        </p>
                        <h3 className="noticia-titulo mt-2.5 text-[1.0625rem]">{n.titulo}</h3>
                        {n.resumo && (
                          <p className="noticia-resumo mt-2 text-[.9375rem] text-t2">{n.resumo}</p>
                        )}
                        <span className="miudo mt-auto flex items-center justify-between gap-2 pt-4">
                          {n.fonte}
                          <ArrowUpRight size={16} aria-hidden="true" className="noticia-seta" />
                        </span>
                      </div>
                    </a>
                  </Holofote>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {resto.length > limite && (
            <div className="grid place-items-center">
              <button
                type="button"
                className="b b-suave"
                onClick={() => setLimite((n) => n + PAGINA)}
              >
                Mostrar mais {Math.min(PAGINA, resto.length - limite)}
              </button>
            </div>
          )}
        </>
      )}

      <p className="miudo">
        Manchetes e resumos vêm dos feeds públicos de {fontesAtivas.map((f) => f.nome).join(', ')}.
        Cada notícia abre no site de origem.
        {foraDoAr.length > 0 && ` Sem resposta agora: ${foraDoAr.map((f) => f.nome).join(', ')}.`}
      </p>
    </Surgir>
  )
}
