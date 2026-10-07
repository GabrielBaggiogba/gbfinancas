'use client'

import { useEffect } from 'react'

// Registrar um ouvinte de toque faz o :active responder no iOS Safari.
export default function AtivaToque() {
  useEffect(() => {
    const ouvinte = () => {}
    document.addEventListener('touchstart', ouvinte, { passive: true })
    return () => document.removeEventListener('touchstart', ouvinte)
  }, [])
  return null
}
