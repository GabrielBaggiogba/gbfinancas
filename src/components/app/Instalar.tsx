'use client'

import { Download, Share, SquarePlus } from 'lucide-react'
import { useEffect, useState } from 'react'

// Instalação como aplicativo (PWA): registra o service worker e guarda o pedido de
// instalação do navegador (Chrome, Edge, Android) para o botão "Instalar app" usar depois.
// No iPhone não existe esse pedido: o botão mostra o passo a passo do Safari.

type PedidoDeInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let pedido: PedidoDeInstalacao | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedido = e as PedidoDeInstalacao
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    pedido = null
    avisar()
  })
}

/** No layout raiz: liga o service worker (só em produção, para não atrapalhar o dev). */
export function RegistrarApp() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])
  return null
}

type Ambiente = 'instalado' | 'ios' | 'outro'

export function useInstalacao() {
  const [, atualizar] = useState(0)
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null)
  useEffect(() => {
    const f = () => atualizar((n) => n + 1)
    ouvintes.add(f)
    const nav = navigator as Navigator & { standalone?: boolean }
    const instalado =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    const ios =
      /iphone|ipad|ipod/i.test(nav.userAgent) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
    setAmbiente(instalado ? 'instalado' : ios ? 'ios' : 'outro')
    return () => {
      ouvintes.delete(f)
    }
  }, [])
  return {
    ambiente,
    podeInstalar: pedido !== null && ambiente !== 'instalado',
    instalar: async () => {
      if (!pedido) return false
      await pedido.prompt()
      const { outcome } = await pedido.userChoice
      pedido = null
      avisar()
      return outcome === 'accepted'
    },
  }
}

/** Botão "Instalar app", ou o passo a passo quando o navegador não oferece a instalação direta. */
export function BotaoInstalar({ className = 'b b-primario' }: { className?: string }) {
  const { ambiente, podeInstalar, instalar } = useInstalacao()
  const [ajuda, setAjuda] = useState(false)

  if (ambiente === null) return null
  if (ambiente === 'instalado')
    return <p className="miudo">O GBFinanças já está instalado neste aparelho.</p>

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className={className}
        onClick={() => (podeInstalar ? void instalar() : setAjuda((v) => !v))}
        aria-expanded={podeInstalar ? undefined : ajuda}
      >
        <Download size={17} aria-hidden="true" /> Instalar app
      </button>
      {ajuda &&
        (ambiente === 'ios' ? (
          <p className="text-[.9375rem] text-t2">
            No Safari, toque em{' '}
            <Share size={15} className="inline align-[-2px]" aria-label="Compartilhar" />{' '}
            <b>Compartilhar</b> e depois em{' '}
            <SquarePlus size={15} className="inline align-[-2px]" aria-hidden="true" />{' '}
            <b>Adicionar à Tela de Início</b>.
          </p>
        ) : (
          <p className="text-[.9375rem] text-t2">
            No computador, abra no Chrome ou no Edge e clique no ícone de instalar, no fim da barra
            de endereço. No Android, abra o menu <b>⋮</b> do Chrome e toque em <b>Instalar app</b>.
          </p>
        ))}
    </div>
  )
}
