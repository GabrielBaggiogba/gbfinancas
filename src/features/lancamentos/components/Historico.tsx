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
  // Quantidade de caracteres da maior data e dos maiores valores: o corpo da linha
  // encolhe (ver .historico no CSS) para que tudo caiba sem cortar nem rolar.
  let caracteresData = 'Hoje'.length
  let caracteresEntrada = 'Entrada'.length
  let caracteresSaida = 'Saída'.length
  for (const l of linhas) {
    caracteresData = Math.max(caracteresData, rotuloCurto(l.data, hoje).length)
    if (l.lancamento && l.lancamento.receitaCentavos > 0)
      caracteresEntrada = Math.max(caracteresEntrada, entrada(l.lancamento.receitaCentavos).length)
    if (l.lancamento && l.lancamento.despesaCentavos > 0)
      caracteresSaida = Math.max(caracteresSaida, saida(l.lancamento.despesaCentavos).length)
  }
  const medidas = {
    ['--n' as string]: caracteresData + caracteresEntrada + caracteresSaida,
  }

  return (
    <section aria-labelledby="titulo-historico" className="historico" style={medidas}>
      <h2
        id="titulo-historico"
        className="mb-2 whitespace-nowrap px-5 text-[1.25rem] font-[650] leading-[1.2] tracking-[-.02em]"
      >
        Últimos 30 dias
      </h2>

      <div className="historico-grade">
        {linhas.length > 0 && (
          <div className="historico-cab">
            <span />
            <span className="text-right text-[.8125rem] font-[550] tracking-[.01em] text-t3">
              Entrada
            </span>
            <span className="text-right text-[.8125rem] font-[550] tracking-[.01em] text-t3">
              Saída
            </span>
          </div>
        )}

        {linhas.length === 0 ? (
          <div className="cartao col-span-full flex flex-col items-center px-6 py-12 text-center">
            <div className="opacity-40">
              <Marca tamanho={40} />
            </div>
            <p className="mt-4 text-[1.0625rem] font-[600]">Nenhum dia registrado ainda</p>
            <p className="mt-1 max-w-[18rem] text-t2">
              Anote a entrada e a saída de hoje. Seu histórico aparece aqui.
            </p>
          </div>
        ) : (
          <ul className="cartao historico-lista">
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
                  >
                    <span className="whitespace-nowrap text-t1">{rotuloCurto(data, hoje)}</span>
                    <span
                      className={`val text-right font-[550] tracking-[-.01em] ${receita > 0 ? 'text-gelo' : 'text-t3'}`}
                    >
                      {receita > 0 ? entrada(receita) : '—'}
                    </span>
                    <span
                      className={`val text-right font-[550] tracking-[-.01em] ${despesa > 0 ? 'text-t2' : 'text-t3'}`}
                    >
                      {despesa > 0 ? saida(despesa) : '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
