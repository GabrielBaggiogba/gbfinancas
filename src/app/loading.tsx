import Carregador from '@/components/ui/Carregador'

export default function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <Carregador />
        <span className="mov-espera text-t3">Carregando</span>
      </div>
    </div>
  )
}
