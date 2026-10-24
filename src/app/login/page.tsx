import { redirect } from 'next/navigation'
import { obterUsuario } from '@/features/auth/sessao'
import FormularioAuth from '@/features/auth/components/FormularioAuth'
import { obterModo } from '@/lib/modo'

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; erro?: string }>
}) {
  const { aviso, erro } = await searchParams
  const modo = obterModo()
  if (modo === 'pendente') redirect('/configuracao')
  if (await obterUsuario()) redirect('/')

  return (
    <FormularioAuth
      demo={modo === 'demo'}
      aviso={aviso === 'confirmado' ? 'confirmado' : undefined}
      erroLink={erro === 'link'}
    />
  )
}
