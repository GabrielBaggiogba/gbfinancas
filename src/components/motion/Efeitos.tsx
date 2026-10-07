'use client'

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
} from 'motion/react'
import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { CURVA_FIO, CURVA_SAIDA } from './molas'

/** Holofote que segue o ponteiro (SpotlightCard do React Bits). */
export function Holofote({ className = '', children, ...resto }: HTMLMotionProps<'div'>) {
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <motion.div className={`holofote ${className}`} onPointerMove={mover} {...resto}>
      {children}
    </motion.div>
  )
}

/** Inclinação 3D que acompanha o ponteiro, com mola (TiltedCard do React Bits). */
export function Inclinar({
  children,
  className,
  graus = 9,
}: {
  children: ReactNode
  className?: string
  graus?: number
}) {
  const reduzido = useReducedMotion()
  const rx = useSpring(useMotionValue(0), { stiffness: 170, damping: 20 })
  const ry = useSpring(useMotionValue(0), { stiffness: 170, damping: 20 })
  const escala = useSpring(1, { stiffness: 260, damping: 24 })

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (reduzido || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    rx.set(-py * graus * 2)
    ry.set(px * graus * 2)
    escala.set(1.03)
  }
  const sair = () => {
    rx.set(0)
    ry.set(0)
    escala.set(1)
  }

  return (
    <div
      className={className}
      style={{ perspective: 900 }}
      onPointerMove={mover}
      onPointerLeave={sair}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, scale: escala, transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/** Atração magnética leve em direção ao ponteiro (Magnet do React Bits). */
export function Magnetico({ children, forca = 0.28 }: { children: ReactNode; forca?: number }) {
  const reduzido = useReducedMotion()
  const x = useSpring(0, { stiffness: 220, damping: 18 })
  const y = useSpring(0, { stiffness: 220, damping: 18 })
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (reduzido || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * forca)
    y.set((e.clientY - (r.top + r.height / 2)) * forca)
  }
  const sair = () => {
    x.set(0)
    y.set(0)
  }
  return (
    <motion.div
      className="inline-flex"
      style={{ x, y }}
      onPointerMove={mover}
      onPointerLeave={sair}
    >
      {children}
    </motion.div>
  )
}

type Estouro = { id: number; x: number; y: number }

/** Faíscas no ponto do clique (ClickSpark do React Bits). */
export function Faisca({ children, className }: { children: ReactNode; className?: string }) {
  const [estouros, setEstouros] = useState<Estouro[]>([])
  const proximo = useRef(0)
  const reduzido = useReducedMotion()

  const estourar = useCallback(
    (e: PointerEvent<HTMLSpanElement>) => {
      if (reduzido) return
      const r = e.currentTarget.getBoundingClientRect()
      const id = ++proximo.current
      setEstouros((l) => [...l, { id, x: e.clientX - r.left, y: e.clientY - r.top }])
      window.setTimeout(() => setEstouros((l) => l.filter((x) => x.id !== id)), 520)
    },
    [reduzido],
  )

  return (
    <span className={`relative inline-flex ${className ?? ''}`} onPointerDown={estourar}>
      {children}
      {estouros.map((s) => (
        <svg
          key={s.id}
          aria-hidden="true"
          className="pointer-events-none absolute z-10 overflow-visible"
          style={{ left: s.x, top: s.y }}
          width="1"
          height="1"
        >
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <motion.line
                key={i}
                stroke="var(--gelo)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{
                  x1: Math.cos(a) * 6,
                  y1: Math.sin(a) * 6,
                  x2: Math.cos(a) * 12,
                  y2: Math.sin(a) * 12,
                  opacity: 1,
                }}
                animate={{
                  x1: Math.cos(a) * 22,
                  y1: Math.sin(a) * 22,
                  x2: Math.cos(a) * 26,
                  y2: Math.sin(a) * 26,
                  opacity: 0,
                }}
                transition={{ duration: 0.45, ease: CURVA_SAIDA }}
              />
            )
          })}
        </svg>
      ))}
    </span>
  )
}

/** Texto que chega palavra por palavra, saindo do desfoque (BlurText do React Bits). */
export function TextoSurgindo({ texto, className }: { texto: string; className?: string }) {
  const palavras = texto.split(' ')
  return (
    <span className={className} aria-label={texto}>
      {palavras.map((p, i) => (
        <motion.span
          key={`${p}-${i}`}
          aria-hidden="true"
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', bounce: 0, duration: 0.7, delay: i * 0.055 }}
        >
          {p + (i < palavras.length - 1 ? ' ' : '')}
        </motion.span>
      ))}
    </span>
  )
}

/** Luz no fio (Krivvo): um traço de luz percorre a curva entre dois pontos. */
export function LuzNoFio({
  largura = 120,
  altura = 36,
  cor = 'var(--azul)',
  pulso = 0,
}: {
  largura?: number
  altura?: number
  cor?: string
  pulso?: number
}) {
  const reduzido = useReducedMotion()
  const meio = altura / 2
  const d = `M4,${meio} C${largura * 0.35},${meio - 22} ${largura * 0.65},${meio + 22} ${largura - 4},${meio}`
  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke="var(--linha2)" strokeWidth="1.5" strokeLinecap="round" />
      {!reduzido && (
        <motion.path
          key={pulso}
          d={d}
          fill="none"
          stroke={cor}
          strokeWidth="2.2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.22 1.4"
          style={{ filter: `drop-shadow(0 0 6px ${cor})` }}
          initial={{ strokeDashoffset: 0.22, opacity: 1 }}
          animate={{ strokeDashoffset: -1.05, opacity: [1, 1, 0] }}
          transition={{ duration: 0.95, ease: CURVA_FIO, repeat: Infinity, repeatDelay: 1.3 }}
        />
      )}
    </svg>
  )
}

/** Anel de progresso que se desenha. */
export function Anel({
  pct,
  tamanho = 72,
  espessura = 7,
  cor = 'var(--azul)',
  children,
}: {
  pct: number
  tamanho?: number
  espessura?: number
  cor?: string
  children?: ReactNode
}) {
  const r = (tamanho - espessura) / 2
  const p = Math.min(1, Math.max(0, pct))
  return (
    <div className="relative grid place-items-center" style={{ width: tamanho, height: tamanho }}>
      <svg
        width={tamanho}
        height={tamanho}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke="var(--painel2)"
          strokeWidth={espessura}
        />
        <motion.circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: p }}
          transition={{ type: 'spring', bounce: 0, duration: 1.1, delay: 0.15 }}
          style={{
            filter:
              p > 0
                ? `drop-shadow(0 0 5px color-mix(in srgb, ${cor} 60%, transparent))`
                : undefined,
          }}
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}

/** Ondas do toque (Krivvo): três anéis saem do elemento. */
export function Ondas({ pulso }: { pulso: number }) {
  if (pulso === 0) return null
  return (
    <span key={pulso} className="ondas" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

/** Barra que cresce da esquerda com mola. */
export function Barra({
  pct,
  cor,
  className = '',
}: {
  pct: number
  cor?: string
  className?: string
}) {
  return (
    <div className={`barra ${className}`}>
      <motion.i
        style={{ ['--c' as string]: cor, width: '100%' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.min(1, Math.max(0, pct)) }}
        transition={{ type: 'spring', bounce: 0, duration: 0.9, delay: 0.1 }}
      />
    </div>
  )
}

/** Lista cujos itens entram e saem com altura animada. */
export function ItemDeLista({ children, id }: { children: ReactNode; id: string }) {
  return (
    <motion.li
      key={id}
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.li>
  )
}

export { AnimatePresence }
