import type { ButtonHTMLAttributes } from 'react'
import AnelMarca from './AnelMarca'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante: 'primario' | 'fantasma'
  estado?: 'normal' | 'carregando' | 'sucesso'
  rotuloCarregando?: string
}

export default function Botao({
  variante,
  estado = 'normal',
  rotuloCarregando,
  className = '',
  type = 'button',
  disabled,
  children,
  ...resto
}: Props) {
  const carregando = estado === 'carregando'
  const sucesso = estado === 'sucesso'
  return (
    <button
      type={type}
      disabled={disabled || carregando || sucesso}
      aria-busy={carregando || undefined}
      data-estado={estado}
      className={`btn toque ${variante === 'primario' ? 'btn-primario' : 'btn-fantasma'} ${className}`}
      {...resto}
    >
      {carregando ? (
        <span className="mov-espera">{rotuloCarregando ?? children}</span>
      ) : (
        <>
          {sucesso && <AnelMarca tamanho={22} />}
          {children}
        </>
      )}
    </button>
  )
}
