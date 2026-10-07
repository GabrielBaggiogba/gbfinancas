'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Tema = 'sistema' | 'escuro' | 'claro'
type Prefs = { tema: Tema; compacto: boolean; ocultar: boolean }
type Contexto = Prefs & { definir: (p: Partial<Prefs>) => void }

const Ctx = createContext<Contexto | null>(null)

function gravarCookie(nome: string, valor: string) {
  document.cookie = `${nome}=${valor}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`
}

/** Tema, modo compacto e valores ocultos. Ficam em cookies para o servidor já renderizar certo. */
export function ProvedorDePreferencias({
  inicial,
  children,
}: {
  inicial: Prefs
  children: ReactNode
}) {
  const [prefs, setPrefs] = useState(inicial)

  const definir = useCallback((p: Partial<Prefs>) => {
    setPrefs((atual) => {
      const novo = { ...atual, ...p }
      gravarCookie('gbf_tema', novo.tema)
      gravarCookie('gbf_compacto', novo.compacto ? '1' : '0')
      gravarCookie('gbf_ocultar', novo.ocultar ? '1' : '0')
      return novo
    })
  }, [])

  // O fundo do <html> acompanha o tema (aparece na rolagem elástica e na barra do navegador).
  useEffect(() => {
    const raiz = document.documentElement
    const claro =
      prefs.tema === 'claro' ||
      (prefs.tema === 'sistema' && window.matchMedia('(prefers-color-scheme: light)').matches)
    raiz.style.background = claro ? '#f3f5f8' : ''
    raiz.style.colorScheme = claro ? 'light' : ''
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', claro ? '#f3f5f8' : '#000000')
    return () => {
      raiz.style.background = ''
      raiz.style.colorScheme = ''
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000')
    }
  }, [prefs.tema])

  return (
    <Ctx.Provider value={{ ...prefs, definir }}>
      <div
        className="app"
        data-tema={prefs.tema}
        data-compacto={prefs.compacto}
        data-ocultar={prefs.ocultar}
      >
        {children}
      </div>
    </Ctx.Provider>
  )
}

export function usePreferencias(): Contexto {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePreferencias fora do provedor')
  return ctx
}
