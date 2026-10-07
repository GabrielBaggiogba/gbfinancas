'use client'

import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { CURVA_SAIDA } from './molas'

/**
 * Número que conta até o valor (ideia do CountUp do React Bits). O texto animado é
 * decorativo; leitores de tela recebem o valor final.
 */
export default function Numero({
  valor,
  formato,
  className,
  desdeZero = true,
}: {
  valor: number
  formato: (n: number) => string
  className?: string
  desdeZero?: boolean
}) {
  const alvo = useRef<HTMLSpanElement>(null)
  const anterior = useRef(desdeZero ? 0 : valor)
  const visivel = useInView(alvo, { once: true, margin: '0px 0px -8% 0px' })
  const reduzido = useReducedMotion()
  const formatoRef = useRef(formato)
  formatoRef.current = formato

  useEffect(() => {
    const el = alvo.current
    if (!el || !visivel) return
    if (reduzido || anterior.current === valor) {
      el.textContent = formatoRef.current(valor)
      anterior.current = valor
      return
    }
    const controle = animate(anterior.current, valor, {
      duration: 0.9,
      ease: CURVA_SAIDA,
      onUpdate: (v) => {
        anterior.current = v
        el.textContent = formatoRef.current(Math.round(v))
      },
    })
    return () => controle.stop()
  }, [valor, visivel, reduzido])

  return (
    <span className={className}>
      <span ref={alvo} aria-hidden="true">
        {formato(desdeZero ? 0 : valor)}
      </span>
      <span className="sr-only">{formato(valor)}</span>
    </span>
  )
}
