'use client'

import { ArrowDown, ArrowUp, ChartCandlestick, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import Abas from '@/components/app/Abas'
import { Vazio } from '@/components/app/Campos'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { semAcento } from '@/features/noticias/temas'
import {
  GIRO_MINIMO,
  ROTULO_RANKING,
  altasEBaixas,
  formatarGrande,
  formatarPreco,
  linkDoAtivo,
  ranking,
  type Acao,
  type Mercado as Dados,
  type Ranking,
} from '../acoes'
import { nomeDoSetor } from '../setores'
import AcompanheOMercado from './AcompanheOMercado'
import { Logo, Variacao, horario } from './partes'

const PAGINA = 25

type Campo = 'codigo' | 'preco' | 'variacao' | 'giro' | 'valor_mercado'
const COLUNAS: { campo: Campo; rotulo: string; direita?: boolean }[] = [
  { campo: 'codigo', rotulo: 'Ativo' },
  { campo: 'preco', rotulo: 'Preço', direita: true },
  { campo: 'variacao', rotulo: 'Variação', direita: true },
  { campo: 'giro', rotulo: 'Volume financeiro', direita: true },
  { campo: 'valor_mercado', rotulo: 'Valor de mercado', direita: true },
]

export default function Mercado({ mercado }: { mercado: Dados }) {
  if (mercado.situacao !== 'ok') {
    return (
      <div className="grid gap-[var(--vao)]">
        <div className="cartao">
          <Vazio
            icone={<ChartCandlestick size={28} aria-hidden="true" />}
            titulo="Cotações indisponíveis no momento"
            texto="A fonte de dados não respondeu. Uma nova tentativa é feita em alguns minutos."
          />
        </div>
        <AcompanheOMercado />
      </div>
    )
  }

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <motion.div variants={itemSurgir}>
        <RelevanteHoje acoes={mercado.acoes} consultado={mercado.consultado_em} />
      </motion.div>
      <motion.div variants={itemSurgir}>
        <Rankings acoes={mercado.acoes} />
      </motion.div>
      <motion.div variants={itemSurgir}>
        <TodasAsAcoes acoes={mercado.acoes} />
      </motion.div>
      <motion.div variants={itemSurgir}>
        <AcompanheOMercado />
      </motion.div>
      <p className="miudo">
        Cotações da {mercado.fonte}, com atraso (cerca de 30 minutos no plano gratuito), sem mercado
        fracionário. Não são em tempo real. Nada aqui é recomendação de investimento, e desempenho
        passado não garante resultados futuros. Cada ativo abre o gráfico no TradingView.
      </p>
    </Surgir>
  )
}

function RelevanteHoje({ acoes, consultado }: { acoes: Acao[]; consultado: string }) {
  const { altas, baixas } = useMemo(() => altasEBaixas(acoes, 5), [acoes])
  return (
    <section className="cartao" aria-labelledby="relevante-hoje">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-[var(--pad)] pt-[var(--pad)]">
        <h2 id="relevante-hoje" className="titulo-secao">
          O que está relevante hoje?
        </h2>
        <p className="miudo">
          Último pregão · consultado em{' '}
          <time dateTime={consultado}>{horario.format(new Date(consultado))}</time>
        </p>
      </div>
      <div className="grid gap-x-[var(--vao)] pb-2 pt-3 min-[900px]:grid-cols-2">
        <Lista titulo="Ações em alta" acoes={altas} />
        <Lista titulo="Ações em baixa" acoes={baixas} />
      </div>
      <p className="miudo px-[var(--pad)] pb-[var(--pad)]">
        Entre ações com volume financeiro acima de {formatarGrande(GIRO_MINIMO)} no dia.
      </p>
    </section>
  )
}

function Lista({ titulo, acoes }: { titulo: string; acoes: Acao[] }) {
  return (
    <div className="min-w-0">
      <h3 className="legenda px-[var(--pad)] pb-1 pt-2">{titulo}</h3>
      {acoes.length === 0 ? (
        <p className="miudo px-[var(--pad)] py-3">Nenhuma no último pregão.</p>
      ) : (
        <ol>
          {acoes.map((a, i) => (
            <LinhaDoAtivo key={a.codigo} a={a} posicao={i + 1} />
          ))}
        </ol>
      )}
    </div>
  )
}

function LinhaDoAtivo({
  a,
  posicao,
  valor,
}: {
  a: Acao
  posicao: number
  /** Texto à direita no lugar da variação (ex.: valor de mercado). */
  valor?: string
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5, delay: posicao * 0.04 }}
    >
      <a
        href={linkDoAtivo(a.codigo)}
        target="_blank"
        rel="noopener noreferrer"
        className="linha-lista ativo-linha"
      >
        <span className="ativo-posicao" aria-hidden="true">
          {posicao}
        </span>
        <Logo codigo={a.codigo} />
        <span className="min-w-0 flex-1">
          <span className="block font-[650] tracking-[.01em]">{a.codigo}</span>
          <span className="miudo block truncate">{a.nome}</span>
        </span>
        <span className="text-right">
          {valor ? (
            <span className="block font-[600] tabular-nums">{valor}</span>
          ) : (
            <>
              <span className="block font-[600] tabular-nums">{formatarPreco(a.preco)}</span>
              <Variacao valor={a.variacao} />
            </>
          )}
        </span>
        <span className="sr-only">(abre o gráfico em uma nova aba)</span>
      </a>
    </motion.li>
  )
}

function Rankings({ acoes }: { acoes: Acao[] }) {
  const [tipo, setTipo] = useState<Ranking>('valor')
  const lista = useMemo(() => ranking(acoes, tipo, 10), [acoes, tipo])
  const metade = Math.ceil(lista.length / 2)
  const valor = (a: Acao) =>
    tipo === 'negociadas' ? formatarGrande(a.giro) : formatarGrande(a.valor_mercado ?? 0)

  return (
    <section className="cartao" aria-labelledby="ranking-acoes">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[var(--pad)] pt-[var(--pad)]">
        <h2 id="ranking-acoes" className="titulo-secao">
          Ranking de ações
        </h2>
        <Abas
          rotulo="Tipo de ranking"
          valor={tipo}
          aoMudar={setTipo}
          opcoes={(Object.keys(ROTULO_RANKING) as Ranking[]).map((r) => ({
            valor: r,
            rotulo: (
              <>
                <span className="max-[560px]:!hidden">{ROTULO_RANKING[r].titulo}</span>
                <span className="min-[561px]:!hidden">{ROTULO_RANKING[r].curto}</span>
              </>
            ),
          }))}
        />
      </div>
      <p className="miudo px-[var(--pad)] pt-2">{ROTULO_RANKING[tipo].criterio}</p>
      <div key={tipo} className="grid gap-x-[var(--vao)] py-2 min-[900px]:grid-cols-2">
        {[lista.slice(0, metade), lista.slice(metade)].map((parte, coluna) => (
          <ol key={coluna} start={coluna * metade + 1} className="min-w-0">
            {parte.map((a, i) => (
              <LinhaDoAtivo
                key={a.codigo}
                a={a}
                posicao={coluna * metade + i + 1}
                valor={valor(a)}
              />
            ))}
          </ol>
        ))}
      </div>
    </section>
  )
}

function TodasAsAcoes({ acoes }: { acoes: Acao[] }) {
  const [busca, setBusca] = useState('')
  const [setor, setSetor] = useState('')
  const [ordem, setOrdem] = useState<{ campo: Campo; sentido: 1 | -1 }>({
    campo: 'valor_mercado',
    sentido: -1,
  })
  const [limite, setLimite] = useState(PAGINA)

  const setores = useMemo(
    () =>
      Array.from(new Set(acoes.map((a) => a.setor).filter((s): s is string => !!s))).sort((a, b) =>
        nomeDoSetor(a).localeCompare(nomeDoSetor(b), 'pt-BR'),
      ),
    [acoes],
  )

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    const lista = acoes.filter(
      (a) =>
        (!setor || a.setor === setor) &&
        (!termo || semAcento(`${a.codigo} ${a.nome}`).includes(termo)),
    )
    const { campo, sentido } = ordem
    return lista.sort((a, b) => {
      if (campo === 'codigo') return a.codigo.localeCompare(b.codigo) * sentido
      return ((a[campo] ?? -Infinity) - (b[campo] ?? -Infinity)) * sentido
    })
  }, [acoes, busca, setor, ordem])

  useEffect(() => setLimite(PAGINA), [busca, setor, ordem])

  const ordenar = (campo: Campo) =>
    setOrdem((o) =>
      o.campo === campo
        ? { campo, sentido: o.sentido === 1 ? -1 : 1 }
        : { campo, sentido: campo === 'codigo' ? 1 : -1 },
    )
  const Seta = ordem.sentido === 1 ? ArrowUp : ArrowDown

  return (
    <section className="cartao" aria-labelledby="todas-acoes">
      <div className="flex flex-wrap items-center gap-2.5 px-[var(--pad)] pt-[var(--pad)]">
        <h2 id="todas-acoes" className="titulo-secao mr-auto">
          Todas as ações <span className="miudo font-[500]">{filtradas.length}</span>
        </h2>
        <label className="controle flex min-w-[200px] flex-1 items-center gap-2.5 !py-0 min-[900px]:max-w-[300px]">
          <Search size={18} className="flex-none text-t3" aria-hidden="true" />
          <input
            type="search"
            className="h-full min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Buscar código ou empresa"
            aria-label="Buscar código ou empresa"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <select
          className="controle !w-auto min-w-[170px]"
          aria-label="Setor"
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
        >
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s} value={s}>
              {nomeDoSetor(s)}
            </option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <Vazio
          icone={<Search size={26} aria-hidden="true" />}
          titulo="Nenhuma ação encontrada"
          texto="Tente outro código, outro nome ou outro setor."
        />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="tabela tabela-fixa">
            <caption className="sr-only">
              Ações da B3 com preço, variação no dia, volume financeiro e valor de mercado
            </caption>
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th
                    key={c.campo}
                    scope="col"
                    className={c.direita ? 'text-right' : undefined}
                    aria-sort={
                      ordem.campo === c.campo
                        ? ordem.sentido === 1
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className={`th-ordem ${c.direita ? 'ml-auto' : ''}`}
                      onClick={() => ordenar(c.campo)}
                    >
                      {c.rotulo}
                      {ordem.campo === c.campo && <Seta size={13} aria-hidden="true" />}
                    </button>
                  </th>
                ))}
                <th scope="col">Setor</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.slice(0, limite).map((a) => (
                <tr key={a.codigo}>
                  <td>
                    <a
                      href={linkDoAtivo(a.codigo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5"
                    >
                      <Logo codigo={a.codigo} tamanho={28} />
                      <span className="min-w-0">
                        <span className="block font-[650]">{a.codigo}</span>
                        <span className="miudo block max-w-[220px] truncate">{a.nome}</span>
                      </span>
                      <span className="sr-only">(abre o gráfico em uma nova aba)</span>
                    </a>
                  </td>
                  <td className="text-right tabular-nums">{formatarPreco(a.preco)}</td>
                  <td className="text-right">
                    <Variacao valor={a.variacao} />
                  </td>
                  <td className="text-right tabular-nums">{formatarGrande(a.giro)}</td>
                  <td className="text-right tabular-nums">
                    {a.valor_mercado ? formatarGrande(a.valor_mercado) : '—'}
                  </td>
                  <td className="text-t2">{nomeDoSetor(a.setor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtradas.length > limite ? (
        <div className="grid place-items-center p-[var(--pad)]">
          <button type="button" className="b b-suave" onClick={() => setLimite((n) => n + PAGINA)}>
            Mostrar mais {Math.min(PAGINA, filtradas.length - limite)}
          </button>
        </div>
      ) : (
        <div className="h-2" />
      )}
    </section>
  )
}
