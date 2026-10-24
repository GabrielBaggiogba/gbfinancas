'use client'

import { ArrowUpRight, Play } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { Bloco } from '@/features/financas/telas/partes'

// Capítulos do vídeo: o segundo em que cada tela começa (medido na narração) e para onde leva.
const CAPITULOS: { inicio: number; nome: string; resumo: string; href?: string }[] = [
  { inicio: 0, nome: 'Abertura', resumo: 'O que é o GBFinanças' },
  { inicio: 7.5, nome: 'Dashboard', resumo: 'Saldo, entradas, saídas e gráficos do mês', href: '/' },
  {
    inicio: 17.9,
    nome: 'Lançamentos',
    resumo: 'Registrar, buscar, filtrar e exportar',
    href: '/lancamentos',
  },
  { inicio: 28.85, nome: 'Contas', resumo: 'Saldo de cada conta e patrimônio', href: '/contas' },
  { inicio: 37.7, nome: 'Cartões', resumo: 'Limite, faturas e parcelas', href: '/cartoes' },
  {
    inicio: 48.65,
    nome: 'Orçamentos',
    resumo: 'Limite por categoria, com avisos',
    href: '/orcamentos',
  },
  { inicio: 58.15, nome: 'Metas', resumo: 'Objetivo, prazo e aportes', href: '/metas' },
  {
    inicio: 66.95,
    nome: 'Recorrentes',
    resumo: 'Contas que se repetem e fluxo de 90 dias',
    href: '/recorrentes',
  },
  {
    inicio: 77.55,
    nome: 'Relatórios',
    resumo: 'Comparar meses, exportar e imprimir',
    href: '/relatorios',
  },
  { inicio: 87.2, nome: 'Mercado', resumo: 'Altas, baixas e ranking da bolsa', href: '/mercado' },
  { inicio: 93.55, nome: 'Calculadora', resumo: 'Contas rápidas no canto da tela' },
  {
    inicio: 99,
    nome: 'Configurações',
    resumo: 'Tema, categorias e backup',
    href: '/configuracoes',
  },
]

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function ComeceAqui() {
  const video = useRef<HTMLVideoElement>(null)
  const [tempo, setTempo] = useState(0)
  const atual = CAPITULOS.findLastIndex((c) => tempo >= c.inicio)

  const irPara = (inicio: number) => {
    const v = video.current
    if (!v) return
    v.currentTime = inicio
    void v.play()
  }

  return (
    <Surgir className="grid gap-[var(--vao)] min-[1100px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-[var(--vao)]">
        <motion.div variants={itemSurgir} className="cartao overflow-hidden">
          <video
            ref={video}
            className="block aspect-video w-full bg-black"
            controls
            playsInline
            preload="metadata"
            poster="/video/comece-aqui.jpg"
            aria-label="Vídeo de apresentação do GBFinanças, com legendas na imagem"
            onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
          >
            <source src="/video/comece-aqui.mp4" type="video/mp4" />
          </video>
        </motion.div>
        <Bloco titulo="Conheça o app em dois minutos">
          <p className="text-t2">
            O vídeo passa por cada tela, com legendas. Clique em um capítulo para pular direto para
            o assunto, ou abra a tela para experimentar. As telas do vídeo usam dados de exemplo.
          </p>
        </Bloco>
      </div>

      <Bloco titulo="Capítulos" semPad>
        <ol className="px-2 pb-2">
          {CAPITULOS.map((c, i) => (
            <li key={c.nome} className="flex items-center gap-1">
              <button
                type="button"
                className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-painel2 aria-[current=true]:bg-[color:var(--realce)]"
                aria-current={i === atual ? 'true' : undefined}
                onClick={() => irPara(c.inicio)}
              >
                <span
                  className={`grid h-9 w-9 flex-none place-items-center rounded-full ${
                    i === atual ? 'bg-menta text-tinta' : 'bg-painel2 text-t2'
                  }`}
                  aria-hidden="true"
                >
                  <Play size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-[600]">{c.nome}</span>
                  <span className="miudo block truncate">{c.resumo}</span>
                </span>
                <span className="num miudo">{relogio(c.inicio)}</span>
              </button>
              {c.href ? (
                <Link
                  href={c.href}
                  className="b b-fantasma b-icone flex-none"
                  aria-label={`Abrir ${c.nome}`}
                  title={`Abrir ${c.nome}`}
                >
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <span className="w-10 flex-none" />
              )}
            </li>
          ))}
        </ol>
      </Bloco>
    </Surgir>
  )
}
