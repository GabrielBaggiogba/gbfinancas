'use client'

import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import Folha from '@/components/app/Folha'
import Mascote from '@/components/ui/Mascote'
import type { BancoDaLista } from './lista'

const EXEMPLOS = [
  { d: 'Mercado Bom Preço', c: 'Alimentação', v: '- R$ 187,40' },
  { d: 'Uber', c: 'Transporte', v: '- R$ 23,90' },
  { d: 'Salário', c: 'Salário', v: '+ R$ 4.500,00' },
  { d: 'Netflix', c: 'Assinaturas', v: '- R$ 39,90' },
  { d: 'Farmácia', c: 'Saúde', v: '- R$ 42,90' },
]

const inicial = (nome: string) =>
  nome
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export function SeloDoBanco({ banco, tamanho = 44 }: { banco: BancoDaLista; tamanho?: number }) {
  if (banco.logo)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={banco.logo}
        alt=""
        width={tamanho}
        height={tamanho}
        className="flex-none rounded-2xl bg-white object-contain p-1.5"
      />
    )
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center rounded-2xl text-[.9375rem] font-[750] text-white"
      style={{ width: tamanho, height: tamanho, background: banco.cor }}
    >
      {inicial(banco.nome)}
    </span>
  )
}

/**
 * Demonstração da conexão, passo a passo, com dados de exemplo. Não grava nada: serve para
 * mostrar como funciona antes de conectar (ou enquanto a conexão real não está ligada).
 */
export default function DemonstracaoBanco({
  aberta,
  aoFechar,
  banco,
  conexaoReal,
  aoConectar,
}: {
  aberta: boolean
  aoFechar: () => void
  banco: BancoDaLista
  conexaoReal: boolean
  aoConectar: () => void
}) {
  const [passo, setPasso] = useState(0)
  const fechar = () => {
    setPasso(0)
    aoFechar()
  }
  const PASSOS = [
    {
      titulo: 'Você escolhe o seu banco',
      texto: `Na lista, toque em ${banco.nome}. A conexão é feita pelo Open Finance, o sistema oficial do Banco Central.`,
    },
    {
      titulo: 'Autoriza no app do banco',
      texto:
        'Você é levado ao app ou site do seu banco, entra como sempre e autoriza o GBFinanças a ler suas contas, cartões e transações. Sua senha nunca passa por aqui.',
    },
    {
      titulo: 'Seus lançamentos chegam',
      texto:
        'O GBFinanças traz os últimos 90 dias, cria suas contas e cartões e já separa por categoria.',
    },
    {
      titulo: 'Daqui pra frente, sozinho',
      texto:
        'Cada compra, Pix ou salário que passar pelo banco aparece aqui todo dia, sem digitar. Você pode desconectar quando quiser.',
    },
  ]
  const ultimo = passo === PASSOS.length - 1

  return (
    <Folha
      aberta={aberta}
      aoFechar={fechar}
      titulo="Como conectar seu banco"
      pe={
        <>
          <button
            type="button"
            className="b b-suave"
            disabled={passo === 0}
            onClick={() => setPasso((p) => p - 1)}
          >
            <ArrowLeft size={17} aria-hidden="true" /> Voltar
          </button>
          {ultimo ? (
            <button
              type="button"
              className="b b-primario flex-1"
              onClick={() => {
                fechar()
                if (conexaoReal) aoConectar()
              }}
            >
              {conexaoReal ? `Conectar ${banco.nome} agora` : 'Entendi'}
            </button>
          ) : (
            <button
              type="button"
              className="b b-primario flex-1"
              onClick={() => setPasso((p) => p + 1)}
            >
              Próximo <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
        </>
      }
    >
      <div
        className="mb-3 flex items-center justify-center gap-1.5"
        aria-label={`Passo ${passo + 1} de 4`}
      >
        {PASSOS.map((_, i) => (
          <i
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-6 bg-menta' : 'w-1.5 bg-painel2'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={passo}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        >
          {/* Tela ilustrativa de cada passo */}
          <div className="mx-auto mb-4 w-full max-w-[300px] rounded-[26px] bg-painel2 p-4 shadow-[inset_0_0_0_1px_var(--linha)]">
            {passo === 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[banco, { id: null, nome: 'Outro banco', logo: null, cor: '#9aa89f' }].map(
                  (b, i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center text-[.75rem] font-[600] ${i === 0 ? 'bg-painel shadow-[0_0_0_2px_var(--verde)]' : 'opacity-50'}`}
                    >
                      <SeloDoBanco banco={b} tamanho={38} />
                      <span className="line-clamp-1">{b.nome}</span>
                    </div>
                  ),
                )}
              </div>
            )}
            {passo === 1 && (
              <div className="rounded-2xl bg-painel p-4 text-center">
                <div className="flex justify-center">
                  <SeloDoBanco banco={banco} tamanho={40} />
                </div>
                <p className="mt-2 font-[650]">{banco.nome}</p>
                <p className="miudo mt-1">O GBFinanças quer ver:</p>
                <ul className="mt-2 grid gap-1 text-left text-[.8125rem]">
                  {[
                    'Saldo das contas',
                    'Faturas e limite dos cartões',
                    'Transações dos últimos 12 meses',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <Check size={14} className="text-menta" aria-hidden="true" /> {t}
                    </li>
                  ))}
                </ul>
                <span
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[.8125rem] font-[650] text-white"
                  style={{ background: banco.cor }}
                >
                  <Lock size={13} aria-hidden="true" /> Autorizar
                </span>
              </div>
            )}
            {passo === 2 && (
              <ul className="grid gap-1.5">
                {EXEMPLOS.map((e, i) => (
                  <motion.li
                    key={e.d}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 * i }}
                    className="flex items-center justify-between rounded-xl bg-painel px-3 py-2 text-[.8125rem]"
                  >
                    <span>
                      <b className="font-[620]">{e.d}</b>
                      <span className="block text-t3">{e.c}</span>
                    </span>
                    <span className={`num font-[650] ${e.v.startsWith('+') ? 'text-menta' : ''}`}>
                      {e.v}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
            {passo === 3 && (
              <div className="flex flex-col items-center py-2 text-center">
                <Mascote tamanho={90} humor="comemorando" />
                <p className="mt-2 font-[650]">{banco.nome} conectado</p>
                <p className="miudo mt-1 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-menta" aria-hidden="true" /> Só leitura ·
                  desconecte quando quiser
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-[.75rem] font-[600] uppercase tracking-[.08em] text-t3">
            Demonstração · dados de exemplo
          </p>
          <h3 className="mt-2 text-center text-[1.25rem] font-[700] tracking-[-.02em]">
            {passo + 1}. {PASSOS[passo].titulo}
          </h3>
          <p className="mt-1.5 text-center text-t2">{PASSOS[passo].texto}</p>
          {ultimo && !conexaoReal && (
            <p className="mt-3 rounded-2xl bg-painel2 px-4 py-3 text-center text-[.9375rem] text-t2">
              A conexão de verdade é liberada assim que o GBFinanças for ligado ao Open Finance. Até
              lá, dá para importar o extrato do banco (OFX ou CSV) em Configurações.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </Folha>
  )
}
