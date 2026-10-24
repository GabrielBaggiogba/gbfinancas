'use client'

import {
  ArrowRight,
  BellRing,
  Camera,
  ChartPie,
  Check,
  CreditCard,
  FileUp,
  Gauge,
  LogIn,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import Marca from '@/components/ui/Marca'
import Mascote from '@/components/ui/Mascote'
import { formatarReais } from '@/lib/dinheiro'
import { entrarNaLista } from '../actions'
import { PLANOS, anual, type PlanoId } from '../planos'

type Recurso = { icone: LucideIcon; titulo: string; texto: string; breve?: boolean }

const RECURSOS: Recurso[] = [
  {
    icone: MessagesSquare,
    titulo: 'Pergunte ao Grão',
    texto:
      '"Quanto sobrou do salário?" "Posso comprar um tênis?" O assistente responde com os seus números.',
  },
  {
    icone: MessageCircle,
    titulo: 'Lance pelo WhatsApp',
    texto: 'Mande "almoço 32 reais" e o gasto entra na hora, com categoria e conta.',
  },
  {
    icone: Camera,
    titulo: 'Foto, PDF ou voz',
    texto: 'Fotografe a nota, envie o PDF do boleto ou fale o valor. A IA lê e registra.',
  },
  {
    icone: Sparkles,
    titulo: 'Categorias automáticas',
    texto: 'A inteligência artificial escolhe a categoria certa a partir da descrição.',
  },
  {
    icone: BellRing,
    titulo: 'Lembretes de contas',
    texto: 'Aviso no WhatsApp e no e-mail antes de cada conta vencer ou dinheiro entrar.',
  },
  {
    icone: Gauge,
    titulo: 'Limites com alertas',
    texto: 'Defina um teto por categoria e saiba quando chegar a 70, 90 e 100%.',
  },
  {
    icone: ChartPie,
    titulo: 'Gráficos e relatórios',
    texto: 'Veja para onde o dinheiro vai, compare meses e exporte em planilha ou PDF.',
  },
  {
    icone: Target,
    titulo: 'Metas de economia',
    texto: 'Reserva de emergência, viagem, carro: acompanhe aportes e quanto falta.',
  },
  {
    icone: Users,
    titulo: 'Gestão compartilhada',
    texto: 'Casal ou família no mesmo painel, cada um no seu WhatsApp, sabendo quem gastou.',
  },
  {
    icone: FileUp,
    titulo: 'Importe o extrato do banco',
    texto:
      'Traga o histórico em OFX ou CSV, o arquivo que todo banco exporta, e comece sem digitar nada.',
  },
  {
    icone: CreditCard,
    titulo: 'Contas e cartões',
    texto: 'Várias contas, faturas e compras parceladas organizadas em um só lugar.',
  },
  {
    icone: RefreshCw,
    titulo: 'Open Finance',
    texto: 'Conecte bancos e cartões para os lançamentos chegarem sozinhos.',
    breve: true,
  },
]

const PERGUNTAS = [
  {
    p: 'Quando a assinatura abre?',
    r: 'Em breve. Quem entrar na lista de espera recebe o aviso primeiro e uma condição de lançamento.',
  },
  {
    p: 'Já uso o GBFinanças. Vou ter que pagar?',
    r: 'Não. As contas criadas antes do lançamento são fundadoras e continuam com acesso total, sem custo.',
  },
  {
    p: 'Meus dados ficam seguros?',
    r: 'Cada pessoa só enxerga os próprios dados, com regras de acesso no banco e conexão criptografada. Nada é vendido ou compartilhado.',
  },
  {
    p: 'Posso trocar de plano depois?',
    r: 'Sim. Você poderá mudar de plano quando quiser, direto nas configurações.',
  },
  {
    p: 'Preciso instalar alguma coisa?',
    r: 'Não. O GBFinanças funciona no navegador do computador e do celular, e pode ser adicionado à tela inicial como um aplicativo.',
  },
]

export default function Vitrine({ logado }: { logado: boolean }) {
  const [periodo, setPeriodo] = useState<'mensal' | 'anual'>('mensal')
  const [escolhido, setEscolhido] = useState<PlanoId>('completo')

  const escolher = (id: PlanoId) => {
    setEscolhido(id)
    document.getElementById('lista')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="min-h-dvh bg-fundo text-t1">
      <header className="sticky top-0 z-20 border-b border-linha bg-[color:var(--fundo)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href={logado ? '/' : '/planos'} className="flex items-center gap-2.5">
            <Marca tamanho={26} />
            <span className="text-[1.125rem] font-[700] tracking-[-.03em]">GBFinanças</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-[.9375rem] font-[560] text-t2 sm:flex">
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <Link
            href={logado ? '/' : '/login'}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-t1 px-4 text-[.9375rem] font-[620] text-fundo sm:ml-0"
          >
            <LogIn size={17} aria-hidden="true" /> {logado ? 'Abrir o app' : 'Entrar'}
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_75%_10%,color-mix(in_srgb,var(--verde)_22%,transparent),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[color:var(--painel)] px-3 py-1.5 text-[.8125rem] font-[620] text-menta shadow-[inset_0_0_0_1px_var(--linha)]">
                <Sparkles size={15} aria-hidden="true" /> Com WhatsApp e inteligência artificial
              </p>
              <h1 className="mt-5 text-[2.5rem] font-[720] leading-[1.05] tracking-[-.04em] md:text-[3.5rem]">
                Seu dinheiro organizado no ritmo de uma mensagem.
              </h1>
              <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed text-t2">
                Registre gastos falando, fotografando a nota ou mandando um WhatsApp. O GBFinanças
                categoriza, avisa antes das contas vencerem e mostra para onde vai cada real.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#planos"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-menta px-6 font-[650] text-tinta shadow-[0_12px_30px_-12px_var(--verde)]"
                >
                  Ver planos <ArrowRight size={18} aria-hidden="true" />
                </a>
                {!logado && (
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center rounded-2xl bg-painel px-6 font-[620] shadow-[inset_0_0_0_1px_var(--linha2)]"
                  >
                    Já tenho conta
                  </Link>
                )}
              </div>
            </div>
            <div className="relative">
              <Mascote
                tamanho={120}
                className="absolute -left-6 -top-14 z-10 max-md:-left-2 max-md:-top-10"
              />
              <Conversa />
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <h2 className="text-[2rem] font-[700] tracking-[-.03em]">Tudo o que você precisa</h2>
          <p className="mt-2 text-t2">Feito para usar todo dia, sem planilha e sem complicação.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {RECURSOS.map((r) => (
              <div
                key={r.titulo}
                className="flex gap-4 rounded-[22px] bg-painel p-5 shadow-[0_1px_2px_rgba(10,50,28,.05),0_10px_30px_-18px_rgba(10,50,28,.2)]"
              >
                <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[color:color-mix(in_srgb,var(--verde)_14%,transparent)] text-menta">
                  <r.icone size={22} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="flex flex-wrap items-center gap-2 font-[660]">
                    {r.titulo}
                    {r.breve && (
                      <span className="rounded-full bg-[color:color-mix(in_srgb,var(--ouro)_18%,transparent)] px-2 py-0.5 text-[.75rem] font-[650] text-ouro">
                        Em breve
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-[.9375rem] leading-relaxed text-t2">{r.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="planos" className="scroll-mt-20 bg-painel2 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-[2rem] font-[700] tracking-[-.03em]">Escolha o seu plano</h2>
              <p className="mt-2 text-t2">
                Pague por mês ou por ano. No anual, você ganha 2 meses.
              </p>
              <div
                role="tablist"
                aria-label="Período de cobrança"
                className="mx-auto mt-6 inline-flex rounded-full bg-painel p-1 shadow-[inset_0_0_0_1px_var(--linha)]"
              >
                {(['mensal', 'anual'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={periodo === p}
                    onClick={() => setPeriodo(p)}
                    className="h-10 rounded-full px-5 text-[.9375rem] font-[620] text-t2 aria-selected:bg-menta aria-selected:text-tinta"
                  >
                    {p === 'mensal' ? 'Mensal' : 'Anual · 2 meses grátis'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PLANOS.map((p) => {
                const valor = periodo === 'mensal' ? p.mensal : Math.round(anual(p) / 12)
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-[26px] p-6 ${
                      p.destaque
                        ? 'bg-[#0b2a18] text-[#ecf5ef] shadow-[0_30px_60px_-30px_rgba(6,60,30,.6)]'
                        : 'bg-painel shadow-[0_1px_2px_rgba(10,50,28,.05),0_10px_30px_-18px_rgba(10,50,28,.2)]'
                    }`}
                  >
                    {p.destaque && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f2c14e] px-3 py-1 text-[.75rem] font-[700] text-[#3a2a00]">
                        Mais escolhido
                      </span>
                    )}
                    <h3 className="text-[1.375rem] font-[700]">{p.nome}</h3>
                    <p
                      className={`mt-1 text-[.9375rem] ${p.destaque ? 'text-[#a3b6a9]' : 'text-t2'}`}
                    >
                      {p.resumo}
                    </p>
                    <p className="mt-5 flex items-end gap-1">
                      <span className="num text-[2.5rem] font-[720] leading-none tracking-[-.03em]">
                        {formatarReais(valor)}
                      </span>
                      <span className={p.destaque ? 'text-[#a3b6a9]' : 'text-t3'}>/mês</span>
                    </p>
                    <p
                      className={`mt-1 h-5 text-[.8125rem] ${p.destaque ? 'text-[#a3b6a9]' : 'text-t3'}`}
                    >
                      {periodo === 'anual'
                        ? `${formatarReais(anual(p))} cobrados uma vez por ano`
                        : ''}
                    </p>
                    <ul className="mb-7 mt-5 grid gap-2.5 text-[.9375rem]">
                      {p.recursos.map((r) => (
                        <li key={r} className="flex gap-2.5">
                          <Check
                            size={18}
                            aria-hidden="true"
                            className={`mt-0.5 flex-none ${p.destaque ? 'text-[#4ade80]' : 'text-menta'}`}
                          />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => escolher(p.id)}
                      className={`mt-auto h-12 rounded-2xl font-[650] ${
                        p.destaque ? 'bg-[#4ade80] text-[#04210f]' : 'bg-menta text-tinta'
                      }`}
                    >
                      Quero o {p.nome}
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-[.875rem] text-t2">
              <ShieldCheck size={17} aria-hidden="true" className="text-menta" /> Contas criadas
              antes do lançamento são fundadoras: acesso total, sem custo.
            </p>
          </div>
        </section>

        <ListaDeEspera escolhido={escolhido} setEscolhido={setEscolhido} />

        <section id="perguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20">
          <h2 className="text-[2rem] font-[700] tracking-[-.03em]">Perguntas frequentes</h2>
          <div className="mt-6 grid gap-3">
            {PERGUNTAS.map((q) => (
              <details
                key={q.p}
                className="group rounded-2xl bg-painel px-5 py-4 shadow-[inset_0_0_0_1px_var(--linha)]"
              >
                <summary className="cursor-pointer list-none font-[620] marker:hidden">
                  {q.p}
                </summary>
                <p className="mt-2 text-t2">{q.r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-linha py-8 text-center text-[.875rem] text-t3">
        GBFinanças · Gestão financeira pessoal
      </footer>
    </div>
  )
}

/** Ilustração de uma conversa no WhatsApp: o gasto mandado e a confirmação do app. */
function Conversa() {
  return (
    <div
      aria-label="Exemplo de conversa: a pessoa manda o gasto e o GBFinanças confirma o registro"
      role="img"
      className="mx-auto w-full max-w-sm rounded-[30px] bg-painel p-4 shadow-[0_40px_80px_-40px_rgba(6,60,30,.55)]"
    >
      <div className="flex items-center gap-3 border-b border-linha pb-3">
        <Mascote tamanho={40} animado={false} />
        <div>
          <p className="font-[650]">GBFinanças</p>
          <p className="text-[.8125rem] text-t3">assistente financeiro</p>
        </div>
      </div>
      <div className="grid gap-3 py-4 text-[.9375rem]">
        <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[#d9fdd3] px-3.5 py-2 text-[#0b1f14]">
          mercado 187,40 no cartão
        </p>
        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-painel2 px-3.5 py-2.5">
          <p className="font-[650]">Gasto registrado ✓</p>
          <p className="mt-1 text-t2">
            Mercado · R$ 187,40
            <br />
            Alimentação › Mercado
            <br />
            Cartão de crédito
          </p>
          <p className="mt-2 text-[.8125rem] text-t3">Você usou 64% do orçamento de Alimentação.</p>
        </div>
        <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[#d9fdd3] px-3.5 py-2 text-[#0b1f14]">
          📷 foto da nota da farmácia
        </p>
        <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-painel2 px-3.5 py-2.5">
          Li a nota: <b>Farmácia · R$ 42,90</b> em Saúde. Registrado ✓
        </p>
      </div>
      <p className="text-center text-[.75rem] text-t3">Ilustração</p>
    </div>
  )
}

function ListaDeEspera({
  escolhido,
  setEscolhido,
}: {
  escolhido: PlanoId
  setEscolhido: (p: PlanoId) => void
}) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'livre' | 'enviando' | 'feito'>('livre')
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    setErro('')
    const r = await entrarNaLista({ email, plano: escolhido }).catch(() => null)
    if (r?.ok) setEstado('feito')
    else {
      setEstado('livre')
      setErro(r && !r.ok ? r.mensagem : 'Sem conexão. Tente de novo.')
    }
  }

  return (
    <section id="lista" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16">
      <div className="rounded-[28px] bg-painel p-6 shadow-[0_30px_60px_-34px_rgba(6,60,30,.45)] md:p-8">
        <h2 className="text-[1.75rem] font-[700] tracking-[-.03em]">Entre na lista de espera</h2>
        <p className="mt-2 text-t2">
          A assinatura abre em breve. Deixe seu e-mail e avisamos primeiro, com uma condição de
          lançamento.
        </p>
        {estado === 'feito' ? (
          <p role="status" className="mt-6 rounded-2xl bg-painel2 px-4 py-4 font-[600] text-menta">
            Pronto! Você está na lista do plano {PLANOS.find((p) => p.id === escolhido)?.nome}.
            Avisamos por e-mail.
          </p>
        ) : (
          <form onSubmit={enviar} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="sr-only" htmlFor="lista-email">
              E-mail
            </label>
            <input
              id="lista-email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl bg-painel2 px-4 text-t1 shadow-[inset_0_0_0_1px_var(--linha)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--verde)]"
            />
            <label className="sr-only" htmlFor="lista-plano">
              Plano
            </label>
            <select
              id="lista-plano"
              value={escolhido}
              onChange={(e) => setEscolhido(e.target.value as PlanoId)}
              className="h-12 rounded-2xl bg-painel2 px-3 text-t1 shadow-[inset_0_0_0_1px_var(--linha)]"
            >
              {PLANOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={estado === 'enviando'}
              className="h-12 rounded-2xl bg-menta px-6 font-[650] text-tinta disabled:opacity-60"
            >
              {estado === 'enviando' ? 'Enviando...' : 'Quero ser avisado'}
            </button>
          </form>
        )}
        {erro && (
          <p role="alert" className="mt-3 text-erro">
            {erro}
          </p>
        )}
      </div>
    </section>
  )
}
