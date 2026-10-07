'use client'

import { motion } from 'motion/react'

// Cada troca de tela chega subindo de leve e saindo do desfoque.
export default function Transicao({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', bounce: 0, duration: 0.55 }}
    >
      {children}
    </motion.div>
  )
}
