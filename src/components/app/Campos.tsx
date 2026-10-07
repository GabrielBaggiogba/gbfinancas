'use client'

import { useId, useRef, type ClipboardEvent, type ReactNode } from 'react'
import { digitosParaCentavos, formatarCentavos, interpretarMoeda } from '@/lib/dinheiro'

export function Campo({
  rotulo,
  children,
  dica,
  className = '',
}: {
  rotulo: string
  children: (id: string) => ReactNode
  dica?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      {children(id)}
      {dica && <p className="miudo mt-1.5">{dica}</p>}
    </div>
  )
}

/** Campo de dinheiro com máscara de centavos: cada dígito entra pela direita. */
export function CampoValor({
  id,
  valor,
  aoMudar,
  grande = false,
  autoFoco = false,
  rotuloAria,
}: {
  id?: string
  valor: number
  aoMudar: (centavos: number) => void
  grande?: boolean
  autoFoco?: boolean
  rotuloAria?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const irAoFim = () => {
    const el = ref.current
    if (!el) return
    const fim = el.value.length
    el.setSelectionRange(fim, fim)
    requestAnimationFrame(() => el.setSelectionRange(fim, fim))
  }
  const colar = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const c = interpretarMoeda(e.clipboardData.getData('text'))
    if (c !== null) aoMudar(c)
  }
  const entrada = (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      enterKeyHint="done"
      aria-label={rotuloAria}
      data-autofoco={autoFoco || undefined}
      className={grande ? 'num' : 'controle num text-right'}
      value={formatarCentavos(valor)}
      onChange={(e) => {
        if (e.target.value.replace(/\D/g, '').length > 10) return
        aoMudar(digitosParaCentavos(e.target.value))
      }}
      onFocus={irAoFim}
      onClick={irAoFim}
      onPaste={colar}
    />
  )
  if (!grande) return entrada
  return (
    <div className="valor-grande">
      <span className="text-[1.125rem] font-[560] text-t3">R$</span>
      {entrada}
    </div>
  )
}

/** Estado vazio com halo de respiração (Krivvo): a tela espera a pessoa agir. */
export function Vazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: ReactNode
  titulo: string
  texto: string
  acao?: ReactNode
}) {
  return (
    <div className="relative flex flex-col items-center px-6 py-12 text-center">
      <div className="relative mb-5 grid h-[72px] w-[72px] place-items-center">
        <span className="respira inset-[-22px]" />
        <span className="relative grid h-[72px] w-[72px] place-items-center rounded-full bg-painel2 text-gelo shadow-[inset_0_0_0_1px_var(--linha2)]">
          {icone}
        </span>
      </div>
      <h3 className="titulo-secao">{titulo}</h3>
      <p className="mt-1.5 max-w-[34ch] text-t2">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}
