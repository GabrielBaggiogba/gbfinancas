'use client'

import Numero from '@/components/motion/Numero'
import { formatarReais } from '@/lib/dinheiro'

type Sinal = 'auto' | 'mais' | 'menos' | 'nenhum'

function montar(centavos: number, sinal: Sinal): string {
  const base = formatarReais(Math.abs(centavos))
  if (sinal === 'mais') return `+ ${base}`
  if (sinal === 'menos') return `− ${base}`
  if (sinal === 'auto' && centavos < 0) return `− ${base}`
  return base
}

/** Valor em reais. Fica borrado quando a pessoa oculta os valores (borrão de pausa). */
export default function Valor({
  centavos,
  sinal = 'auto',
  animado = false,
  className = '',
}: {
  centavos: number
  sinal?: Sinal
  animado?: boolean
  className?: string
}) {
  if (animado) {
    return (
      <Numero
        className={`sigilo num ${className}`}
        valor={centavos}
        formato={(n) => montar(n, sinal)}
      />
    )
  }
  return <span className={`sigilo num ${className}`}>{montar(centavos, sinal)}</span>
}
