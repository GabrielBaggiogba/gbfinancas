'use client'

import type { KeyboardEvent } from 'react'

type Opcao<T extends string> = { valor: T; rotulo: string }

type Props<T extends string> = {
  opcoes: [Opcao<T>, Opcao<T>]
  valor: T
  aoMudar: (valor: T) => void
  rotulo?: string
}

export default function Segmentado<T extends string>({ opcoes, valor, aoMudar, rotulo }: Props<T>) {
  const indice = opcoes[0].valor === valor ? 0 : 1

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const novo = e.key === 'ArrowRight' ? 1 : 0
      aoMudar(opcoes[novo].valor)
      const botoes = e.currentTarget.querySelectorAll<HTMLButtonElement>('button')
      botoes[novo]?.focus()
    }
  }

  return (
    <div className="seg" role="tablist" aria-label={rotulo} onKeyDown={aoTeclar}>
      <span
        className="polegar"
        aria-hidden="true"
        style={{ transform: `translateX(${indice === 0 ? '0' : '100%'})` }}
      />
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          className="toque"
          aria-selected={o.valor === valor}
          tabIndex={o.valor === valor ? 0 : -1}
          onClick={() => aoMudar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}
