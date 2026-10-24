'use client'

import { useState } from 'react'
import { aceitarConvite, lembrarConvite } from '../actions'

export default function AceitarConvite({
  codigo,
  logado,
}: {
  codigo: string
  logado: string | null
}) {
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!logado)
    return (
      <form action={() => lembrarConvite(codigo)} className="mt-6">
        <button type="submit" className="h-12 w-full rounded-2xl bg-menta font-[650] text-tinta">
          Entrar ou criar conta para aceitar
        </button>
      </form>
    )

  return (
    <div className="mt-6">
      <p className="miudo mb-3 text-t3">Você está conectado como {logado}.</p>
      <button
        type="button"
        disabled={enviando}
        className="h-12 w-full rounded-2xl bg-menta font-[650] text-tinta disabled:opacity-60"
        onClick={async () => {
          setEnviando(true)
          setErro('')
          // Deu certo: a ação redireciona para o painel e não volta aqui.
          const r = await aceitarConvite(codigo).catch(() => null)
          setEnviando(false)
          setErro(r && !r.ok ? r.mensagem : r ? '' : 'Sem conexão. Tente de novo.')
        }}
      >
        {enviando ? 'Entrando na família...' : 'Aceitar convite'}
      </button>
      {erro && (
        <p role="alert" className="mt-3 text-erro">
          {erro}
        </p>
      )}
    </div>
  )
}
