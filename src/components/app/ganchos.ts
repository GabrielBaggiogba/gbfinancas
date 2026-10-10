'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const useEfeitoIso = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function useMidia(consulta: string): boolean {
  const [bate, setBate] = useState(false)
  useEfeitoIso(() => {
    const m = window.matchMedia(consulta)
    const atualizar = () => setBate(m.matches)
    atualizar()
    m.addEventListener('change', atualizar)
    return () => m.removeEventListener('change', atualizar)
  }, [consulta])
  return bate
}

export const useCelular = () => useMidia('(max-width: 760px)')

/** Largura do elemento, para gráficos em SVG desenhados em pixels reais. */
export function useLargura<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)
  useEfeitoIso(() => {
    const el = ref.current
    if (!el) return
    setLargura(el.clientWidth)
    const obs = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, largura]
}

/** Onde as camadas (folhas, menus, diálogos) são montadas: dentro de .app, para herdar o tema. */
export function useCamadas(): HTMLElement | null {
  const [no, setNo] = useState<HTMLElement | null>(null)
  useEffect(() => setNo(document.getElementById('camadas')), [])
  return no
}
