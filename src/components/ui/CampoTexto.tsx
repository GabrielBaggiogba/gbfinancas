import type { InputHTMLAttributes, PointerEvent, ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  rotulo: string
  erro?: string
  legenda?: string
  acao?: ReactNode
  icone?: ReactNode
}

// Campo com rótulo flutuante e luz que segue o ponteiro (adaptado do sign-in-flo do
// 21st.dev). O rótulo sobe por CSS quando o campo tem foco ou valor.
export default function CampoTexto({
  id,
  rotulo,
  erro,
  legenda,
  acao,
  icone,
  className = '',
  ...resto
}: Props) {
  const descricao = erro ? `${id}-erro` : legenda ? `${id}-legenda` : undefined
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div className={className}>
      <div
        className="caixa campo-flutua"
        data-erro={erro ? 'true' : undefined}
        onPointerMove={mover}
      >
        {icone && <span className="campo-icone">{icone}</span>}
        <input
          id={id}
          placeholder=" "
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao}
          {...resto}
        />
        <label htmlFor={id}>{rotulo}</label>
        {acao}
      </div>
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-2 text-[.9375rem] text-erro">
          {erro}
        </p>
      ) : legenda ? (
        <p id={`${id}-legenda`} className="mt-2 text-[.8125rem] text-t3">
          {legenda}
        </p>
      ) : null}
    </div>
  )
}
