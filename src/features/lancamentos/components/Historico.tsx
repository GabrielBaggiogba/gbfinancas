import Marca from '@/components/ui/Marca'
import { rotuloCurto, rotuloLongo } from '@/lib/datas'
import { formatarCentavos, formatarReais } from '@/lib/dinheiro'
import type { LinhaDia } from '../resumo'

const MENOS = '−'

type Props = {
  linhas: LinhaDia[]
  hoje: string
  selecionada: string
  ultimaSalva: { data: string | null; pulso: number }
  aoSelecionar: (data: string) => void
}

const entrada = (c: number) => `+ ${formatarCentavos(c)}`
const saida = (c: number) => `${MENOS} ${formatarCentavos(c)}`

export default function Historico({ linhas, hoje, selecionada, ultimaSalva, aoSelecionar }: Props) {
  let larguraEntrada = 'Entrada'.length
  let larguraSaida = 'Saída'.length
  for (const l of linhas) {
    if (l.lancamento && l.lancamento.receitaCentavos > 0)
      larguraEntrada = Math.max(larguraEntrada, entrada(l.lancamento.receitaCentavos).length)
    if (l.lancamento && l.lancamento.despesaCentavos > 0)
      larguraSaida = Math.max(larguraSaida, saida(l.lancamento.despesaCentavos).length)
  }
  const colunas = {
    ['--w-ent' as string]: `${larguraEntrada}ch`,
    ['--w-sai' as string]: `${larguraSaida}ch`,
  }

  return (
    <section aria-labelledby="titulo-historico">
      <div
        className="mb-3 grid grid-cols-[1fr_var(--w-ent)_var(--w-sai)] items-baseline gap-x-4 px-5"
        style={colunas}
      >
        <h2
          id="titulo-historico"
          className="text-[1.25rem] font-[650] leading-[1.2] tracking-[-.02em]"
        >
          Últimos 30 dias
        </h2>
        <span className="text-right text-[.8125rem] font-[550] tracking-[.01em] text-t3">
          Entrada
        </span>
        <span className="text-right text-[.8125rem] font-[550] tracking-[.01em] text-t3">
          Saída
        </span>
      </div>

      {linhas.length === 0 ? (
        <div className="cartao flex flex-col items-center px-6 py-12 text-center">
          <div className="opacity-40">
            <Marca tamanho={40} />
          </div>
          <p className="mt-4 text-[1.0625rem] font-[600]">Nenhum dia registrado ainda</p>
          <p className="mt-1 max-w-[18rem] text-t2">
            Anote a entrada e a saída de hoje. Seu histórico aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="cartao overflow-hidden" style={colunas}>
          {linhas.map(({ data, lancamento }) => {
            const receita = lancamento?.receitaCentavos ?? 0
            const despesa = lancamento?.despesaCentavos ?? 0
            const animar = ultimaSalva.data === data
            const rotulo =
              `Editar ${rotuloLongo(data)}: ` +
              `${receita > 0 ? `entrada ${formatarReais(receita)}` : 'sem entrada'}, ` +
              `${despesa > 0 ? `saída ${formatarReais(despesa)}` : 'sem saída'}`
            return (
              <li key={animar ? `${data}-${ultimaSalva.pulso}` : data}>
                <button
                  type="button"
                  onClick={() => aoSelecionar(data)}
                  aria-label={rotulo}
                  aria-current={data === selecionada ? 'true' : undefined}
                  className={`linha-dia toque ${animar ? 'mov-varre' : ''}`}
                  style={{ gridTemplateColumns: '1fr var(--w-ent) var(--w-sai)' }}
                >
                  <span className="text-t1">{rotuloCurto(data, hoje)}</span>
                  <span
                    className={`val text-right text-[1rem] font-[550] tracking-[-.01em] ${receita > 0 ? 'text-gelo' : 'text-t3'}`}
                  >
                    {receita > 0 ? entrada(receita) : '—'}
                  </span>
                  <span
                    className={`val text-right text-[1rem] font-[550] tracking-[-.01em] ${despesa > 0 ? 'text-t2' : 'text-t3'}`}
                  >
                    {despesa > 0 ? saida(despesa) : '—'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
