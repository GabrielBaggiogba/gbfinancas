import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  rotulo: string
  erro?: string
  legenda?: string
  acao?: ReactNode
  icone?: ReactNode
}

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
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-[.8125rem] font-[550] leading-[1.3] tracking-[.01em] text-t2"
      >
        {icone}
        {rotulo}
      </label>
      <div className="caixa flex h-14 items-center pl-4 pr-2" data-erro={erro ? 'true' : undefined}>
        <input
          id={id}
          className="h-full text-[1.0625rem]"
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao}
          {...resto}
        />
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
