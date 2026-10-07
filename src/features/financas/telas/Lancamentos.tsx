'use client'

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Copy,
  Download,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import Abas from '@/components/app/Abas'
import { Campo, CampoValor, Vazio } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import { useCelular } from '@/components/app/ganchos'
import Menu from '@/components/app/Menu'
import Valor from '@/components/app/Valor'
import { Surgir } from '@/components/motion/Surgir'
import { MOLA, MOLA_RAPIDA } from '@/components/motion/molas'
import { baixar, paraCSV } from '@/lib/csv'
import {
  dataBR,
  dataCurta,
  diaDaSemanaSeg,
  diasNoMes,
  fimDoMes,
  inicioDoMes,
  mesDe,
  rotuloLongo,
  somarDias,
  somarMesRef,
} from '@/lib/datas'
import { formatarCentavos, formatarCurto } from '@/lib/dinheiro'
import { faturasDoCartao, ocorrencias } from '../calculos'
import { useEditor } from '../components/Editor'
import {
  categoriasOrdenadas,
  nomeDaCategoria,
  origemDoLancamento,
  tituloDoLancamento,
} from '../fabrica'
import { ROTULO_FORMA } from '../padroes'
import { useDados } from '../store'
import type { Lancamento } from '../tipos'
import {
  Bloco,
  IconeDoLancamento,
  LinhaDeLancamento,
  SeletorDeMes,
  ValorDoLancamento,
} from './partes'

type Periodo = 'mes' | 'anterior' | '90d' | 'ano' | 'tudo' | 'livre'
type Tipo = 'todos' | 'receita' | 'despesa' | 'transferencia'
type Ordem = { campo: 'data' | 'valor'; sentido: 1 | -1 }

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'anterior', rotulo: 'Mês passado' },
  { valor: '90d', rotulo: '90 dias' },
  { valor: 'ano', rotulo: 'Este ano' },
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'livre', rotulo: 'Personalizado' },
]

const ROTULO_TIPO = {
  receita: 'Entrada',
  despesa: 'Saída',
  transferencia: 'Transferência',
  pagamento_fatura: 'Fatura',
} as const
const SELO_TIPO = {
  receita: 'selo-azul',
  despesa: '',
  transferencia: '',
  pagamento_fatura: '',
} as const

const PAGINA = 80

export default function Lancamentos() {
  const { dados, hoje, aplicar } = useDados()
  const { novo, editar, duplicar } = useEditor()
  const confirmar = useConfirmar()
  const celular = useCelular()
  const ref = mesDe(hoje)

  const [visao, setVisao] = useState<'tabela' | 'calendario'>('tabela')
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [de, setDe] = useState(inicioDoMes(ref))
  const [ate, setAte] = useState(hoje)
  const [tipo, setTipo] = useState<Tipo>('todos')
  const [categoria, setCategoria] = useState('')
  const [origem, setOrigem] = useState('')
  const [minimo, setMinimo] = useState(0)
  const [maximo, setMaximo] = useState(0)
  const [ordem, setOrdem] = useState<Ordem>({ campo: 'data', sentido: -1 })
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [limite, setLimite] = useState(PAGINA)

  // Chegou pelo atalho "/" vindo de outra tela: foca a busca.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('buscar'))
      document.getElementById('busca-lancamentos')?.focus()
  }, [])

  const [inicio, fim] = useMemo<[string, string]>(() => {
    switch (periodo) {
      case 'mes':
        return [inicioDoMes(ref), fimDoMes(ref)]
      case 'anterior':
        return [inicioDoMes(somarMesRef(ref, -1)), fimDoMes(somarMesRef(ref, -1))]
      case '90d':
        return [somarDias(hoje, -89), hoje]
      case 'ano':
        return [`${hoje.slice(0, 4)}-01-01`, `${hoje.slice(0, 4)}-12-31`]
      case 'tudo':
        return ['0000-01-01', '9999-12-31']
      case 'livre':
        return [de || '0000-01-01', ate || '9999-12-31']
    }
  }, [periodo, ref, hoje, de, ate])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const cats = categoria
      ? new Set([
          categoria,
          ...dados.categorias.filter((c) => c.pai_id === categoria).map((c) => c.id),
        ])
      : null
    const [tipoOrigem, idOrigem] = origem.split(':')
    const lista = dados.lancamentos.filter((l) => {
      if (l.data < inicio || l.data > fim) return false
      if (tipo === 'transferencia') {
        if (l.tipo !== 'transferencia' && l.tipo !== 'pagamento_fatura') return false
      } else if (tipo !== 'todos' && l.tipo !== tipo) return false
      if (cats && (!l.categoria_id || !cats.has(l.categoria_id))) return false
      if (origem) {
        if (
          tipoOrigem === 'cartao'
            ? l.cartao_id !== idOrigem
            : l.conta_id !== idOrigem && l.conta_destino_id !== idOrigem
        )
          return false
      }
      if (minimo > 0 && l.valor < minimo) return false
      if (maximo > 0 && l.valor > maximo) return false
      if (termo) {
        const alvo =
          `${tituloDoLancamento(l, dados)} ${l.observacao} ${nomeDaCategoria(l.categoria_id, dados.categorias)} ${origemDoLancamento(l, dados)}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
    return lista.sort((a, b) => {
      const primario =
        ordem.campo === 'valor' ? a.valor - b.valor : a.data < b.data ? -1 : a.data > b.data ? 1 : 0
      if (primario !== 0) return primario * ordem.sentido
      return a.created_at < b.created_at ? 1 : -1
    })
  }, [dados, busca, inicio, fim, tipo, categoria, origem, minimo, maximo, ordem])

  const totais = useMemo(() => {
    let entradas = 0
    let saidas = 0
    for (const l of filtrados) {
      if (l.tipo === 'receita') entradas += l.valor
      else if (l.tipo === 'despesa') saidas += l.valor
    }
    return { entradas, saidas }
  }, [filtrados])

  useEffect(() => setLimite(PAGINA), [busca, inicio, fim, tipo, categoria, origem, minimo, maximo])

  const filtrosAtivos =
    Number(tipo !== 'todos') +
    Number(!!categoria) +
    Number(!!origem) +
    Number(minimo > 0) +
    Number(maximo > 0)

  const limpar = () => {
    setTipo('todos')
    setCategoria('')
    setOrigem('')
    setMinimo(0)
    setMaximo(0)
    setBusca('')
  }

  const excluir = async (l: Lancamento) => {
    const ok = await confirmar({
      titulo: 'Excluir este lançamento?',
      texto: `${tituloDoLancamento(l, dados)}, ${dataBR(l.data)}. Esta ação não pode ser desfeita.`,
      acao: 'Excluir',
      perigo: true,
    })
    if (ok)
      void aplicar([{ op: 'excluir', tabela: 'lancamentos', ids: [l.id] }], 'Lançamento excluído')
  }

  const exportar = () => {
    const linhas: (string | number)[][] = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Forma', 'Valor', 'Observação'],
      ...filtrados.map((l) => [
        dataBR(l.data),
        ROTULO_TIPO[l.tipo],
        tituloDoLancamento(l, dados),
        l.tipo === 'receita' || l.tipo === 'despesa'
          ? nomeDaCategoria(l.categoria_id, dados.categorias)
          : '',
        origemDoLancamento(l, dados),
        l.forma_pagamento ? ROTULO_FORMA[l.forma_pagamento] : '',
        `${l.tipo === 'despesa' ? '-' : ''}${formatarCentavos(l.valor)}`,
        l.observacao,
      ]),
    ]
    baixar(`gbfinancas-lancamentos-${hoje}.csv`, paraCSV(linhas), 'text/csv;charset=utf-8')
  }

  const alternarOrdem = (campo: Ordem['campo']) =>
    setOrdem((o) =>
      o.campo === campo ? { campo, sentido: o.sentido === 1 ? -1 : 1 } : { campo, sentido: -1 },
    )

  const Seta = ordem.sentido === 1 ? ArrowUp : ArrowDown
  const visiveis = filtrados.slice(0, limite)

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <Bloco>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="controle flex min-w-[220px] flex-1 items-center gap-2.5 !py-0">
            <Search size={18} className="flex-none text-t3" aria-hidden="true" />
            <input
              id="busca-lancamentos"
              type="search"
              className="h-full min-w-0 flex-1 bg-transparent outline-none"
              placeholder="Buscar por descrição, categoria ou conta"
              aria-label="Buscar lançamentos"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <kbd className="tecla max-[760px]:!hidden">/</kbd>
          </label>
          <button
            type="button"
            className="b b-suave"
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((v) => !v)}
          >
            <ListFilter size={17} aria-hidden="true" /> Filtros
            {filtrosAtivos > 0 && <span className="contador">{filtrosAtivos}</span>}
          </button>
          <Abas
            rotulo="Modo de exibição"
            valor={visao}
            aoMudar={setVisao}
            opcoes={[
              {
                valor: 'tabela',
                rotulo: (
                  <>
                    <Table2 size={16} aria-hidden="true" /> Lista
                  </>
                ),
              },
              {
                valor: 'calendario',
                rotulo: (
                  <>
                    <CalendarDays size={16} aria-hidden="true" /> Calendário
                  </>
                ),
              },
            ]}
          />
          <button
            type="button"
            className="b b-suave b-icone"
            onClick={exportar}
            aria-label="Exportar CSV"
            title="Exportar CSV"
          >
            <Download size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="b b-primario max-[760px]:!hidden"
            onClick={() => novo('despesa')}
          >
            <Plus size={17} aria-hidden="true" /> Novo
          </button>
        </div>

        {visao === 'tabela' && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {PERIODOS.map((p, i) => (
              <motion.button
                key={p.valor}
                type="button"
                className="chip"
                aria-pressed={periodo === p.valor}
                onClick={() => setPeriodo(p.valor)}
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...MOLA, delay: 0.15 + i * 0.05 }}
              >
                {p.rotulo}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {(filtrosAbertos || (visao === 'tabela' && periodo === 'livre')) && (
            <motion.div
              key="filtros"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={MOLA}
              style={{ overflow: 'hidden' }}
            >
              <div className="grid grid-cols-2 gap-3 pt-4 min-[900px]:grid-cols-4 min-[1280px]:grid-cols-7">
                {visao === 'tabela' && periodo === 'livre' && (
                  <>
                    <Campo rotulo="De">
                      {(id) => (
                        <input
                          id={id}
                          type="date"
                          className="controle"
                          value={de}
                          max={ate || undefined}
                          onChange={(e) => setDe(e.target.value)}
                        />
                      )}
                    </Campo>
                    <Campo rotulo="Até">
                      {(id) => (
                        <input
                          id={id}
                          type="date"
                          className="controle"
                          value={ate}
                          min={de || undefined}
                          onChange={(e) => setAte(e.target.value)}
                        />
                      )}
                    </Campo>
                  </>
                )}
                {filtrosAbertos && (
                  <>
                    <Campo rotulo="Tipo">
                      {(id) => (
                        <select
                          id={id}
                          className="controle"
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value as Tipo)}
                        >
                          <option value="todos">Todos</option>
                          <option value="receita">Entradas</option>
                          <option value="despesa">Saídas</option>
                          <option value="transferencia">Transferências</option>
                        </select>
                      )}
                    </Campo>
                    <Campo rotulo="Categoria">
                      {(id) => (
                        <select
                          id={id}
                          className="controle"
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                        >
                          <option value="">Todas</option>
                          {categoriasOrdenadas(dados.categorias).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.rotulo}
                            </option>
                          ))}
                        </select>
                      )}
                    </Campo>
                    <Campo rotulo="Conta ou cartão">
                      {(id) => (
                        <select
                          id={id}
                          className="controle"
                          value={origem}
                          onChange={(e) => setOrigem(e.target.value)}
                        >
                          <option value="">Todas</option>
                          <optgroup label="Contas">
                            {dados.contas.map((c) => (
                              <option key={c.id} value={`conta:${c.id}`}>
                                {c.nome}
                              </option>
                            ))}
                          </optgroup>
                          {dados.cartoes.length > 0 && (
                            <optgroup label="Cartões">
                              {dados.cartoes.map((c) => (
                                <option key={c.id} value={`cartao:${c.id}`}>
                                  {c.nome}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      )}
                    </Campo>
                    <Campo rotulo="Valor mínimo">
                      {(id) => <CampoValor id={id} valor={minimo} aoMudar={setMinimo} />}
                    </Campo>
                    <Campo rotulo="Valor máximo">
                      {(id) => <CampoValor id={id} valor={maximo} aoMudar={setMaximo} />}
                    </Campo>
                  </>
                )}
              </div>
              {filtrosAbertos && filtrosAtivos > 0 && (
                <button
                  type="button"
                  className="b b-fantasma mt-2 -ml-2 h-9 text-[.875rem]"
                  onClick={limpar}
                >
                  <X size={15} aria-hidden="true" /> Limpar filtros
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Bloco>

      {visao === 'calendario' ? (
        <Calendario filtrados={filtrados} usarFiltro={filtrosAtivos > 0 || busca.trim() !== ''} />
      ) : (
        <Bloco semPad>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-[var(--pad)] pb-3 pt-[calc(var(--pad)-8px)]">
            <p className="legenda">
              {filtrados.length} {filtrados.length === 1 ? 'lançamento' : 'lançamentos'}
            </p>
            <p className="legenda ml-auto">
              Entradas <Valor centavos={totais.entradas} className="ml-1 font-[650] text-gelo" />
            </p>
            <p className="legenda">
              Saídas <Valor centavos={totais.saidas} className="ml-1 font-[650] text-t1" />
            </p>
            <p className="legenda">
              Saldo{' '}
              <Valor
                centavos={totais.entradas - totais.saidas}
                className="ml-1 font-[650] text-t1"
              />
            </p>
          </div>

          {filtrados.length === 0 ? (
            <Vazio
              icone={<Search size={26} aria-hidden="true" />}
              titulo="Nada por aqui"
              texto={
                dados.lancamentos.length === 0
                  ? 'Você ainda não tem lançamentos. Comece anotando uma entrada ou uma saída.'
                  : 'Nenhum lançamento combina com os filtros. Tente outro período ou limpe a busca.'
              }
              acao={
                <button type="button" className="b b-primario" onClick={() => novo('despesa')}>
                  <Plus size={17} aria-hidden="true" /> Novo lançamento
                </button>
              }
            />
          ) : celular ? (
            <div className="pb-2">
              {visiveis.map((l) => (
                <LinhaDeLancamento
                  key={l.id}
                  l={l}
                  dados={dados}
                  hoje={hoje}
                  aoClicar={() => editar(l)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      aria-sort={
                        ordem.campo === 'data'
                          ? ordem.sentido === 1
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="th-ordem"
                        onClick={() => alternarOrdem('data')}
                      >
                        Data {ordem.campo === 'data' && <Seta size={13} aria-hidden="true" />}
                      </button>
                    </th>
                    <th scope="col">Descrição</th>
                    <th scope="col">Categoria</th>
                    <th scope="col">Conta</th>
                    <th scope="col">Tipo</th>
                    <th
                      scope="col"
                      className="text-right"
                      aria-sort={
                        ordem.campo === 'valor'
                          ? ordem.sentido === 1
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="th-ordem ml-auto"
                        onClick={() => alternarOrdem('valor')}
                      >
                        Valor {ordem.campo === 'valor' && <Seta size={13} aria-hidden="true" />}
                      </button>
                    </th>
                    <th scope="col" className="w-12">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l, i) => (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...MOLA_RAPIDA, delay: Math.min(i, 16) * 0.018 }}
                      onClick={() => editar(l)}
                    >
                      <td className="num whitespace-nowrap text-t2">{dataCurta(l.data, hoje)}</td>
                      <td>
                        <span className="flex items-center gap-3">
                          <IconeDoLancamento l={l} dados={dados} />
                          <span className="min-w-0">
                            <span className="block max-w-[34ch] truncate font-[560]">
                              {tituloDoLancamento(l, dados)}
                            </span>
                            {l.observacao && (
                              <span className="miudo block max-w-[34ch] truncate">
                                {l.observacao}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="text-t2">
                        {l.tipo === 'receita' || l.tipo === 'despesa'
                          ? nomeDaCategoria(l.categoria_id, dados.categorias)
                          : '—'}
                      </td>
                      <td className="text-t2">{origemDoLancamento(l, dados)}</td>
                      <td>
                        <span className={`selo ${SELO_TIPO[l.tipo]}`}>{ROTULO_TIPO[l.tipo]}</span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <ValorDoLancamento l={l} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Menu
                          rotulo={`Ações de ${tituloDoLancamento(l, dados)}`}
                          itens={[
                            { rotulo: 'Editar', icone: Pencil, aoClicar: () => editar(l) },
                            ...(l.tipo === 'pagamento_fatura'
                              ? []
                              : [{ rotulo: 'Duplicar', icone: Copy, aoClicar: () => duplicar(l) }]),
                            {
                              rotulo: 'Excluir',
                              icone: Trash2,
                              aoClicar: () => void excluir(l),
                              perigo: true,
                            },
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtrados.length > limite && (
            <div className="grid place-items-center p-4">
              <button
                type="button"
                className="b b-suave"
                onClick={() => setLimite((n) => n + PAGINA)}
              >
                Mostrar mais {Math.min(PAGINA, filtrados.length - limite)}
              </button>
            </div>
          )}
        </Bloco>
      )}
    </Surgir>
  )
}

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

/** Calendário financeiro: entradas, saídas e vencimentos de cada dia do mês. */
function Calendario({ filtrados, usarFiltro }: { filtrados: Lancamento[]; usarFiltro: boolean }) {
  const { dados, hoje } = useDados()
  const { novo, editar } = useEditor()
  const [mes, setMes] = useState(mesDe(hoje))
  const [dia, setDia] = useState(hoje)

  const { porDia, vencimentos } = useMemo(() => {
    const base = usarFiltro ? filtrados : dados.lancamentos
    const porDia = new Map<string, { entradas: number; saidas: number; itens: Lancamento[] }>()
    for (const l of base) {
      if (mesDe(l.data) !== mes) continue
      const d = porDia.get(l.data) ?? { entradas: 0, saidas: 0, itens: [] }
      if (l.tipo === 'receita') d.entradas += l.valor
      else if (l.tipo === 'despesa') d.saidas += l.valor
      d.itens.push(l)
      porDia.set(l.data, d)
    }
    const vencimentos = new Map<string, string[]>()
    const marcar = (data: string, titulo: string) => {
      if (mesDe(data) === mes) vencimentos.set(data, [...(vencimentos.get(data) ?? []), titulo])
    }
    for (const r of dados.recorrentes)
      for (const d of ocorrencias(r, fimDoMes(mes))) marcar(d, r.descricao)
    for (const c of dados.cartoes)
      for (const f of faturasDoCartao(c, dados.lancamentos, hoje))
        if (f.restante > 0) marcar(f.vencimento, `Fatura ${c.nome}`)
    return { porDia, vencimentos }
  }, [dados, filtrados, usarFiltro, mes, hoje])

  const primeiro = inicioDoMes(mes)
  const vazios = diaDaSemanaSeg(primeiro)
  const dias = Array.from({ length: diasNoMes(mes) }, (_, i) => somarDias(primeiro, i))
  const doDia = porDia.get(dia)
  const vencemNoDia = vencimentos.get(dia) ?? []

  return (
    <div className="grid gap-[var(--vao)] min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
      <Bloco
        titulo={
          <SeletorDeMes
            valor={mes}
            aoMudar={(m) => {
              setMes(m)
              setDia(m === mesDe(hoje) ? hoje : inicioDoMes(m))
            }}
            hoje={hoje}
          />
        }
      >
        <div className="cal mb-1.5">
          {SEMANA.map((s) => (
            <span key={s} className="miudo pb-1 text-center">
              {s}
            </span>
          ))}
        </div>
        <motion.div
          key={mes}
          className="cal"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOLA}
        >
          {Array.from({ length: vazios }, (_, i) => (
            <span key={`v${i}`} />
          ))}
          {dias.map((d, i) => {
            const info = porDia.get(d)
            const venc = vencimentos.get(d)
            return (
              <motion.button
                key={d}
                type="button"
                className="cal-dia"
                data-hoje={d === hoje}
                aria-pressed={d === dia}
                aria-label={`${rotuloLongo(d)}${info ? `, ${info.itens.length} lançamentos` : ''}${venc ? `, ${venc.length} vencimentos` : ''}`}
                onClick={() => setDia(d)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...MOLA_RAPIDA, delay: i * 0.008 }}
              >
                {d === dia && (
                  <motion.i layoutId="cal-foco" className="cal-foco" transition={MOLA} />
                )}
                <span className="relative flex items-center justify-between">
                  <span className="num text-[.875rem] font-[620]">{Number(d.slice(8))}</span>
                  {venc && <i className="h-1.5 w-1.5 rounded-full bg-[color:var(--aviso)]" />}
                </span>
                {info && (
                  <span className="cal-valor relative mt-1.5 block text-[.6875rem] leading-[1.35]">
                    {info.entradas > 0 && (
                      <span className="sigilo block truncate text-gelo">
                        + {formatarCurto(info.entradas).replace('R$ ', '')}
                      </span>
                    )}
                    {info.saidas > 0 && (
                      <span className="sigilo block truncate text-t2">
                        − {formatarCurto(info.saidas).replace('R$ ', '')}
                      </span>
                    )}
                  </span>
                )}
                {info && (
                  <i className="absolute bottom-2 right-2 hidden h-1.5 w-1.5 rounded-full bg-azul max-[760px]:block" />
                )}
              </motion.button>
            )
          })}
        </motion.div>
        <p className="miudo mt-3 flex items-center gap-2">
          <i className="h-1.5 w-1.5 rounded-full bg-[color:var(--aviso)]" /> dia com vencimento
        </p>
      </Bloco>

      <Bloco
        titulo={<span className="inline-block first-letter:uppercase">{rotuloLongo(dia)}</span>}
        semPad
        acao={
          <button
            type="button"
            className="b b-suave b-icone"
            aria-label="Lançar neste dia"
            title="Lançar neste dia"
            onClick={() => novo('despesa', { data: dia })}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        }
      >
        <motion.div
          key={dia}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={MOLA}
          className="pb-2"
        >
          {vencemNoDia.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-[var(--pad)] pb-2">
              {vencemNoDia.map((v, i) => (
                <span key={`${v}-${i}`} className="selo selo-aviso">
                  Vence: {v}
                </span>
              ))}
            </div>
          )}
          {doDia ? (
            doDia.itens.map((l) => (
              <LinhaDeLancamento
                key={l.id}
                l={l}
                dados={dados}
                hoje={hoje}
                aoClicar={() => editar(l)}
              />
            ))
          ) : (
            <p className="px-[var(--pad)] pb-4 pt-1 text-t2">Nenhum lançamento neste dia.</p>
          )}
        </motion.div>
      </Bloco>
    </div>
  )
}
