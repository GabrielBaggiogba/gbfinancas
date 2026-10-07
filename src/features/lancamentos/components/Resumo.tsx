import { formatarReais } from '@/lib/dinheiro'
import type { Resumo as DadosResumo } from '../resumo'
import ValorAnimado from './ValorAnimado'

const MENOS = '−'

export default function Resumo({ entradas, saidas, saldo }: DadosResumo) {
  const n = formatarReais(saldo).length
  const textoEntradas = entradas > 0 ? `+ ${formatarReais(entradas)}` : formatarReais(entradas)
  const textoSaidas = saidas > 0 ? `${MENOS} ${formatarReais(saidas)}` : formatarReais(saidas)
  return (
    <section className="cartao cartao-resumo p-5" aria-labelledby="rotulo-saldo">
      <h2
        id="rotulo-saldo"
        className="text-[.8125rem] font-[550] leading-[1.3] tracking-[.01em] text-t2"
      >
        Saldo dos últimos 30 dias
      </h2>
      <div className="saldo mt-3">
        <ValorAnimado
          centavos={saldo}
          formato={formatarReais}
          className="saldo-valor text-t1"
          style={{ ['--n' as string]: n }}
        />
      </div>
      <hr className="my-5 border-0 border-t border-linha" style={{ borderTopWidth: 1 }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="total min-w-0">
          <p className="text-[.8125rem] font-[550] leading-[1.3] tracking-[.01em] text-t2">
            Entradas
          </p>
          <ValorAnimado
            centavos={entradas}
            formato={(c) => (c > 0 ? `+ ${formatarReais(c)}` : formatarReais(c))}
            className="num total-valor mt-1 block whitespace-nowrap font-[600] leading-[1.3] tracking-[-.01em] text-gelo"
            style={{ ['--n' as string]: textoEntradas.length }}
          />
        </div>
        <div className="total min-w-0">
          <p className="text-[.8125rem] font-[550] leading-[1.3] tracking-[.01em] text-t2">
            Saídas
          </p>
          <ValorAnimado
            centavos={saidas}
            formato={(c) => (c > 0 ? `${MENOS} ${formatarReais(c)}` : formatarReais(c))}
            className="num total-valor mt-1 block whitespace-nowrap font-[600] leading-[1.3] tracking-[-.01em] text-t1"
            style={{ ['--n' as string]: textoSaidas.length }}
          />
        </div>
      </div>
    </section>
  )
}
