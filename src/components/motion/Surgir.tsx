'use client'

import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

// Entrada suave do catálogo Krivvo: os blocos sobem, perdem o desfoque e aparecem
// um depois do outro.
const conteiner = (passo: number, atraso: number): Variants => ({
  oculto: {},
  visivel: { transition: { staggerChildren: passo, delayChildren: atraso } },
})

export const itemSurgir: Variants = {
  oculto: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visivel: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', bounce: 0, duration: 0.8 },
  },
}

export function Surgir({
  children,
  className,
  passo = 0.07,
  atraso = 0,
}: {
  children: ReactNode
  className?: string
  passo?: number
  atraso?: number
}) {
  return (
    <motion.div
      className={className}
      variants={conteiner(passo, atraso)}
      initial="oculto"
      animate="visivel"
    >
      {children}
    </motion.div>
  )
}

export function Item({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <motion.div className={className} style={style} variants={itemSurgir}>
      {children}
    </motion.div>
  )
}
