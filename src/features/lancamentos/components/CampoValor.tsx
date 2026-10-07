'use client'

import { useRef, type ClipboardEvent, type Ref } from 'react'
import { digitosParaCentavos, formatarCentavos, interpretarMoeda } from '@/lib/dinheiro'

type Props = {
  id: string
  rotulo: string
  centavos: number
  aoMudar: (centavos: number) => void
  inputRef?: Ref<HTMLInputElement>
}

export default function CampoValor({ id, rotulo, centavos, aoMudar, inputRef }: Props) {
  const interno = useRef<HTMLInputElement | null>(null)
  const texto = formatarCentavos(centavos)

  function irParaOFim(el: HTMLInputElement) {
    const mover = () => {
      const fim = el.value.length
      el.setSelectionRange(fim, fim)
    }
    mover() // já, para a próxima tecla cair no fim
    requestAnimationFrame(mover) // de novo, porque o iOS reposiciona o cursor depois do foco
  }

  function aoDigitar(valor: string) {
    if (valor.replace(/\D/g, '').length > 10) return
    aoMudar(digitosParaCentavos(valor))
  }

  function aoColar(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const v = interpretarMoeda(e.clipboardData.getData('text'))
    if (v !== null) aoMudar(v)
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[.8125rem] font-[550] leading-[1.3] tracking-[.01em] text-t2"
      >
        {rotulo}
      </label>
      <div className="caixa flex h-[76px] items-center gap-3 px-4">
        <span aria-hidden="true" className="text-[1.0625rem] font-[550] text-t3">
          R$
        </span>
        <input
          id={id}
          ref={(el) => {
            interno.current = el
            if (typeof inputRef === 'function') inputRef(el)
            else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          value={texto}
          onChange={(e) => aoDigitar(e.target.value)}
          onFocus={(e) => irParaOFim(e.currentTarget)}
          onClick={(e) => irParaOFim(e.currentTarget)}
          onPaste={aoColar}
          className="num h-full text-right font-[600] leading-none tracking-[-.03em]"
          style={{
            fontSize: texto.length > 10 ? '1.75rem' : '2.125rem',
            color: centavos === 0 ? 'var(--t3)' : 'var(--t1)',
          }}
        />
      </div>
    </div>
  )
}
