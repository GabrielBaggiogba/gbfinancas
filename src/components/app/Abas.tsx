'use client'

import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { MOLA } from '@/components/motion/molas'

/** Aba que desliza (Krivvo): o fundo da opção escolhida desliza até a outra com mola. */
export default function Abas<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  className = '',
}: {
  opcoes: { valor: T; rotulo: ReactNode }[]
  valor: T
  aoMudar: (v: T) => void
  rotulo: string
  className?: string
}) {
  const id = useId()
  return (
    <div role="tablist" aria-label={rotulo} className={`abas ${className}`}>
      {opcoes.map((o, i) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={o.valor === valor}
          tabIndex={o.valor === valor ? 0 : -1}
          className="aba"
          onClick={() => aoMudar(o.valor)}
          onKeyDown={(e) => {
            const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
            if (!passo) return
            e.preventDefault()
            const novo = opcoes[(i + passo + opcoes.length) % opcoes.length]
            aoMudar(novo.valor)
            const irmaos =
              e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')
            irmaos?.[(i + passo + opcoes.length) % opcoes.length]?.focus()
          }}
        >
          {o.valor === valor && (
            <motion.i layoutId={`aba-${id}`} className="aba-polegar" transition={MOLA} />
          )}
          <span>{o.rotulo}</span>
        </button>
      ))}
    </div>
  )
}
