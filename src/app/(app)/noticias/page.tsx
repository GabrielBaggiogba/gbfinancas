import AcompanheOMercado from '@/features/mercado/telas/AcompanheOMercado'
import Noticias from '@/features/noticias/telas/Noticias'
import { obterNoticias } from '@/features/noticias/servidor'

export default async function Pagina() {
  const dados = await obterNoticias()
  return (
    <div className="grid gap-[calc(var(--vao)*2)]">
      <Noticias dados={dados} agora={Date.now()} />
      <AcompanheOMercado />
    </div>
  )
}
