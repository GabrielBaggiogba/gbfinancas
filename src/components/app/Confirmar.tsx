'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MOLA, MOLA_VIVA } from '@/components/motion/molas'

type Pedido = { titulo: string; texto: string; acao: string; perigo?: boolean }
type Confirmar = (p: Pedido) => Promise<boolean>

const Ctx = createContext<Confirmar>(async () => false)

/** Confirmação só para ações destrutivas e sem volta. Devolve uma promessa. */
export function ProvedorDeConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const resolver = useRef<(v: boolean) => void>()
  const botao = useRef<HTMLButtonElement>(null)

  const confirmar = useCallback<Confirmar>((p) => {
    setPedido(p)
    return new Promise<boolean>((r) => (resolver.current = r))
  }, [])

  const responder = useCallback((v: boolean) => {
    resolver.current?.(v)
    setPedido(null)
  }, [])

  useEffect(() => {
    if (!pedido) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        responder(false)
      }
    }
    document.addEventListener('keydown', tecla, true)
    const foco = window.setTimeout(() => botao.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', tecla, true)
      window.clearTimeout(foco)
    }
  }, [pedido, responder])

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      <AnimatePresence>
        {pedido && (
          <>
            <motion.div
              key="veu"
              className="veu"
              style={{ zIndex: 60 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => responder(false)}
            />
            <motion.div
              key="dialogo"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirmar-titulo"
              aria-describedby="confirmar-texto"
              className="dialogo"
              initial={{ opacity: 0, scale: 0.92, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: MOLA_VIVA }}
              exit={{ opacity: 0, scale: 0.96, transition: MOLA }}
            >
              <h2 id="confirmar-titulo" className="titulo-secao text-[1.1875rem]">
                {pedido.titulo}
              </h2>
              <p id="confirmar-texto" className="mt-2 text-t2">
                {pedido.texto}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" className="b b-suave" onClick={() => responder(false)}>
                  Cancelar
                </button>
                <button
                  ref={botao}
                  type="button"
                  className={`b ${pedido.perigo ? 'b-perigo' : 'b-primario'}`}
                  onClick={() => responder(true)}
                >
                  {pedido.acao}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

export function useConfirmar(): Confirmar {
  return useContext(Ctx)
}
