import type { Metadata } from 'next'
import { obterUsuario } from '@/features/auth/sessao'
import Vitrine from '@/features/planos/telas/Vitrine'

export const metadata: Metadata = {
  title: 'Planos · GBFinanças',
  description: 'Gestão financeira com WhatsApp e inteligência artificial. Conheça os planos.',
}

export default async function Pagina() {
  return <Vitrine logado={(await obterUsuario()) !== null} />
}
