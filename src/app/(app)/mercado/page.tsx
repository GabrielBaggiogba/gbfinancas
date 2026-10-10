import { obterMercado } from '@/features/mercado/servidor'
import Mercado from '@/features/mercado/telas/Mercado'

export default async function Pagina() {
  return <Mercado mercado={await obterMercado()} />
}
