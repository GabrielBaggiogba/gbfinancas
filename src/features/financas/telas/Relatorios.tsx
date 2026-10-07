'use client'

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import Abas from '@/components/app/Abas'
import { IconeCategoria } from '@/components/app/Icones'
import Valor from '@/components/app/Valor'
import BarrasMensais from '@/components/graficos/BarrasMensais'
import Linha from '@/components/graficos/Linha'
import Rosca from '@/components/graficos/Rosca'
import { Barra, Holofote } from '@/components/motion/Efeitos'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { MOLA } from '@/components/motion/molas'
import { baixar, paraCSV } from '@/lib/csv'
import {
  dataBR,
  dataCurta,
  fimDoMes,
  inicioDoMes,
  listarMeses,
  mesDe,
  rotuloMes,
  rotuloMesCurto,
  somarMesRef,
} from '@/lib/datas'
import { formatarCentavos, formatarPct } from '@/lib/dinheiro'
import {
  agruparFatias,
  evolucaoDoPatrimonio,
  gastosPorCategoria,
  maioresDespesas,
  resumoDoMes,
  serieMensal,
  variacaoPorCategoria,
  type Resumo,
} from '../calculos'
import { useEditor } from '../components/Editor'
import { nomeDaCategoria, tituloDoLancamento } from '../fabrica'
import { useDados } from '../store'
import { Bloco, LinhaDeLancamento, SeletorDeMes } from './partes'

type Aba = 'mensal' | 'anual' | 'comparar'

function Indicadores({ r }: { r: Resumo }) {
  const itens = [
    { rotulo: 'Entradas', valor: <Valor centavos={r.entradas} animado className="text-gelo" /> },
    { rotulo: 'Saídas', valor: <Valor centavos={r.saidas} animado /> },
    {
      rotulo: 'Saldo',
      valor: <Valor centavos={r.saldo} animado className={r.saldo < 0 ? 'text-erro' : ''} />,
    },
    {
      rotulo: 'Taxa de economia',
      valor:
        r.taxaEconomia === null ? <span className="text-t3">—</span> : formatarPct(r.taxaEconomia),
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-[var(--vao)] min-[900px]:grid-cols-4">
      {itens.map((k) => (
        <Holofote key={k.rotulo} className="cartao cartao-pad" variants={itemSurgir}>
          <p className="legenda">{k.rotulo}</p>
          <p className="grande mt-2 truncate">{k.valor}</p>
        </Holofote>
      ))}
    </div>
  )
}

function Delta({
  atual,
  anterior,
  bomSeCair = true,
}: {
  atual: number
  anterior: number
  bomSeCair?: boolean
}) {
  if (anterior === 0 && atual === 0) return <span className="miudo">—</span>
  if (anterior === 0) return <span className="selo">novo</span>
  const pct = (atual - anterior) / anterior
  const subiu = pct > 0
  const bom = subiu !== bomSeCair
  const I = subiu ? TrendingUp : TrendingDown
  return (
    <span className={`selo ${Math.abs(pct) < 0.005 ? '' : bom ? 'selo-ok' : 'selo-erro'}`}>
      <I size={12} aria-hidden="true" />
      {subiu ? '+' : '−'}
      {Math.abs(Math.round(pct * 100))}%
    </span>
  )
}

export default function Relatorios() {
  const { dados, hoje } = useDados()
  const [aba, setAba] = useState<Aba>('mensal')
  const [ref, setRef] = useState(mesDe(hoje))
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)))
  const [refB, setRefB] = useState(somarMesRef(mesDe(hoje), -1))

  const exportar = () => {
    const linhas: (string | number)[][] = []
    if (aba === 'anual') {
      linhas.push(['Mês', 'Entradas', 'Saídas', 'Saldo'])
      for (const m of serieMensal(dados, listarMeses(`${ano}-12`, 12)))
        linhas.push([
          rotuloMes(m.ref),
          formatarCentavos(m.entradas),
          formatarCentavos(m.saidas),
          `${m.saldo < 0 ? '-' : ''}${formatarCentavos(m.saldo)}`,
        ])
    } else {
      const r = resumoDoMes(dados, ref)
      linhas.push([`Relatório de ${rotuloMes(ref)}`], [])
      linhas.push(
        ['Entradas', formatarCentavos(r.entradas)],
        ['Saídas', formatarCentavos(r.saidas)],
        ['Saldo', `${r.saldo < 0 ? '-' : ''}${formatarCentavos(r.saldo)}`],
        [],
      )
      linhas.push(['Categoria', 'Total'])
      for (const f of gastosPorCategoria(dados, inicioDoMes(ref), fimDoMes(ref)))
        linhas.push([f.nome, formatarCentavos(f.total)])
      linhas.push([], ['Maiores despesas'], ['Data', 'Descrição', 'Categoria', 'Valor'])
      for (const l of maioresDespesas(dados, inicioDoMes(ref), fimDoMes(ref)))
        linhas.push([
          dataBR(l.data),
          tituloDoLancamento(l, dados),
          nomeDaCategoria(l.categoria_id, dados.categorias),
          formatarCentavos(l.valor),
        ])
    }
    baixar(
      `gbfinancas-relatorio-${aba === 'anual' ? ano : ref}.csv`,
      paraCSV(linhas),
      'text/csv;charset=utf-8',
    )
  }

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <motion.div
        variants={itemSurgir}
        className="nao-imprimir flex flex-wrap items-center gap-2.5"
      >
        <Abas
          rotulo="Tipo de relatório"
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'mensal', rotulo: 'Mensal' },
            { valor: 'anual', rotulo: 'Anual' },
            { valor: 'comparar', rotulo: 'Comparar' },
          ]}
        />
        {aba === 'anual' ? (
          <div className="inline-flex items-center gap-1 rounded-[13px] bg-painel2 p-[3px] shadow-[inset_0_0_0_1px_var(--linha)]">
            <button
              type="button"
              className="b b-fantasma b-icone h-9 w-9"
              aria-label="Ano anterior"
              onClick={() => setAno((a) => a - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span
              className="num w-[64px] text-center text-[.9375rem] font-[620]"
              aria-live="polite"
            >
              {ano}
            </span>
            <button
              type="button"
              className="b b-fantasma b-icone h-9 w-9"
              aria-label="Próximo ano"
              disabled={ano >= Number(hoje.slice(0, 4))}
              onClick={() => setAno((a) => a + 1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <SeletorDeMes valor={ref} aoMudar={setRef} hoje={hoje} />
            {aba === 'comparar' && (
              <>
                <span className="miudo">com</span>
                <SeletorDeMes valor={refB} aoMudar={setRefB} hoje={hoje} />
              </>
            )}
          </>
        )}
        <div className="ml-auto flex gap-2">
          {aba !== 'comparar' && (
            <button type="button" className="b b-suave" onClick={exportar}>
              <Download size={17} aria-hidden="true" /> CSV
            </button>
          )}
          <button type="button" className="b b-suave" onClick={() => window.print()}>
            <Printer size={17} aria-hidden="true" /> Imprimir ou PDF
          </button>
        </div>
      </motion.div>

      <h2 className="so-impressao titulo-pagina">
        GBFinanças ·{' '}
        {aba === 'anual'
          ? `Relatório de ${ano}`
          : aba === 'comparar'
            ? `${rotuloMes(ref)} e ${rotuloMes(refB)}`
            : `Relatório de ${rotuloMes(ref)}`}
      </h2>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={aba}
          className="grid gap-[var(--vao)]"
          initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8 }}
          transition={MOLA}
        >
          {aba === 'mensal' && <Mensal mes={ref} />}
          {aba === 'anual' && <Anual ano={ano} />}
          {aba === 'comparar' && <Comparar a={ref} b={refB} />}
        </motion.div>
      </AnimatePresence>
    </Surgir>
  )
}

function Mensal({ mes }: { mes: string }) {
  const { dados, hoje } = useDados()
  const { editar } = useEditor()
  const c = useMemo(() => {
    const anterior = somarMesRef(mes, -1)
    const atual: [string, string] = [inicioDoMes(mes), fimDoMes(mes)]
    const variacoes = variacaoPorCategoria(dados, atual, [
      inicioDoMes(anterior),
      fimDoMes(anterior),
    ])
    return {
      resumo: resumoDoMes(dados, mes),
      antes: resumoDoMes(dados, anterior),
      fatias: gastosPorCategoria(dados, ...atual),
      entradas: gastosPorCategoria(dados, ...atual, 'receita'),
      maiores: maioresDespesas(dados, ...atual),
      cresceram: variacoes.filter((v) => v.diferenca > 0).slice(0, 5),
      variacoes: new Map(variacoes.map((v) => [v.id ?? 'sem', v])),
    }
  }, [dados, mes])
  const maior = c.fatias[0]?.total ?? 1

  return (
    <Surgir key={mes} className="grid gap-[var(--vao)]">
      <Indicadores r={c.resumo} />
      <div className="grid gap-[var(--vao)] min-[1100px]:grid-cols-2">
        <Bloco titulo="Saídas por categoria">
          {c.fatias.length === 0 ? (
            <p className="py-6 text-center text-t2">Nenhuma saída neste mês.</p>
          ) : (
            <Rosca fatias={agruparFatias(c.fatias)} rotuloCentro="Total de saídas" />
          )}
        </Bloco>
        <Bloco titulo="Entradas por categoria">
          {c.entradas.length === 0 ? (
            <p className="py-6 text-center text-t2">Nenhuma entrada neste mês.</p>
          ) : (
            <Rosca fatias={agruparFatias(c.entradas)} rotuloCentro="Total de entradas" />
          )}
        </Bloco>
      </div>

      {c.fatias.length > 0 && (
        <Bloco
          titulo="Categorias em detalhe"
          acao={<span className="miudo">comparado ao mês anterior</span>}
        >
          <div className="grid gap-3.5">
            {c.fatias.map((f) => {
              const v = c.variacoes.get(f.id ?? 'sem')
              return (
                <div
                  key={f.id ?? 'sem'}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2.5 font-[560]">
                    <IconeCategoria
                      icone={f.icone}
                      cor={f.cor}
                      tamanho={14}
                      className="!h-7 !w-7 !rounded-lg"
                    />
                    <span className="truncate">{f.nome}</span>
                    <span className="miudo num flex-none">
                      {formatarPct(f.total / (c.resumo.saidas || 1))}
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    <Delta atual={f.total} anterior={v?.anterior ?? 0} />
                    <Valor centavos={f.total} className="w-[112px] text-right font-[600]" />
                  </span>
                  <Barra className="col-span-2" pct={f.total / maior} cor={f.cor} />
                </div>
              )
            })}
          </div>
        </Bloco>
      )}

      <div className="grid gap-[var(--vao)] min-[1100px]:grid-cols-2">
        <Bloco titulo="10 maiores despesas" semPad>
          {c.maiores.length === 0 ? (
            <p className="px-[var(--pad)] pb-[var(--pad)] pt-2 text-t2">
              Nenhuma despesa neste mês.
            </p>
          ) : (
            <div className="pb-2">
              {c.maiores.map((l) => (
                <LinhaDeLancamento
                  key={l.id}
                  l={l}
                  dados={dados}
                  hoje={hoje}
                  aoClicar={() => editar(l)}
                />
              ))}
            </div>
          )}
        </Bloco>
        <Bloco titulo="Categorias que mais cresceram">
          {c.cresceram.length === 0 ? (
            <p className="text-t2">Nenhuma categoria subiu em relação ao mês anterior.</p>
          ) : (
            <ul className="grid gap-3">
              {c.cresceram.map((v) => (
                <li key={v.id ?? 'sem'} className="flex items-center gap-3">
                  <IconeCategoria icone={v.icone} cor={v.cor} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-[560]">{v.nome}</span>
                    <span className="miudo block">
                      de <Valor centavos={v.anterior} /> para <Valor centavos={v.total} />
                    </span>
                  </span>
                  <span className="text-right">
                    <Valor centavos={v.diferenca} sinal="mais" className="block font-[600]" />
                    <Delta atual={v.total} anterior={v.anterior} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>
      <p className="miudo">
        Resumo de {rotuloMes(mes)}. O mês anterior fechou com <Valor centavos={c.antes.saidas} /> em
        saídas.
      </p>
    </Surgir>
  )
}

function Anual({ ano }: { ano: number }) {
  const { dados, hoje } = useDados()
  const c = useMemo(() => {
    const meses = listarMeses(`${ano}-12`, 12)
    const serie = serieMensal(dados, meses)
    const ateHoje = meses.filter((m) => m <= mesDe(hoje))
    const datas = ateHoje.map((m) => (m === mesDe(hoje) ? hoje : fimDoMes(m)))
    const patrimonios = evolucaoDoPatrimonio(dados, datas)
    const entradas = serie.reduce((s, m) => s + m.entradas, 0)
    const saidas = serie.reduce((s, m) => s + m.saidas, 0)
    return {
      serie,
      total: {
        entradas,
        saidas,
        saldo: entradas - saidas,
        taxaEconomia: entradas > 0 ? (entradas - saidas) / entradas : null,
      },
      patrimonio: ateHoje.map((m, i) => ({
        rotulo: rotuloMesCurto(m),
        titulo: rotuloMes(m),
        valor: patrimonios[i],
      })),
      fatias: gastosPorCategoria(dados, `${ano}-01-01`, `${ano}-12-31`),
    }
  }, [dados, ano, hoje])

  return (
    <Surgir key={ano} className="grid gap-[var(--vao)]">
      <Indicadores r={c.total} />
      <div className="grid gap-[var(--vao)] min-[1100px]:grid-cols-2">
        <Bloco titulo="Entradas e saídas mês a mês">
          <BarrasMensais
            series={['Entradas', 'Saídas']}
            grupos={c.serie.map((m) => ({
              rotulo: rotuloMesCurto(m.ref),
              titulo: rotuloMes(m.ref),
              a: m.entradas,
              b: m.saidas,
            }))}
            altura={250}
          />
        </Bloco>
        <Bloco titulo="Evolução do patrimônio">
          {c.patrimonio.length < 2 ? (
            <p className="py-6 text-center text-t2">Ainda não há meses suficientes neste ano.</p>
          ) : (
            <Linha pontos={c.patrimonio} nome="Patrimônio" altura={276} />
          )}
        </Bloco>
      </div>
      <Bloco titulo="Mês a mês" semPad>
        <div className="overflow-x-auto">
          <table className="tabela tabela-fixa">
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col" className="text-right">
                  Entradas
                </th>
                <th scope="col" className="text-right">
                  Saídas
                </th>
                <th scope="col" className="text-right">
                  Saldo
                </th>
                <th scope="col" className="text-right">
                  Economia
                </th>
                <th scope="col" className="text-right">
                  Saídas vs. mês anterior
                </th>
              </tr>
            </thead>
            <tbody>
              {c.serie.map((m, i) => (
                <tr key={m.ref} className={m.ref > mesDe(hoje) ? 'opacity-40' : ''}>
                  <td className="font-[560] capitalize">{rotuloMesCurto(m.ref, true)}</td>
                  <td className="text-right">
                    <Valor centavos={m.entradas} className="text-gelo" />
                  </td>
                  <td className="text-right">
                    <Valor centavos={m.saidas} />
                  </td>
                  <td className="text-right">
                    <Valor
                      centavos={m.saldo}
                      className={`font-[600] ${m.saldo < 0 ? 'text-erro' : ''}`}
                    />
                  </td>
                  <td className="num text-right text-t2">
                    {m.taxaEconomia === null ? '—' : formatarPct(m.taxaEconomia)}
                  </td>
                  <td className="text-right">
                    {i === 0 ? (
                      <span className="miudo">—</span>
                    ) : (
                      <Delta atual={m.saidas} anterior={c.serie[i - 1].saidas} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>
      {c.fatias.length > 0 && (
        <Bloco titulo={`Para onde foi o dinheiro em ${ano}`}>
          <Rosca fatias={agruparFatias(c.fatias, 8)} rotuloCentro="Saídas do ano" />
        </Bloco>
      )}
    </Surgir>
  )
}

function Comparar({ a, b }: { a: string; b: string }) {
  const { dados } = useDados()
  const c = useMemo(() => {
    const ra = resumoDoMes(dados, a)
    const rb = resumoDoMes(dados, b)
    const variacoes = variacaoPorCategoria(
      dados,
      [inicioDoMes(a), fimDoMes(a)],
      [inicioDoMes(b), fimDoMes(b)],
    )
    return {
      ra,
      rb,
      variacoes: variacoes.sort(
        (x, y) => Math.max(y.total, y.anterior) - Math.max(x.total, x.anterior),
      ),
    }
  }, [dados, a, b])
  const maior = Math.max(1, ...c.variacoes.flatMap((v) => [v.total, v.anterior]))
  const linhas: { rotulo: string; a: number; b: number; bomSeCair: boolean }[] = [
    { rotulo: 'Entradas', a: c.ra.entradas, b: c.rb.entradas, bomSeCair: false },
    { rotulo: 'Saídas', a: c.ra.saidas, b: c.rb.saidas, bomSeCair: true },
    { rotulo: 'Saldo', a: c.ra.saldo, b: c.rb.saldo, bomSeCair: false },
  ]

  return (
    <Surgir key={`${a}-${b}`} className="grid gap-[var(--vao)]">
      <Bloco titulo="Resumo dos dois meses" semPad>
        <div className="overflow-x-auto">
          <table className="tabela tabela-fixa">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Indicador</span>
                </th>
                <th scope="col" className="text-right capitalize">
                  {rotuloMesCurto(a, true)}
                </th>
                <th scope="col" className="text-right capitalize">
                  {rotuloMesCurto(b, true)}
                </th>
                <th scope="col" className="text-right">
                  Diferença
                </th>
                <th scope="col" className="text-right">
                  Variação
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.rotulo}>
                  <td className="font-[560]">{l.rotulo}</td>
                  <td className="text-right">
                    <Valor centavos={l.a} className="font-[600]" />
                  </td>
                  <td className="text-right">
                    <Valor centavos={l.b} className="text-t2" />
                  </td>
                  <td className="text-right">
                    <Valor centavos={l.a - l.b} sinal={l.a - l.b >= 0 ? 'mais' : 'menos'} />
                  </td>
                  <td className="text-right">
                    {l.rotulo === 'Saldo' ? (
                      <span className="miudo">—</span>
                    ) : (
                      <Delta atual={l.a} anterior={l.b} bomSeCair={l.bomSeCair} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>

      <Bloco titulo="Saídas por categoria, lado a lado">
        {c.variacoes.length === 0 ? (
          <p className="py-6 text-center text-t2">Nenhuma saída nos dois meses.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
              <span className="legenda inline-flex items-center gap-2 capitalize">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-azul" />
                {rotuloMesCurto(a, true)}
              </span>
              <span className="legenda inline-flex items-center gap-2 capitalize">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-[color:var(--serie-neutra)]" />
                {rotuloMesCurto(b, true)}
              </span>
            </div>
            <div className="grid gap-4">
              {c.variacoes.map((v) => (
                <div key={v.id ?? 'sem'}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5 font-[560]">
                      <IconeCategoria
                        icone={v.icone}
                        cor={v.cor}
                        tamanho={14}
                        className="!h-7 !w-7 !rounded-lg"
                      />
                      <span className="truncate">{v.nome}</span>
                    </span>
                    <span className="flex flex-none items-center gap-2.5">
                      <Delta atual={v.total} anterior={v.anterior} />
                      <span className="miudo num">
                        <Valor centavos={v.total} className="font-[600] text-t1" /> ·{' '}
                        <Valor centavos={v.anterior} />
                      </span>
                    </span>
                  </div>
                  <div className="grid gap-1">
                    <Barra pct={v.total / maior} cor="var(--azul)" />
                    <Barra pct={v.anterior / maior} cor="var(--serie-neutra)" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Bloco>
      <p className="miudo">
        Comparando {rotuloMes(a)} com {rotuloMes(b)}. Datas de referência:{' '}
        {dataCurta(inicioDoMes(a))} a {dataCurta(fimDoMes(a))}.
      </p>
    </Surgir>
  )
}
