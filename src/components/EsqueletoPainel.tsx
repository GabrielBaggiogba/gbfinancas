export default function EsqueletoPainel() {
  const bloco = 'rgba(255,255,255,.06)'
  return (
    <div role="status" aria-live="polite">
      <main className="grade-painel">
        <div className="coluna-esquerda">
          <div className="cartao h-[176px] p-5">
            <div className="h-4 w-44 rounded-full" style={{ background: bloco }} />
            <div className="mt-5 h-12 w-56 rounded-2xl" style={{ background: bloco }} />
          </div>
          <div className="cartao h-[300px] p-5">
            <div className="h-5 w-32 rounded-full" style={{ background: bloco }} />
            <div className="mt-5 h-[76px] rounded-[18px]" style={{ background: bloco }} />
            <div className="mt-3 h-[76px] rounded-[18px]" style={{ background: bloco }} />
          </div>
        </div>
        <div className="cartao h-[320px] p-5">
          <div className="h-5 w-36 rounded-full" style={{ background: bloco }} />
        </div>
        <p className="mov-espera pb-10 text-center text-[.8125rem] text-t3">Carregando</p>
      </main>
    </div>
  )
}
