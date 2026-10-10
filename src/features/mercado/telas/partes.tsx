'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { FUSO } from '@/lib/datas'
import { formatarVariacao, logoDoAtivo } from '../acoes'

export const horario = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Logo da empresa (ícones da brapi). Se não carregar, entram as duas primeiras letras. */
export function Logo({ codigo, tamanho = 32 }: { codigo: string; tamanho?: number }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <span
      className="ativo-logo"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.34 }}
      aria-hidden="true"
    >
      {falhou ? (
        codigo.slice(0, 2)
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoDoAtivo(codigo)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFalhou(true)}
        />
      )}
    </span>
  )
}

/** Variação com seta e cor; a palavra "alta"/"baixa" vai para leitores de tela. */
export function Variacao({ valor, pilula = false }: { valor: number; pilula?: boolean }) {
  const sentido = valor > 0 ? 'alta' : valor < 0 ? 'baixa' : 'estavel'
  const Icone = valor < 0 ? TrendingDown : TrendingUp
  return (
    <span className={`variacao variacao-${sentido} ${pilula ? 'variacao-pilula' : ''}`}>
      {sentido !== 'estavel' && <Icone size={14} aria-hidden="true" />}
      {sentido !== 'estavel' && <span className="sr-only">{sentido} de </span>}
      {formatarVariacao(valor)}
    </span>
  )
}
