'use client'

import { motion } from 'motion/react'
import { useId, useState, type PointerEvent } from 'react'
import { useLargura } from '@/components/app/ganchos'
import { CURVA_SAIDA } from '@/components/motion/molas'
import { formatarCurto, formatarReais } from '@/lib/dinheiro'
import { tetoRedondo } from './escala'

export type PontoDeLinha = { rotulo: string; titulo: string; valor: number }

/** Linha com área suave, mira e dica. `mini` remove eixos (para cartões pequenos). */
export default function Linha({
  pontos,
  altura = 220,
  mini = false,
  cor = 'var(--azul)',
  nome,
}: {
  pontos: PontoDeLinha[]
  altura?: number
  mini?: boolean
  cor?: string
  nome: string
}) {
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)
  const idGrad = useId()
  const m = mini ? { e: 2, d: 2, t: 4, b: 4 } : { e: 56, d: 12, t: 12, b: 26 }
  const w = Math.max(0, largura - m.e - m.d)
  const h = altura - m.t - m.b
  const valores = pontos.map((p) => p.valor)
  const maior = Math.max(...valores, 0)
  const menor = Math.min(...valores, 0)
  let topo = mini ? maior : tetoRedondo(maior)
  let base = menor < 0 ? (mini ? menor : -tetoRedondo(-menor)) : mini ? Math.min(...valores) : 0
  if (topo === base) {
    topo += 1
    base -= 1
  }
  const x = (i: number) => m.e + (pontos.length > 1 ? (i / (pontos.length - 1)) * w : w / 2)
  const y = (v: number) => m.t + h - ((v - base) / (topo - base)) * h
  const d = pontos
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`)
    .join(' ')
  const area = pontos.length ? `${d} L${x(pontos.length - 1)},${m.t + h} L${x(0)},${m.t + h} Z` : ''
  const passo = Math.max(1, Math.ceil(pontos.length / 6))

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    if (pontos.length === 0 || w === 0) return
    const r = e.currentTarget.getBoundingClientRect()
    const fr = (e.clientX - r.left - m.e) / w
    setAtivo(Math.min(pontos.length - 1, Math.max(0, Math.round(fr * (pontos.length - 1)))))
  }

  return (
    <div ref={ref} className="relative" style={{ height: altura }}>
      {largura > 0 && pontos.length > 0 && (
        <svg
          width={largura}
          height={altura}
          className="grafico"
          role="img"
          aria-label={nome}
          onPointerMove={mini ? undefined : mover}
          onPointerLeave={() => setAtivo(null)}
        >
          <defs>
            <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={cor} stopOpacity="0.22" />
              <stop offset="1" stopColor={cor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {!mini &&
            [base, (base + topo) / 2, topo].map((v) => (
              <g key={v}>
                <line x1={m.e} x2={largura - m.d} y1={y(v)} y2={y(v)} stroke="var(--grade)" />
                <text x={m.e - 8} y={y(v) + 4} textAnchor="end">
                  {formatarCurto(v)}
                </text>
              </g>
            ))}
          {!mini && base < 0 && (
            <line x1={m.e} x2={largura - m.d} y1={y(0)} y2={y(0)} stroke="var(--linha2)" />
          )}
          <motion.path
            d={area}
            fill={`url(#${idGrad})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          />
          <motion.path
            d={d}
            fill="none"
            stroke={cor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: CURVA_SAIDA }}
          />
          {!mini &&
            pontos.map((p, i) =>
              (i % passo === 0 && pontos.length - 1 - i >= passo * 0.6) ||
              i === pontos.length - 1 ? (
                <text
                  key={i}
                  x={x(i)}
                  y={altura - 7}
                  textAnchor={i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle'}
                >
                  {p.rotulo}
                </text>
              ) : null,
            )}
          {ativo !== null && (
            <g>
              <line x1={x(ativo)} x2={x(ativo)} y1={m.t} y2={m.t + h} stroke="var(--linha2)" />
              <circle
                cx={x(ativo)}
                cy={y(pontos[ativo].valor)}
                r="5"
                fill={cor}
                stroke="var(--painel)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      )}
      {ativo !== null && pontos[ativo] && (
        <div
          className="dica"
          style={{ left: Math.min(Math.max(8, x(ativo) - 70), Math.max(8, largura - 160)), top: 0 }}
        >
          <div className="text-t2">{pontos[ativo].titulo}</div>
          <div className="sigilo num font-[620]">{formatarReais(pontos[ativo].valor)}</div>
        </div>
      )}
    </div>
  )
}
