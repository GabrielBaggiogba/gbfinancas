'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { useAvisar } from '@/components/app/Avisos'
import { hojeEmSaoPaulo } from '@/lib/datas'
import { gravar } from './actions'
import { aplicarLocal } from './operacoes'
import type { Dados, Operacao } from './tipos'

// Os dados chegam do servidor uma vez (no layout) e ficam aqui. Cada alteração aparece
// na hora na tela e segue para o servidor em fila; se o servidor recusar, some da tela.

type Lote = { id: number; operacoes: Operacao[] }
type Estado = { confirmados: Dados; pendentes: Lote[] }
type Acao =
  | { tipo: 'enviar'; lote: Lote }
  | { tipo: 'confirmar'; id: number }
  | { tipo: 'descartar'; id: number }
  | { tipo: 'trocar'; dados: Dados }

function redutor(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case 'enviar':
      return { ...estado, pendentes: [...estado.pendentes, acao.lote] }
    case 'confirmar': {
      const lote = estado.pendentes.find((l) => l.id === acao.id)
      return {
        confirmados: lote ? aplicarLocal(estado.confirmados, lote.operacoes) : estado.confirmados,
        pendentes: estado.pendentes.filter((l) => l.id !== acao.id),
      }
    }
    case 'descartar':
      return { ...estado, pendentes: estado.pendentes.filter((l) => l.id !== acao.id) }
    case 'trocar':
      return { confirmados: acao.dados, pendentes: [] }
  }
}

type Contexto = {
  dados: Dados
  hoje: string
  email: string
  demo: boolean
  /** Aplica na tela e envia ao servidor. Resolve `true` quando o servidor confirmou. */
  aplicar: (operacoes: Operacao[], aoConfirmar?: string) => Promise<boolean>
  trocarTudo: (dados: Dados) => void
}

const Ctx = createContext<Contexto | null>(null)

export function ProvedorDeDados({
  inicial,
  hoje,
  email,
  demo,
  children,
}: {
  inicial: Dados
  hoje: string
  email: string
  demo: boolean
  children: ReactNode
}) {
  const [estado, despachar] = useReducer(redutor, { confirmados: inicial, pendentes: [] })
  const avisar = useAvisar()
  const fila = useRef<Promise<unknown>>(Promise.resolve())
  const contador = useRef(0)

  const aplicar = useCallback(
    (operacoes: Operacao[], aoConfirmar?: string) => {
      const id = ++contador.current
      despachar({ tipo: 'enviar', lote: { id, operacoes } })
      const tarefa = fila.current.then(async () => {
        try {
          const r = await gravar(operacoes)
          if (!r) {
            // Sessão expirada: o middleware redirecionou a chamada.
            window.location.assign('/login')
            return false
          }
          if (r.ok) {
            despachar({ tipo: 'confirmar', id })
            if (aoConfirmar) avisar({ tipo: 'ok', texto: aoConfirmar })
            return true
          }
          despachar({ tipo: 'descartar', id })
          avisar({ tipo: 'erro', texto: r.mensagem })
          return false
        } catch {
          despachar({ tipo: 'descartar', id })
          avisar({ tipo: 'erro', texto: 'Sem conexão. A alteração não foi salva.' })
          return false
        }
      })
      fila.current = tarefa
      return tarefa
    },
    [avisar],
  )

  const trocarTudo = useCallback((dados: Dados) => despachar({ tipo: 'trocar', dados }), [])

  const dados = useMemo(
    () => estado.pendentes.reduce((d, l) => aplicarLocal(d, l.operacoes), estado.confirmados),
    [estado],
  )

  // Virou o dia com a aba aberta: recarrega para "hoje" não ficar para trás.
  useEffect(() => {
    const conferir = () => {
      if (document.visibilityState === 'visible' && hojeEmSaoPaulo() !== hoje)
        window.location.reload()
    }
    document.addEventListener('visibilitychange', conferir)
    return () => document.removeEventListener('visibilitychange', conferir)
  }, [hoje])

  const valor = useMemo(
    () => ({ dados, hoje, email, demo, aplicar, trocarTudo }),
    [dados, hoje, email, demo, aplicar, trocarTudo],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useDados(): Contexto {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDados fora do ProvedorDeDados')
  return ctx
}
