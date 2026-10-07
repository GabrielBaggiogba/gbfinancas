'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { IconeCategoria } from '@/components/app/Icones'
import Valor from '@/components/app/Valor'
import { Holofote } from '@/components/motion/Efeitos'
import { itemSurgir } from '@/components/motion/Surgir'
import { MOLA_RAPIDA } from '@/components/motion/molas'
import { dataCurta, mesDe, rotuloMes, somarMesRef } from '@/lib/datas'
import { nomeDaCategoria, origemDoLancamento, tituloDoLancamento } from '../fabrica'
import { COR_NEUTRA } from '../padroes'
import type { Dados, Lancamento } from '../tipos'

/** Cartão padrão das telas: entra em cascata e tem o holofote que segue o ponteiro. */
export function Bloco({
  titulo,
  acao,
  children,
  className = '',
  semPad = false,
}: {
  titulo?: ReactNode
  acao?: ReactNode
  children: ReactNode
  className?: string
  semPad?: boolean
}) {
  return (
    <Holofote className={`cartao ${className}`} variants={itemSurgir}>
      {titulo && (
        <div className="flex min-h-[40px] items-center justify-between gap-3 px-[var(--pad)] pt-[var(--pad)]">
          <h2 className="titulo-secao">{titulo}</h2>
          {acao}
        </div>
      )}
      <div className={semPad ? 'pt-2' : 'cartao-pad'}>{children}</div>
    </Holofote>
  )
}

export function IconeDoLancamento({ l, dados }: { l: Lancamento; dados: Dados }) {
  if (l.tipo === 'transferencia')
    return (
      <span className="icone-cat" style={{ ['--c' as string]: 'var(--azul)' }} aria-hidden="true">
        <ArrowLeftRight size={18} />
      </span>
    )
  if (l.tipo === 'pagamento_fatura')
    return (
      <span className="icone-cat" style={{ ['--c' as string]: 'var(--azul)' }} aria-hidden="true">
        <CreditCard size={18} />
      </span>
    )
  const c = dados.categorias.find((x) => x.id === l.categoria_id)
  if (c) return <IconeCategoria icone={c.icone} cor={c.cor} />
  return (
    <span className="icone-cat" style={{ ['--c' as string]: COR_NEUTRA }} aria-hidden="true">
      {l.tipo === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
    </span>
  )
}

export function ValorDoLancamento({ l, className = '' }: { l: Lancamento; className?: string }) {
  if (l.tipo === 'receita')
    return <Valor centavos={l.valor} sinal="mais" className={`font-[600] text-gelo ${className}`} />
  if (l.tipo === 'despesa')
    return <Valor centavos={l.valor} sinal="menos" className={`font-[600] ${className}`} />
  return <Valor centavos={l.valor} sinal="nenhum" className={`font-[600] text-t2 ${className}`} />
}

/** Linha compacta de lançamento, clicável para editar. */
export function LinhaDeLancamento({
  l,
  dados,
  hoje,
  aoClicar,
}: {
  l: Lancamento
  dados: Dados
  hoje: string
  aoClicar: () => void
}) {
  return (
    <button type="button" className="linha-lista" onClick={aoClicar}>
      <IconeDoLancamento l={l} dados={dados} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-[560]">{tituloDoLancamento(l, dados)}</span>
        <span className="miudo block truncate">
          {dataCurta(l.data, hoje)} ·{' '}
          {l.tipo === 'receita' || l.tipo === 'despesa'
            ? nomeDaCategoria(l.categoria_id, dados.categorias) + ' · '
            : ''}
          {origemDoLancamento(l, dados)}
        </span>
      </span>
      <ValorDoLancamento l={l} />
    </button>
  )
}

/** Troca de mês com o rótulo deslizando na direção da troca. */
export function SeletorDeMes({
  valor,
  aoMudar,
  hoje,
}: {
  valor: string
  aoMudar: (ref: string) => void
  hoje: string
}) {
  const atual = mesDe(hoje)
  return (
    <div className="inline-flex items-center gap-1 rounded-[13px] bg-painel2 p-[3px] shadow-[inset_0_0_0_1px_var(--linha)]">
      <button
        type="button"
        className="b b-fantasma b-icone h-9 w-9"
        aria-label="Mês anterior"
        onClick={() => aoMudar(somarMesRef(valor, -1))}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <div className="relative h-9 w-[150px] overflow-hidden text-center" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={valor}
            className="absolute inset-0 grid place-items-center text-[.9375rem] font-[620] first-letter:uppercase"
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
            transition={MOLA_RAPIDA}
          >
            {rotuloMes(valor)}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        className="b b-fantasma b-icone h-9 w-9"
        aria-label="Próximo mês"
        disabled={valor >= somarMesRef(atual, 12)}
        onClick={() => aoMudar(somarMesRef(valor, 1))}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
