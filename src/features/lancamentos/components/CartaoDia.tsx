import type { Ref } from 'react'
import Botao from '@/components/ui/Botao'
import { rotuloLongo } from '@/lib/datas'
import CampoValor from './CampoValor'

type Props = {
  hoje: string
  data: string
  receita: number
  despesa: number
  aoMudarReceita: (c: number) => void
  aoMudarDespesa: (c: number) => void
  botao: { estado: 'normal' | 'carregando' | 'sucesso'; rotulo: string; desabilitado: boolean }
  mensagemErro: string
  pulsoErro: number
  aoSalvar: () => void
  aoVoltar: () => void
  campoEntradaRef: Ref<HTMLInputElement>
  cartaoRef: Ref<HTMLFormElement>
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function CartaoDia(p: Props) {
  const ehHoje = p.data === p.hoje
  return (
    <form
      key={p.pulsoErro}
      ref={p.cartaoRef}
      noValidate
      aria-labelledby="titulo-dia"
      className={`cartao cartao-dia p-5 ${p.pulsoErro > 0 ? 'mov-nega' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (!p.botao.desabilitado) p.aoSalvar()
      }}
    >
      <div className="mb-4 flex min-h-[44px] items-center justify-between gap-3">
        <h2
          id="titulo-dia"
          className="min-w-0 text-[1.25rem] font-[650] leading-[1.2] tracking-[-.02em]"
        >
          {ehHoje ? (
            <>
              Hoje{' '}
              <span className="ml-1 text-[.9375rem] font-normal tracking-normal text-t3">
                {rotuloLongo(p.hoje)}
              </span>
            </>
          ) : (
            capitalizar(rotuloLongo(p.data))
          )}
        </h2>
        {!ehHoje && (
          <button
            type="button"
            onClick={p.aoVoltar}
            className="pilula mov-pilula toque alvo44 shrink-0 cursor-pointer !px-3 !py-[9px]"
          >
            Voltar para hoje
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <CampoValor
          id="valor-entrada"
          rotulo="Entrada"
          centavos={p.receita}
          aoMudar={p.aoMudarReceita}
          inputRef={p.campoEntradaRef}
        />
        <CampoValor
          id="valor-saida"
          rotulo="Saída"
          centavos={p.despesa}
          aoMudar={p.aoMudarDespesa}
        />
      </div>

      {p.mensagemErro && (
        <p role="alert" className="mt-4 text-[.9375rem] text-erro">
          {p.mensagemErro}
        </p>
      )}

      <Botao
        variante="primario"
        type="submit"
        className="mt-5"
        estado={p.botao.estado}
        rotuloCarregando="Salvando"
        disabled={p.botao.desabilitado}
      >
        {p.botao.rotulo}
      </Botao>
    </form>
  )
}
