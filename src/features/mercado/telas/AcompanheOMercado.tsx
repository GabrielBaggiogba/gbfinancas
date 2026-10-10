'use client'

import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Holofote } from '@/components/motion/Efeitos'
import { FONTES_UTEIS, dominio } from '../fontes-uteis'

/** Links para sites de mercado. Cada um abre em uma nova aba. */
export default function AcompanheOMercado() {
  return (
    <section className="cartao cartao-pad" aria-labelledby="acompanhe-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="acompanhe-titulo" className="titulo-secao">
          Acompanhe o mercado
        </h2>
        <p className="miudo">Sites externos, abrem em uma nova aba</p>
      </div>

      <ul className="mt-4 grid gap-2.5 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-4">
        {FONTES_UTEIS.map((f, i) => (
          <motion.li
            key={f.url}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.55, delay: 0.05 + i * 0.04 }}
          >
            <Holofote className="fonte-util h-full">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col gap-1.5 p-3.5"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-[640] leading-tight tracking-[-.01em]">
                      {f.nome}
                    </span>
                    {f.secao && <span className="legenda mt-0.5 block">{f.secao}</span>}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" className="noticia-seta text-t3" />
                </span>
                <span className="text-[.875rem] leading-[1.4] text-t2">{f.descricao}</span>
                <span className="miudo mt-auto truncate pt-1">{dominio(f.url)}</span>
                <span className="sr-only">(abre em uma nova aba)</span>
              </a>
            </Holofote>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
