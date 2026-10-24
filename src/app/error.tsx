'use client'

import { useRouter } from 'next/navigation'
import { startTransition } from 'react'
import Botao from '@/components/ui/Botao'
import Mascote from '@/components/ui/Mascote'

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  return (
    <main className="pagina-auth items-center justify-center !pt-6 text-center">
      <Mascote tamanho={96} humor="pensando" />
      <h1 className="mt-3 text-[1.25rem] font-[650] leading-[1.2] tracking-[-0.02em]">
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
