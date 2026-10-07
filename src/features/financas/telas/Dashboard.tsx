'use client'

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  Info,
  PiggyBank,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useMemo } from 'react'
import { Vazio } from '@/components/app/Campos'
import { ICONE_DA_CONTA, IconeCategoria } from '@/components/app/Icones'
import Valor from '@/components/app/Valor'
import BarrasMensais from '@/components/graficos/BarrasMensais'
import Linha from '@/components/graficos/Linha'
import Rosca from '@/components/graficos/Rosca'
import { Anel, Barra, Holofote } from '@/components/motion/Efeitos'
import Numero from '@/components/motion/Numero'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import {
  dataCurta,
  distanciaEmDias,
  fimDoMes,
  inicioDoMes,
  listarMeses,
  mesDe,
  rotuloMes,
  rotuloMesCurto,
  somarDias,
} from '@/lib/datas'
import { formatarPct, formatarReais } from '@/lib/dinheiro'
import {
  agruparFatias,
  gastosPorCategoria,
  gerarInsights,
  progressoDaMeta,
  proximosVencimentos,
  resumoDoMes,
  saldoDisponivel,
  saldoProjetadoFimDoMes,
  saldosPorConta,
  serieMensal,
  usoDoOrcamento,
  type Insight,
} from '../calculos'
import { useEditor } from '../components/Editor'
import { operacoesDoRecorrente } from '../fabrica'
import { ROTULO_CONTA } from '../padroes'
import { useDados } from '../store'
import { Bloco, LinhaDeLancamento } from './partes'

const ICONE_INSIGHT = { alerta: CircleAlert, atencao: TriangleAlert, info: Info, bom: Sparkles }
const COR_INSIGHT = {
  alerta: 'var(--erro)',
  atencao: 'var(--aviso)',
  info: 'var(--gelo)',
  bom: 'var(--ok)',
}

export default function Dashboard() {
  const { dados, hoje, aplicar } = useDados()
  const { novo, editar, pagarFatura } = useEditor()
  const ref = mesDe(hoje)

  const c = useMemo(() => {
    const saldo = saldoDisponivel(dados, hoje)
    const mes = resumoDoMes(dados, ref)
    const saldos = saldosPorConta(dados, hoje)
    const dias = Array.from({ length: 61 }, (_, i) => somarDias(hoje, i - 60))
    return {
      saldo,
      mes,
      saldos,
      projetado: saldoProjetadoFimDoMes(dados, hoje),
      serie: serieMensal(dados, listarMeses(ref, 6)),
      fatias: agruparFatias(gastosPorCategoria(dados, inicioDoMes(ref), fimDoMes(ref))),
      evolucao: dias.map((d) => ({
        rotulo: dataCurta(d),
        titulo: dataCurta(d, hoje),
        valor: saldoDisponivel(dados, d),
      })),
      ultimos: dados.lancamentos
        .filter((l) => l.data <= hoje)
        .sort((a, b) =>
          a.data !== b.data ? (a.data < b.data ? 1 : -1) : a.created_at < b.created_at ? 1 : -1,
        )
        .slice(0, 7),
      vencimentos: proximosVencimentos(dados, hoje, 30).slice(0, 5),
      insights: gerarInsights(dados, hoje, formatarReais).slice(0, 4),
      metas: dados.metas
        .map((m) => ({ meta: m, ...progressoDaMeta(m, dados, hoje) }))
        .sort((a, b) => Number(a.concluida) - Number(b.concluida) || b.pct - a.pct)
        .slice(0, 3),
      orcamentos: dados.orcamentos
        .map((o) => ({ o, ...usoDoOrcamento(o, dados, ref) }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 4),
    }
  }, [dados, hoje, ref])

  const contaPadrao = dados.contas.find((x) => !x.arquivada)?.id ?? null
  const semMovimento = dados.lancamentos.length === 0
  const contas = dados.contas.filter((x) => !x.arquivada)

  const indicadores = [
    {
      rotulo: 'Entradas do mês',
      icone: ArrowDownLeft,
      valor: <Valor centavos={c.mes.entradas} animado className="text-gelo" />,
    },
    {
      rotulo: 'Saídas do mês',
      icone: ArrowUpRight,
      valor: <Valor centavos={c.mes.saidas} animado />,
    },
    {
      rotulo: 'Saldo projetado',
      icone: TrendingUp,
      valor: <Valor centavos={c.projetado} animado />,
      nota: `até ${dataCurta(fimDoMes(ref))}`,
    },
    {
      rotulo: 'Taxa de economia',
      icone: PiggyBank,
      valor:
        c.mes.taxaEconomia === null ? (
          <span className="text-t3">—</span>
        ) : (
          <Numero
            className="num"
            valor={Math.round(c.mes.taxaEconomia * 100)}
            formato={(n) => `${n}%`}
          />
        ),
      nota: c.mes.taxaEconomia === null ? 'sem entradas no mês' : 'do que entrou ficou com você',
    },
  ]

  return (
    <Surgir className="grid gap-[var(--vao)] min-[1280px]:grid-cols-[minmax(0,1fr)_368px]">
      {/* Coluna principal: indicadores e gráficos */}
      <div className="grid min-w-0 content-start gap-[var(--vao)]">
        <Holofote className="cartao borda-luz overflow-hidden" variants={itemSurgir}>
          <span className="aurora" aria-hidden="true" />
          <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-4 p-[calc(var(--pad)+4px)]">
            <div className="min-w-0">
              <p className="legenda flex items-center gap-2">
                <i className="ponto-vivo" aria-hidden="true" />
                Saldo atual · <span className="first-letter:uppercase">{rotuloMes(ref)}</span>
              </p>
              <p className="heroi mt-2.5">
                <Valor centavos={c.saldo} animado />
              </p>
              <p className="miudo mt-2.5">
                Somando {contas.length} {contas.length === 1 ? 'conta' : 'contas'}. No mês:{' '}
                <Valor
                  centavos={c.mes.saldo}
                  sinal={c.mes.saldo >= 0 ? 'mais' : 'menos'}
                  className={c.mes.saldo >= 0 ? 'text-gelo' : 'text-t1'}
                />
              </p>
            </div>
            <div className="w-full min-w-[200px] max-w-[320px] flex-1" aria-hidden="true">
              <Linha pontos={c.evolucao} altura={74} mini nome="Saldo" />
            </div>
          </div>
        </Holofote>

        <div className="grid grid-cols-2 gap-[var(--vao)] min-[900px]:grid-cols-4">
          {indicadores.map((k) => (
            <Holofote key={k.rotulo} className="cartao cartao-pad" variants={itemSurgir}>
              <p className="legenda flex items-center gap-2">
                <k.icone size={15} aria-hidden="true" className="text-t3" />
                {k.rotulo}
              </p>
              <p className="grande mt-2 truncate">{k.valor}</p>
              {k.nota && <p className="miudo mt-1 truncate">{k.nota}</p>}
            </Holofote>
          ))}
        </div>

        {semMovimento ? (
          <Bloco>
            <Vazio
              icone={<Wallet size={28} aria-hidden="true" />}
              titulo="Comece pelo primeiro lançamento"
              texto="Anote uma entrada ou uma saída. Os gráficos, alertas e previsões aparecem conforme você usa."
              acao={
                <div className="flex gap-2">
                  <button type="button" className="b b-primario" onClick={() => novo('receita')}>
                    <ArrowDownLeft size={17} aria-hidden="true" /> Entrada
                  </button>
                  <button type="button" className="b b-suave" onClick={() => novo('despesa')}>
                    <ArrowUpRight size={17} aria-hidden="true" /> Saída
                  </button>
                </div>
              }
            />
          </Bloco>
        ) : (
          <>
            <div className="grid gap-[var(--vao)] min-[900px]:grid-cols-2">
              <Bloco titulo="Entradas e saídas">
                <BarrasMensais
                  series={['Entradas', 'Saídas']}
                  grupos={c.serie.map((s) => ({
                    rotulo: rotuloMesCurto(s.ref),
                    titulo: rotuloMes(s.ref),
                    a: s.entradas,
                    b: s.saidas,
                  }))}
                />
              </Bloco>
              <Bloco titulo="Evolução do saldo" acao={<span className="miudo">60 dias</span>}>
                <Linha pontos={c.evolucao} nome="Saldo em contas" altura={258} />
              </Bloco>
            </div>

            <Bloco
              titulo="Gastos por categoria"
              acao={
                <Link href="/relatorios" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
                  Relatório <ArrowRight size={15} aria-hidden="true" />
                </Link>
              }
            >
              {c.fatias.length === 0 ? (
                <p className="py-6 text-center text-t2">Nenhuma saída neste mês ainda.</p>
              ) : (
                <Rosca fatias={c.fatias} rotuloCentro="Saídas do mês" />
              )}
            </Bloco>

            <Bloco
              titulo="Últimos lançamentos"
              semPad
              acao={
                <Link href="/lancamentos" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
                  Ver todos <ArrowRight size={15} aria-hidden="true" />
                </Link>
              }
            >
              <div className="pb-2">
                {c.ultimos.map((l) => (
                  <LinhaDeLancamento
                    key={l.id}
                    l={l}
                    dados={dados}
                    hoje={hoje}
                    aoClicar={() => editar(l)}
                  />
                ))}
              </div>
            </Bloco>
          </>
        )}
      </div>

      {/* Coluna lateral: contas, alertas, vencimentos, metas */}
      <div className="grid min-w-0 content-start gap-[var(--vao)] min-[760px]:max-[1279px]:grid-cols-2">
        <Bloco
          titulo="Contas"
          semPad
          acao={
            <Link href="/contas" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
              Gerenciar
            </Link>
          }
        >
          <div className="pb-2">
            {contas.map((conta) => {
              const I = ICONE_DA_CONTA[conta.tipo]
              return (
                <Link key={conta.id} href="/contas" className="linha-lista">
                  <span
                    className="icone-cat"
                    style={{ ['--c' as string]: 'var(--azul)' }}
                    aria-hidden="true"
                  >
                    <I size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-[560]">{conta.nome}</span>
                    <span className="miudo block">{ROTULO_CONTA[conta.tipo]}</span>
                  </span>
                  <Valor centavos={c.saldos.get(conta.id) ?? 0} className="font-[600]" />
                </Link>
              )
            })}
          </div>
        </Bloco>

        {c.insights.length > 0 && (
          <Bloco titulo="Alertas e destaques">
            <ul className="-my-1 grid gap-1">
              {c.insights.map((i, n) => (
                <LinhaDeInsight key={i.id} insight={i} ordem={n} />
              ))}
            </ul>
          </Bloco>
        )}

        <Bloco
          titulo="Próximos vencimentos"
          acao={
            <Link href="/recorrentes" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
              Recorrentes
            </Link>
          }
        >
          {c.vencimentos.length === 0 ? (
            <p className="text-t2">
              Nada vence nos próximos 30 dias. Cadastre contas fixas em Recorrentes para vê-las
              aqui.
            </p>
          ) : (
            <ol className="fio">
              {c.vencimentos.map((v, i) => (
                <li
                  key={v.chave}
                  style={{
                    ['--c' as string]: v.atrasado
                      ? 'var(--erro)'
                      : v.entrada
                        ? 'var(--ok)'
                        : 'var(--azul)',
                    ['--i' as string]: i,
                  }}
                >
                  <span className="no" data-apagado={i > 0 && !v.atrasado} />
                  <span className="seg" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-[560]">{v.titulo}</p>
                      <p className={`miudo ${v.atrasado ? '!text-erro' : ''}`}>
                        {v.atrasado ? 'Atrasado · ' : ''}
                        {dataCurta(v.data, hoje)} · {distanciaEmDias(v.data, hoje)}
                      </p>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1">
                      <Valor
                        centavos={v.valor}
                        sinal={v.entrada ? 'mais' : 'menos'}
                        className={`font-[600] ${v.entrada ? 'text-gelo' : ''}`}
                      />
                      <button
                        type="button"
                        className="chip"
                        onClick={() => {
                          if (v.origem === 'fatura') {
                            const cartao = dados.cartoes.find((x) => x.id === v.id)
                            if (cartao && v.fatura_ref) pagarFatura(cartao, v.fatura_ref, v.valor)
                          } else {
                            const r = dados.recorrentes.find((x) => x.id === v.id)
                            if (r)
                              void aplicar(
                                operacoesDoRecorrente(r, hoje, contaPadrao),
                                v.entrada ? 'Recebimento registrado' : 'Pagamento registrado',
                              )
                          }
                        }}
                      >
                        {v.entrada ? 'Recebi' : 'Paguei'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Bloco>

        {c.metas.length > 0 && (
          <Bloco
            titulo="Metas"
            acao={
              <Link href="/metas" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
                Ver todas
              </Link>
            }
          >
            <div className="grid gap-4">
              {c.metas.map(({ meta, pct, acumulado, restante }) => (
                <Link key={meta.id} href="/metas" className="flex items-center gap-4">
                  <Anel pct={pct} tamanho={56} espessura={6} cor={meta.cor}>
                    <span className="num text-[.75rem] font-[650]">{formatarPct(pct)}</span>
                  </Anel>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-[560]">{meta.nome}</span>
                    <span className="miudo block truncate">
                      <Valor centavos={acumulado} /> de <Valor centavos={meta.valor_alvo} />
                    </span>
                  </span>
                  <span className="miudo flex-none text-right">
                    {restante === 0 ? (
                      'Concluída'
                    ) : (
                      <>
                        faltam
                        <br />
                        <Valor centavos={restante} className="font-[600] text-t1" />
                      </>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </Bloco>
        )}

        {c.orcamentos.length > 0 && (
          <Bloco
            titulo="Orçamentos do mês"
            acao={
              <Link href="/orcamentos" className="b b-fantasma -mr-2 h-9 text-[.875rem]">
                Ajustar
              </Link>
            }
          >
            <div className="grid gap-3.5">
              {c.orcamentos.map(({ o, usado, pct, nivel }) => {
                const cat = dados.categorias.find((x) => x.id === o.categoria_id)
                return (
                  <div key={o.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 font-[560]">
                        {cat && (
                          <IconeCategoria
                            icone={cat.icone}
                            cor={cat.cor}
                            tamanho={14}
                            className="!h-6 !w-6 !rounded-lg"
                          />
                        )}
                        <span className="truncate">{cat ? cat.nome : 'Orçamento geral'}</span>
                      </span>
                      <span className="miudo num flex-none">
                        <Valor centavos={usado} /> / <Valor centavos={o.valor} />
                      </span>
                    </div>
                    <Barra
                      pct={pct}
                      cor={
                        nivel === 'ok'
                          ? 'var(--azul)'
                          : nivel === 'atencao'
                            ? 'var(--aviso)'
                            : 'var(--erro)'
                      }
                    />
                  </div>
                )
              })}
            </div>
          </Bloco>
        )}
      </div>
    </Surgir>
  )
}

function LinhaDeInsight({ insight, ordem }: { insight: Insight; ordem: number }) {
  const I = ICONE_INSIGHT[insight.nivel]
  return (
    <motion.li
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.35 + ordem * 0.08 }}
    >
      <Link
        href={insight.href}
        className="-mx-2 flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[color:var(--realce)]"
      >
        <span
          className="mt-0.5 flex-none"
          style={{ color: COR_INSIGHT[insight.nivel] }}
          aria-hidden="true"
        >
          <I size={18} />
        </span>
        <span className="min-w-0">
          <span className="block font-[560] leading-[1.3]">{insight.titulo}</span>
          <span className="miudo block">{insight.detalhe}</span>
        </span>
      </Link>
    </motion.li>
  )
}
