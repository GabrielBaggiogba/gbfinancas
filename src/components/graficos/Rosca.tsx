'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { formatarPct, formatarReais } from '@/lib/dinheiro'

export type Fatia = { nome: string; cor: string; total: number }

/** Rosca com fatias que se desenham em sequência. A legenda ao lado carrega nome, parte e valor. */
export default function Rosca({
  fatias,
  rotuloCentro,
  tamanho = 176,
}: {
  fatias: Fatia[]
  rotuloCentro: string
  tamanho?: number
}) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const total = fatias.reduce((s, f) => s + f.total, 0)
  const esp = 20
  const r = (tamanho - esp - 6) / 2
  const C = 2 * Math.PI * r
  const vao = fatias.length > 1 ? 3 : 0
  let acumulado = 0
  const arcos = fatias.map((f) => {
    const inicio = acumulado
    const comp = total > 0 ? (f.total / total) * C : 0
    acumulado += comp
    return { inicio, comp: Math.max(0, comp - vao) }
  })
  const foco = ativo !== null ? fatias[ativo] : null

  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-5">
      <div className="relative mx-auto flex-none" style={{ width: tamanho, height: tamanho }}>
        <svg
          width={tamanho}
          height={tamanho}
          className="-rotate-90"
          role="img"
          aria-label="Gastos por categoria"
        >
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={r}
            fill="none"
            stroke="var(--painel2)"
            strokeWidth={esp}
          />
          {fatias.map((f, i) => (
            <motion.circle
              key={f.nome}
              cx={tamanho / 2}
              cy={tamanho / 2}
              r={r}
              fill="none"
              stroke={f.cor}
              strokeLinecap="butt"
              strokeDashoffset={-arcos[i].inicio}
              initial={{ strokeDasharray: `0 ${C}`, strokeWidth: esp }}
              animate={{
                strokeDasharray: `${arcos[i].comp} ${C - arcos[i].comp}`,
                strokeWidth: ativo === i ? esp + 6 : esp,
                opacity: ativo === null || ativo === i ? 1 : 0.4,
              }}
              transition={{
                strokeDasharray: {
                  type: 'spring',
                  bounce: 0,
                  duration: 0.9,
                  delay: 0.1 + i * 0.07,
                },
                default: { type: 'spring', bounce: 0, duration: 0.3 },
              }}
              onPointerEnter={() => setAtivo(i)}
              onPointerLeave={() => setAtivo(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="max-w-[70%]">
            <div className="miudo truncate">{foco ? foco.nome : rotuloCentro}</div>
            <div className="sigilo num text-[1.0625rem] font-[650] tracking-[-.02em]">
              {formatarReais(foco ? foco.total : total)}
            </div>
          </div>
        </div>
      </div>
      <ul className="min-w-[200px] flex-1">
        {fatias.map((f, i) => (
          <motion.li
            key={f.nome}
            className="flex cursor-default items-center gap-3 rounded-lg px-2 py-[7px]"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: ativo === null || ativo === i ? 1 : 0.5, x: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5, delay: 0.15 + i * 0.05 }}
            onPointerEnter={() => setAtivo(i)}
            onPointerLeave={() => setAtivo(null)}
          >
            <i className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: f.cor }} />
            <span className="min-w-0 flex-1 truncate">{f.nome}</span>
            <span className="miudo num">{total > 0 ? formatarPct(f.total / total) : '0%'}</span>
            <span className="sigilo num w-[104px] text-right font-[560]">
              {formatarReais(f.total)}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
