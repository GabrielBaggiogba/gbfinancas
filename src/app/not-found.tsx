import Link from 'next/link'
import Mascote from '@/components/ui/Mascote'

export default function NaoEncontrada() {
  return (
    <main className="pagina-auth items-center justify-center !pt-6 text-center">
      <Mascote tamanho={96} humor="pensando" />
      <h1 className="mt-3 text-[1.25rem] font-[650] leading-[1.2] tracking-[-0.02em]">
        Página não encontrada
      </h1>
      <Link href="/" className="btn btn-primario toque mt-6 no-underline">
        Voltar ao início
      </Link>
    </main>
  )
}
