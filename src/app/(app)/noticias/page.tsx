import Noticias from '@/features/noticias/telas/Noticias'
import { obterNoticias } from '@/features/noticias/servidor'

export default async function Pagina() {
  const dados = await obterNoticias()
  return <Noticias dados={dados} agora={Date.now()} />
}
