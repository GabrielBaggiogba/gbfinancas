import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Marca from '@/components/ui/Marca'
import { obterUsuario } from '@/features/auth/sessao'
import { CODIGO_CONVITE } from '@/features/familia/convite'
import AceitarConvite from '@/features/familia/telas/AceitarConvite'

export const metadata: Metadata = { title: 'Convite · GBFinanças' }

export default async function Pagina({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  if (!CODIGO_CONVITE.test(codigo)) notFound()
  const usuario = await obterUsuario()
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-4">
      <div className="w-full max-w-md rounded-[28px] bg-painel p-7 shadow-[0_30px_60px_-30px_rgba(6,60,30,.45)]">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--verde)_14%,transparent)]">
          <Marca tamanho={26} />
        </span>
        <h1 className="mt-5 text-[1.5rem] font-[700] tracking-[-.03em]">
          Convite para finanças compartilhadas
        </h1>
        <p className="mt-2 text-t2">
          Ao aceitar, você passa a ver e lançar nas finanças de quem convidou, com o seu próprio
          login. Seus dados pessoais ficam guardados e voltam se você sair da família.
        </p>
        <AceitarConvite codigo={codigo} logado={usuario?.email ?? null} />
      </div>
    </main>
  )
}
