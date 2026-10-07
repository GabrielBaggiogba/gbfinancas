'use client'

import { useRouter } from 'next/navigation'
import { startTransition } from 'react'
import Botao from '@/components/ui/Botao'

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  return (
    <main className="pagina-auth justify-center !pt-6">
      <h1 className="text-[1.25rem] font-[650] leading-[1.2] tracking-[-0.02em]">
        Não foi possível carregar seus dados
      </h1>
      <p className="mb-6 mt-2 text-t2">Verifique a conexão e tente de novo.</p>
      <Botao
        variante="primario"
        onClick={() =>
          startTransition(() => {
            router.refresh()
            reset()
          })
        }
      >
        Tentar de novo
      </Botao>
    </main>
  )
}
