'use client'

import { AnimatePresence, motion } from 'motion/react'
import { EllipsisVertical, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MOLA_RAPIDA } from '@/components/motion/molas'
import { useCamadas } from './ganchos'

export type ItemDeMenu = {
  rotulo: string
  icone: LucideIcon
  aoClicar: () => void
  perigo?: boolean
}

/** Menu de ações da linha. Abre a partir do botão (origem ancorada) e fecha com Esc ou clique fora. */
export default function Menu({
  itens,
  rotulo = 'Ações',
}: {
  itens: ItemDeMenu[]
  rotulo?: string
}) {
  const [pos, setPos] = useState<{ x: number; y: number; acima: boolean } | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const camadas = useCamadas()

  useEffect(() => {
    if (!pos) return
    const fechar = () => setPos(null)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        fechar()
        botao.current?.focus()
      }
    }
    document.addEventListener('keydown', tecla, true)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('keydown', tecla, true)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [pos])

  const abrir = () => {
    const r = botao.current!.getBoundingClientRect()
    const altura = itens.length * 38 + 12
    const acima = r.bottom + altura + 12 > window.innerHeight
    setPos({
      x: window.innerWidth - r.right,
      y: acima ? window.innerHeight - r.top + 6 : r.bottom + 6,
      acima,
    })
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="b b-fantasma b-icone"
        aria-haspopup="menu"
        aria-expanded={!!pos}
        aria-label={rotulo}
        onClick={(e) => {
          e.stopPropagation()
          if (pos) setPos(null)
          else abrir()
        }}
      >
        <EllipsisVertical size={18} aria-hidden="true" />
      </button>
      {camadas &&
        createPortal(
          <AnimatePresence>
            {pos && (
              <>
                <div className="fixed inset-0 z-[39]" onClick={() => setPos(null)} />
                <motion.div
                  role="menu"
                  className="menu"
                  style={{
                    position: 'fixed',
                    right: pos.x,
                    ...(pos.acima ? { bottom: pos.y } : { top: pos.y }),
                    transformOrigin: pos.acima ? 'bottom right' : 'top right',
                  }}
                  initial={{ opacity: 0, scale: 0.86, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={MOLA_RAPIDA}
                >
                  {itens.map((item, i) => (
                    <motion.button
                      key={item.rotulo}
                      type="button"
                      role="menuitem"
                      className="menu-item"
                      data-perigo={item.perigo}
                      autoFocus={i === 0}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...MOLA_RAPIDA, delay: 0.03 * i }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPos(null)
                        item.aoClicar()
                      }}
                    >
                      <item.icone size={17} aria-hidden="true" />
                      {item.rotulo}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          camadas,
        )}
    </>
  )
}
