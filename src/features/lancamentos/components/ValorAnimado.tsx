'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

type Props = {
  centavos: number
  formato: (centavos: number) => string
  className?: string
  style?: CSSProperties
}

const DURACAO = 600
const ATRASO = 120

function movimentoReduzido() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Conta do valor anterior ao novo (1 - (1 - t)^5). O servidor renderiza o valor final. */
export default function ValorAnimado({ centavos, formato, className, style }: Props) {
  const [exibido, setExibido] = useState(centavos)
  const atual = useRef(centavos)
  const montado = useRef(false)

  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    const de = atual.current
    if (de === centavos) return
    if (movimentoReduzido()) {
      atual.current = centavos
      setExibido(centavos)
      return
    }
    let quadro = 0
    const inicio = performance.now() + ATRASO
    const passo = (agora: number) => {
      const t = Math.min(Math.max((agora - inicio) / DURACAO, 0), 1)
      const ease = 1 - Math.pow(1 - t, 5)
      const valor = Math.round(de + (centavos - de) * ease)
      atual.current = valor
      setExibido(valor)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(quadro)
    }
  }, [centavos])

  return (
    <span className={className} style={style}>
      <span aria-hidden="true">{formato(exibido)}</span>
      <span className="sr-only">{formato(centavos)}</span>
    </span>
  )
}
