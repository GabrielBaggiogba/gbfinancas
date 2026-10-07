import Marca from '@/components/ui/Marca'

export default function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <Marca tamanho={34} />
        <span className="mov-espera text-t3">Carregando</span>
      </div>
    </div>
  )
}
