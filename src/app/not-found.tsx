import Link from 'next/link'

export default function NaoEncontrada() {
  return (
    <main className="pagina-auth justify-center !pt-6">
      <h1 className="text-[1.25rem] font-[650] leading-[1.2] tracking-[-0.02em]">
        Página não encontrada
      </h1>
      <Link href="/" className="btn btn-primario toque mt-6 no-underline">
        Voltar ao início
      </Link>
    </main>
  )
}
