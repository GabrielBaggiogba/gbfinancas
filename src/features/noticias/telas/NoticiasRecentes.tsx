'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Noticia } from '../tipos'
import { haQuanto } from './Noticias'

/** Quatro manchetes no dashboard. Busca depois que a tela abre, para não atrasar nada. */
export default function NoticiasRecentes() {
  const [itens, setItens] = useState<Noticia[] | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [agora, setAgora] = useState(0)

  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/noticias?limite=4', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { itens: Noticia[] }) => {
        setAgora(Date.now())
        setItens(d.itens)
      })
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setFalhou(true)
      })
    return () => controle.abort()
  }, [])

  if (falhou || (itens && itens.length === 0)) return null

  return (
    <section className="cartao">
      <div className="flex min-h-[40px] items-center justify-between gap-3 px-[var(--pad)] pt-[var(--pad)]">
        <h2 className="titulo-secao">Notícias</h2>
        <Link href="/noticias" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
          Ver todas <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <div className="pb-2 pt-2">
        {itens === null
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="px-[var(--pad)] py-2.5">
                <div className="osso h-4 w-full" />
                <div className="osso mt-2 h-3 w-1/3" />
              </div>
            ))
          : itens.map((n, i) => (
              <motion.a
                key={n.id}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="linha-lista !items-start"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.55, delay: i * 0.07 }}
              >
                <span className="min-w-0 flex-1">
                  <span className="noticia-resumo block font-[560] leading-[1.35] !line-clamp-2">
                    {n.titulo}
                  </span>
                  <span className="miudo mt-1 block">
                    {n.fonte}
                    {n.publicado_em && ` · ${haQuanto(n.publicado_em, agora)}`}
                  </span>
                </span>
              </motion.a>
            ))}
      </div>
    </section>
  )
}
