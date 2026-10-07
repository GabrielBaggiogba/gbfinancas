'use client'

import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import AnelMarca from '@/components/ui/AnelMarca'
import { MOLA, MOLA_VIVA } from '@/components/motion/molas'

type Aviso = { id: number; tipo: 'ok' | 'erro' | 'info'; texto: string }
type Avisar = (a: Omit<Aviso, 'id'>) => void

const Ctx = createContext<Avisar>(() => {})

export function ProvedorDeAvisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const proximo = useRef(0)

  const avisar = useCallback<Avisar>((a) => {
    const id = ++proximo.current
    setLista((l) => [...l.slice(-2), { ...a, id }])
    window.setTimeout(
      () => setLista((l) => l.filter((x) => x.id !== id)),
      a.tipo === 'erro' ? 5200 : 2800,
    )
  }, [])

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        <AnimatePresence initial={false}>
          {lista.map((a) => (
            <motion.div
              key={a.id}
              layout
              role={a.tipo === 'erro' ? 'alert' : 'status'}
              className="aviso"
              initial={{ opacity: 0, y: 24, scale: 0.92, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: MOLA_VIVA }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: MOLA }}
            >
              {a.tipo === 'ok' ? (
                <span className="text-gelo">
                  <AnelMarca tamanho={22} />
                </span>
              ) : a.tipo === 'erro' ? (
                <CircleAlert size={20} className="text-erro" aria-hidden="true" />
              ) : (
                <Info size={20} className="text-gelo" aria-hidden="true" />
              )}
              <span>{a.texto}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useAvisar(): Avisar {
  return useContext(Ctx)
}
