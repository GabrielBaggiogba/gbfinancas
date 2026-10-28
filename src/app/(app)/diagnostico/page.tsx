import type { SupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { obterUsuario } from '@/features/auth/sessao'
import { emailAtivo } from '@/features/avisos/email'
import { pluggyAtivo, pluggySandbox } from '@/features/bancos/pluggy'
import { iaAtiva } from '@/features/ia/ler'
import { transcricaoAtiva } from '@/features/ia/transcrever'
import { obterAssinatura } from '@/features/planos/servidor'
import { whatsappAtivo } from '@/features/whatsapp/api'
import { obterModo } from '@/lib/modo'
import { adminAtivo } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/server'

export const metadata = { title: 'Diagnóstico' }

// Tabela que cada migration cria: se ela existe, a migration foi aplicada.
const MIGRATIONS = [
  ['20261007 gestão financeira', 'contas'],
  ['20261010 auditoria e limite', 'auditoria'],
  ['20261024 planos e perfis', 'perfis'],
  ['20261025 família', 'membros'],
  ['20261026 WhatsApp', 'whatsapp_mensagens'],
  ['20261027 Open Finance', 'conexoes_bancarias'],
] as const

type Item = { nome: string; ok: boolean; falta: string }

/** Só quem administra: GBF_ADMINS (e-mails separados por vírgula) ou, sem ela, contas fundadoras. */
async function podeVer() {
  const usuario = await obterUsuario()
  if (!usuario) return false
  const admins = (process.env.GBF_ADMINS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (admins.length) return admins.includes(usuario.email.toLowerCase())
  return (await obterAssinatura(usuario)).plano === 'fundador'
}

async function tabelasQueExistem(): Promise<Set<string>> {
  if (obterModo() !== 'supabase') return new Set()
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const existe = await Promise.all(
    MIGRATIONS.map(async ([, t]) => {
      const { error } = await supabase.from(t).select('*', { head: true, count: 'exact' }).limit(0)
      return error ? null : t
    }),
  )
  return new Set(existe.filter((t): t is (typeof MIGRATIONS)[number][1] => t !== null))
}

export default async function Diagnostico() {
  if (!(await podeVer())) notFound()
  const tabelas = await tabelasQueExistem()
  const env = (n: string) => Boolean(process.env[n])

  const grupos: { titulo: string; itens: Item[] }[] = [
    {
      titulo: 'Integrações',
      itens: [
        {
          nome: 'Banco de dados (Supabase)',
          ok: obterModo() === 'supabase',
          falta: 'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY',
        },
        {
          nome: 'Chave de serviço (WhatsApp, lembretes e bancos)',
          ok: adminAtivo(),
          falta: 'SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API Keys)',
        },
        {
          nome: 'Leitura com IA',
          ok: iaAtiva(),
          falta: 'ANTHROPIC_API_KEY (console.anthropic.com)',
        },
        {
          nome: 'Áudio (transcrição)',
          ok: transcricaoAtiva(),
          falta: 'GBF_TRANSCRICAO_KEY (console.groq.com → API Keys)',
        },
        {
          nome: `Conexão com bancos (Pluggy${pluggySandbox() ? ', modo de teste' : ''})`,
          ok: pluggyAtivo(),
          falta:
            'PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET e PLUGGY_WEBHOOK_SEGREDO (dashboard.pluggy.ai)',
        },
        {
          nome: 'WhatsApp',
          ok: whatsappAtivo(),
          falta: 'WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN',
        },
        {
          nome: 'E-mail de lembretes',
          ok: emailAtivo(),
          falta: 'RESEND_API_KEY e GBF_EMAIL_REMETENTE (resend.com)',
        },
        {
          nome: 'Rotinas diárias (lembretes e bancos)',
          ok: env('CRON_SECRET'),
          falta: 'CRON_SECRET (qualquer texto longo e aleatório)',
        },
      ],
    },
    {
      titulo: 'Migrations do banco',
      itens: MIGRATIONS.map(([nome, t]) => ({
        nome,
        ok: tabelas.has(t),
        falta: 'Rode o arquivo de supabase/migrations no SQL Editor do Supabase',
      })),
    },
  ]

  return (
    <div className="grid gap-[var(--gap)]">
      <header>
        <h2 className="text-[1.5rem] font-[700] tracking-[-.02em]">Diagnóstico</h2>
        <p className="mt-1 text-t2">
          O que está ligado neste site. As chaves ficam na Vercel (Settings → Environment
          Variables); depois de salvar, faça um novo deploy.
        </p>
      </header>
      {grupos.map((g) => (
        <section key={g.titulo} className="cartao p-[var(--pad)]">
          <h2 className="titulo-secao">{g.titulo}</h2>
          <ul className="mt-3 grid gap-2">
            {g.itens.map((i) => (
              <li
                key={i.nome}
                className="flex items-start gap-3 rounded-2xl bg-painel2 px-3 py-2.5"
              >
                <span className={`selo ${i.ok ? 'selo-verde' : 'selo-aviso'} mt-0.5 flex-none`}>
                  {i.ok ? 'Ligado' : 'Falta'}
                </span>
                <span className="min-w-0">
                  <b className="font-[620]">{i.nome}</b>
                  {!i.ok && <span className="miudo block break-words">{i.falta}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
