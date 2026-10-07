'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { useLargura } from '@/components/app/ganchos'
import { formatarCurto, formatarReais } from '@/lib/dinheiro'
import { coluna, tetoRedondo } from './escala'

export type GrupoDeBarras = { rotulo: string; titulo: string; a: number; b: number }

/** Colunas agrupadas (duas séries por mês), com legenda e dica ao passar o ponteiro. */
export default function BarrasMensais({
  grupos,
  series,
  altura = 230,
}: {
  grupos: GrupoDeBarras[]
  series: [string, string]
  altura?: number
}) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)
  const m = { e: 52, d: 6, t: 10, b: 26 }
  const w = Math.max(0, largura - m.e - m.d)
  const h = altura - m.t - m.b
  const teto = tetoRedondo(Math.max(1, ...grupos.flatMap((g) => [g.a, g.b])))
  const faixa = grupos.length ? w / grupos.length : 0
  const barra = Math.max(4, Math.min(22, faixa / 2 - 5))
  const y = (v: number) => m.t + h - (v / teto) * h
  const cores = ['var(--azul)', 'var(--serie-neutra)']

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, i) => (
          <span key={s} className="legenda inline-flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: cores[i] }} />
            {s}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative" style={{ height: altura }}>
        {largura > 0 && (
          <svg
            width={largura}
            height={altura}
            className="grafico"
            role="img"
            aria-label={`${series[0]} e ${series[1]} por mês`}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={m.e}
                  x2={largura - m.d}
                  y1={y(teto * f)}
                  y2={y(teto * f)}
                  stroke="var(--grade)"
                />
                <text x={m.e - 8} y={y(teto * f) + 4} textAnchor="end">
                  {formatarCurto(teto * f)}
                </text>
              </g>
            ))}
            {grupos.map((g, i) => {
              const cx = m.e + faixa * i + faixa / 2
              return (
                <g
                  key={g.rotulo + i}
                  opacity={ativo === null || ativo === i ? 1 : 0.45}
                  style={{ transition: 'opacity .2s' }}
                >
                  {[g.a, g.b].map((v, s) => (
                    <motion.path
                      key={s}
                      d={coluna(cx + (s === 0 ? -barra - 1 : 1), y(v), barra, (v / teto) * h)}
                      fill={cores[s]}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        type: 'spring',
                        bounce: 0.12,
                        duration: 0.8,
                        delay: 0.05 * i + 0.06 * s,
                      }}
                    />
                  ))}
                  <text x={cx} y={altura - 7} textAnchor="middle">
                    {g.rotulo}
                  </text>
                  <rect
                    x={m.e + faixa * i}
                    y={m.t}
                    width={faixa}
                    height={h + m.b}
                    fill="transparent"
                    onPointerEnter={() => setAtivo(i)}
                    onPointerLeave={() => setAtivo(null)}
                  />
                </g>
              )
            })}
          </svg>
        )}
        {ativo !== null && grupos[ativo] && (
          <div
            className="dica"
            style={{
              left: Math.min(
                Math.max(8, m.e + faixa * ativo + faixa / 2 - 80),
                Math.max(8, largura - 176),
              ),
              top: 0,
            }}
          >
            <div className="mb-1 font-[620]">{grupos[ativo].titulo}</div>
            {series.map((s, i) => (
              <div key={s} className="flex items-center justify-between gap-5">
                <span className="inline-flex items-center gap-2 text-t2">
                  <i className="h-2 w-2 rounded-[2px]" style={{ background: cores[i] }} />
                  {s}
                </span>
                <span className="sigilo num font-[600]">
                  {formatarReais(i === 0 ? grupos[ativo].a : grupos[ativo].b)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
