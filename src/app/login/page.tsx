import { redirect } from 'next/navigation'
import { obterUsuario } from '@/features/auth/sessao'
import FormularioAuth from '@/features/auth/components/FormularioAuth'
import { obterModo } from '@/lib/modo'

export default async function Login({
  searchParams,
}: {
  searchParams: { aviso?: string; erro?: string }
}) {
  const modo = obterModo()
  if (modo === 'pendente') redirect('/configuracao')
  if (await obterUsuario()) redirect('/')

  return (
    <FormularioAuth
      demo={modo === 'demo'}
      aviso={searchParams.aviso === 'confirmado' ? 'confirmado' : undefined}
      erroLink={searchParams.erro === 'link'}
    />
  )
}
