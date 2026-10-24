'use client'

import { Check, X } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { itemSurgir } from '@/components/motion/Surgir'
import Mascote from '@/components/ui/Mascote'
import { useEditor } from '../components/Editor'
import { useDados } from '../store'

const CHAVE = 'gbf_primeiros_passos'

type Passo = {
  titulo: string
  feito: boolean
  acao: { rotulo: string; href?: string; abrir?: () => void }
}

/** Guia de quem está começando: some quando tudo estiver feito ou a pessoa fechar. */
export default function PrimeirosPassos() {
  const { dados } = useDados()
  const { novo } = useEditor()
  const [fechado, setFechado] = useState(true)

  useEffect(() => {
    try {
      setFechado(localStorage.getItem(CHAVE) === 'fechado')
    } catch {
      setFechado(false)
    }
  }, [])

  const passos: Passo[] = [
    {
      titulo: 'Ajuste o saldo das suas contas',
      feito: dados.contas.length > 1 || dados.contas.some((c) => c.saldo_inicial !== 0),
      acao: { rotulo: 'Contas', href: '/contas' },
    },
    {
      titulo: 'Cadastre seus cartões de crédito',
      feito: dados.cartoes.length > 0,
      acao: { rotulo: 'Cartões', href: '/cartoes' },
    },
    {
      titulo: 'Informe quanto você ganha',
      feito:
        dados.lancamentos.some((l) => l.tipo === 'receita') ||
        dados.recorrentes.some((r) => r.tipo === 'receita'),
      acao: { rotulo: 'Nova entrada', abrir: () => novo('receita') },
    },
    {
      titulo: 'Registre seus gastos do dia a dia',
      feito: dados.lancamentos.filter((l) => l.tipo === 'despesa').length >= 3,
      acao: { rotulo: 'Nova saída', abrir: () => novo('despesa') },
    },
    {
      titulo: 'Defina um limite de gastos',
      feito: dados.orcamentos.length > 0,
      acao: { rotulo: 'Orçamentos', href: '/orcamentos' },
    },
    {
      titulo: 'Crie uma meta para guardar dinheiro',
      feito: dados.metas.length > 0,
      acao: { rotulo: 'Metas', href: '/metas' },
    },
  ]
  const feitos = passos.filter((p) => p.feito).length
  const pronto = feitos === passos.length
  if (fechado) return null

  const fechar = () => {
    setFechado(true)
    try {
      localStorage.setItem(CHAVE, 'fechado')
    } catch {
      // sem armazenamento: só some nesta visita
    }
  }

  return (
    <motion.section
      variants={itemSurgir}
      className="cartao relative overflow-hidden"
      aria-label="Primeiros passos"
    >
      <button
        type="button"
        className="b b-fantasma b-icone absolute right-2 top-2"
        onClick={fechar}
        aria-label="Fechar os primeiros passos"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="flex flex-col gap-4 p-[var(--pad)]">
        <div className="flex items-center gap-4 pr-8">
          <Mascote tamanho={84} humor={pronto ? 'comemorando' : 'feliz'} />
          <div>
            <h2 className="titulo-secao">{pronto ? 'Tudo pronto!' : 'Primeiros passos'}</h2>
            <p className="miudo mt-1">
              {pronto
                ? 'Agora é só lançar no dia a dia. De grão em grão, o dinheiro cresce.'
                : `${feitos} de ${passos.length} feitos. Eu te ajudo a começar.`}
            </p>
            <div className="mt-3 h-2 w-40 overflow-hidden rounded-full bg-painel2">
              <div
                className="h-full rounded-full bg-menta transition-[width] duration-500"
                style={{ width: `${(feitos / passos.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <ol className="grid gap-1">
          {passos.map((p) => (
            <li key={p.titulo} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <span
                className={`grid h-6 w-6 flex-none place-items-center rounded-full ${
                  p.feito ? 'bg-menta text-tinta' : 'shadow-[inset_0_0_0_1.5px_var(--linha2)]'
                }`}
                aria-hidden="true"
              >
                {p.feito && <Check size={14} />}
              </span>
              <span
                className={`min-w-0 flex-1 text-[.9375rem] ${p.feito ? 'text-t3 line-through' : 'font-[560]'}`}
              >
                {p.titulo}
              </span>
              {!p.feito &&
                (p.acao.href ? (
                  <Link href={p.acao.href} className="text-[.875rem] font-[620] text-menta">
                    {p.acao.rotulo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="text-[.875rem] font-[620] text-menta"
                    onClick={p.acao.abrir}
                  >
                    {p.acao.rotulo}
                  </button>
                ))}
            </li>
          ))}
        </ol>
      </div>
    </motion.section>
  )
}
