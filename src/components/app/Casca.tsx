'use client'

import { LayoutGroup, MotionConfig, motion } from 'motion/react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChartColumn,
  ChartPie,
  CreditCard,
  Ellipsis,
  Eye,
  EyeOff,
  Landmark,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Plus,
  Repeat,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Magnetico, Ondas, TextoSurgindo } from '@/components/motion/Efeitos'
import { MOLA } from '@/components/motion/molas'
import Marca from '@/components/ui/Marca'
import { sair } from '@/features/auth/actions'
import { useEditor } from '@/features/financas/components/Editor'
import { useDados } from '@/features/financas/store'
import Folha from './Folha'
import { usePreferencias } from './Preferencias'

type Destino = { href: string; rotulo: string; icone: LucideIcon }

const NAVEGACAO: Destino[] = [
  { href: '/', rotulo: 'Dashboard', icone: LayoutDashboard },
  { href: '/lancamentos', rotulo: 'Lançamentos', icone: ArrowLeftRight },
  { href: '/contas', rotulo: 'Contas', icone: Landmark },
  { href: '/cartoes', rotulo: 'Cartões', icone: CreditCard },
  { href: '/orcamentos', rotulo: 'Orçamentos', icone: ChartPie },
  { href: '/metas', rotulo: 'Metas', icone: Target },
  { href: '/recorrentes', rotulo: 'Recorrentes', icone: Repeat },
  { href: '/relatorios', rotulo: 'Relatórios', icone: ChartColumn },
  { href: '/noticias', rotulo: 'Notícias', icone: Newspaper },
  { href: '/configuracoes', rotulo: 'Configurações', icone: Settings },
]

const noCampo = (alvo: EventTarget | null) =>
  alvo instanceof HTMLElement &&
  (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))

export default function Casca({ children }: { children: ReactNode }) {
  const caminho = usePathname()
  const router = useRouter()
  const { email, demo } = useDados()
  const { novo } = useEditor()
  const { ocultar, definir } = usePreferencias()
  const [mais, setMais] = useState(false)
  const [onda, setOnda] = useState(0)
  const atual = NAVEGACAO.find((d) => d.href === caminho) ?? NAVEGACAO[0]

  // Atalhos: N abre um lançamento, / vai para a busca. Esc fecha painéis (em cada painel).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || noCampo(e.target)) return
      if (document.querySelector('[aria-modal="true"]')) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        novo('despesa')
      } else if (e.key === '/') {
        e.preventDefault()
        const busca = document.getElementById('busca-lancamentos')
        if (busca) busca.focus()
        else router.push('/lancamentos?buscar=1')
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [novo, router])

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="casca">
        <aside className="lateral" aria-label="Navegação principal">
          <Link
            href="/"
            className="mb-6 flex h-10 items-center gap-2.5 px-3 max-[1180px]:justify-center max-[1180px]:px-0"
          >
            <Marca tamanho={24} />
            <span className="rotulo-nav text-[1.125rem] font-[680] tracking-[-.03em]">
              GBFinanças
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {NAVEGACAO.map((d, i) => {
              const ativo = d.href === caminho
              return (
                <motion.div
                  key={d.href}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.04 * i }}
                >
                  <Link
                    href={d.href}
                    className="nav-item"
                    aria-current={ativo ? 'page' : undefined}
                    title={d.rotulo}
                  >
                    {ativo && (
                      <motion.i layoutId="nav-fundo" className="nav-fundo" transition={MOLA} />
                    )}
                    <d.icone size={19} aria-hidden="true" />
                    <span className="rotulo-nav">{d.rotulo}</span>
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          <div className="so-largo mt-3 rounded-2xl bg-painel2 p-3 shadow-[inset_0_0_0_1px_var(--linha)]">
            <p className="miudo">Conectado como</p>
            <p className="truncate text-[.875rem] font-[560]" title={email}>
              {email}
            </p>
          </div>
          <form action={sair} className="mt-2">
            <button type="submit" className="nav-item w-full" title="Sair">
              <LogOut size={19} aria-hidden="true" />
              <span className="rotulo-nav">Sair</span>
            </button>
          </form>
        </aside>

        <div className="principal">
          <header className="topo">
            <h1 className="titulo-pagina min-w-0 flex-1 truncate">
              <TextoSurgindo key={atual.href} texto={atual.rotulo} />
            </h1>
            {demo && (
              <span className="selo selo-azul mov-pilula max-[900px]:!hidden" role="status">
                Modo demonstração
              </span>
            )}
            <button
              type="button"
              className="b b-fantasma b-icone"
              aria-pressed={ocultar}
              aria-label={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
              title={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
              onClick={() => definir({ ocultar: !ocultar })}
            >
              {ocultar ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
            <div className="flex items-center gap-2 max-[760px]:!hidden">
              <Magnetico>
                <button type="button" className="b b-realce" onClick={() => novo('receita')}>
                  <ArrowDownLeft size={17} aria-hidden="true" /> Entrada
                </button>
              </Magnetico>
              <Magnetico>
                <button
                  type="button"
                  className="b b-suave"
                  onClick={() => novo('despesa')}
                  title="Atalho: N"
                >
                  <ArrowUpRight size={17} aria-hidden="true" /> Saída
                </button>
              </Magnetico>
              <Magnetico>
                <button
                  type="button"
                  className="b b-suave b-icone"
                  onClick={() => novo('transferencia')}
                  aria-label="Transferência entre contas"
                  title="Transferência entre contas"
                >
                  <ArrowLeftRight size={17} aria-hidden="true" />
                </button>
              </Magnetico>
            </div>
          </header>
          <main className="pagina">{children}</main>
        </div>

        <nav className="dock" aria-label="Navegação">
          {NAVEGACAO.slice(0, 2).map((d) => (
            <ItemDoDock key={d.href} destino={d} ativo={d.href === caminho} />
          ))}
          <div className="grid place-items-center">
            <button
              type="button"
              className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-gelo text-tinta shadow-[0_10px_24px_-8px_var(--azul)] transition-transform active:scale-95"
              aria-label="Novo lançamento"
              onClick={() => {
                setOnda((o) => o + 1)
                novo('despesa')
              }}
            >
              <Ondas pulso={onda} />
              <Plus size={24} aria-hidden="true" />
            </button>
          </div>
          <ItemDoDock destino={NAVEGACAO[3]} ativo={caminho === '/cartoes'} />
          <button
            type="button"
            className="dock-item"
            aria-current={
              NAVEGACAO.slice(2).some((d) => d.href === caminho && d.href !== '/cartoes')
                ? 'page'
                : undefined
            }
            onClick={() => setMais(true)}
          >
            <Ellipsis size={21} aria-hidden="true" />
            <span>Mais</span>
          </button>
        </nav>

        <Folha aberta={mais} aoFechar={() => setMais(false)} titulo="Mais">
          <div className="grid grid-cols-2 gap-2 pb-2">
            {NAVEGACAO.slice(2).map((d, i) => (
              <motion.div
                key={d.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5, delay: 0.04 * i }}
              >
                <Link
                  href={d.href}
                  onClick={() => setMais(false)}
                  aria-current={d.href === caminho ? 'page' : undefined}
                  className="flex h-[72px] flex-col justify-center gap-1.5 rounded-2xl bg-painel2 px-4 font-[580] shadow-[inset_0_0_0_1px_var(--linha)] aria-[current=page]:text-gelo"
                >
                  <d.icone size={20} aria-hidden="true" />
                  {d.rotulo}
                </Link>
              </motion.div>
            ))}
          </div>
          <form action={sair}>
            <button type="submit" className="b b-suave b-grande mt-2 w-full">
              <LogOut size={18} aria-hidden="true" /> Sair
            </button>
          </form>
        </Folha>
      </LayoutGroup>
      <div id="camadas" />
    </MotionConfig>
  )
}

function ItemDoDock({ destino, ativo }: { destino: Destino; ativo: boolean }) {
  return (
    <Link href={destino.href} className="dock-item" aria-current={ativo ? 'page' : undefined}>
      {ativo && (
        <motion.i
          layoutId="dock-fundo"
          className="absolute inset-0 rounded-[18px] bg-[color:var(--realce)]"
          style={{ zIndex: 0 }}
          transition={MOLA}
        />
      )}
      <destino.icone size={21} aria-hidden="true" />
      <span>{destino.rotulo === 'Dashboard' ? 'Início' : destino.rotulo}</span>
    </Link>
  )
}
