'use client'

import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MOLA_PAINEL, MOLA_VIVA, projetar } from '@/components/motion/molas'
import { useCamadas, useCelular } from './ganchos'

/**
 * Painel que desliza (Krivvo) com vidro. No desktop entra pela direita; no celular sobe
 * de baixo e pode ser arrastado pela alça: o gesto acompanha o dedo, e ao soltar a
 * decisão usa a posição projetada pela velocidade (apple-design).
 */
export default function Folha({
  aberta,
  aoFechar,
  titulo,
  children,
  pe,
}: {
  aberta: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
  pe?: ReactNode
}) {
  const camadas = useCamadas()
  const celular = useCelular()
  const controles = useDragControls()
  const painel = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar

  useEffect(() => {
    if (!aberta) return
    const antes = document.activeElement as HTMLElement | null
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        fechar.current()
      }
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    const foco = window.setTimeout(() => {
      const alvo = painel.current?.querySelector<HTMLElement>('[data-autofoco]')
      ;(alvo ?? painel.current)?.focus({ preventScroll: true })
    }, 60)
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
      window.clearTimeout(foco)
      antes?.focus?.({ preventScroll: true })
    }
  }, [aberta])

  if (!camadas) return null
  const fora = celular ? { y: '104%' } : { x: '108%' }
  const dentro = celular ? { y: 0 } : { x: 0 }

  return createPortal(
    <AnimatePresence>
      {aberta && (
        <>
          <motion.div
            key="veu"
            className="veu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={aoFechar}
          />
          <motion.div
            key="folha"
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            tabIndex={-1}
            className="folha outline-none"
            initial={fora}
            animate={{ ...dentro, transition: celular ? MOLA_VIVA : MOLA_PAINEL }}
            exit={{ ...fora, transition: MOLA_PAINEL }}
            drag={celular ? 'y' : false}
            dragControls={controles}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 1 }}
            onDragEnd={(_, info) => {
              const altura = painel.current?.offsetHeight ?? 600
              if (info.offset.y + projetar(info.velocity.y) > altura * 0.45) aoFechar()
            }}
          >
            <div className="alca" onPointerDown={(e) => controles.start(e)} aria-hidden="true" />
            <div className="flex items-center justify-between gap-3 px-[22px] pb-3 pt-[18px] max-[760px]:pt-1">
              <h2 id={idTitulo} className="titulo-secao text-[1.1875rem]">
                {titulo}
              </h2>
              <button
                type="button"
                className="b b-fantasma b-icone -mr-2"
                onClick={aoFechar}
                aria-label="Fechar"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="folha-corpo">{children}</div>
            {pe && <div className="folha-pe">{pe}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    camadas,
  )
}
