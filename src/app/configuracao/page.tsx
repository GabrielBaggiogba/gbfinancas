import { redirect } from 'next/navigation'
import Marca from '@/components/ui/Marca'
import { obterModo, variaveisFaltando } from '@/lib/modo'

export default function Configuracao() {
  if (obterModo() !== 'pendente') redirect('/')
  const faltando = variaveisFaltando()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col justify-center px-[max(16px,env(safe-area-inset-left))] py-10">
      <div className="mov-entra flex items-center gap-3" style={{ ['--i' as string]: 0 }}>
        <Marca tamanho={28} />
        <span className="text-[1.75rem] font-[650] leading-[1.1] tracking-[-0.03em]">
          GBFinanças
        </span>
      </div>

      <h1
        className="mov-entra mt-8 text-[1.25rem] font-[650] leading-[1.2] tracking-[-0.02em]"
        style={{ ['--i' as string]: 1 }}
      >
        Falta conectar o Supabase
      </h1>
      <p className="mov-entra mt-2 text-t2" style={{ ['--i' as string]: 1 }}>
        O app está instalado, mas ainda não sabe onde guardar os dados.
      </p>

      <ol
        className="mov-entra mt-6 flex list-decimal flex-col gap-3 pl-5 text-t1 marker:text-t3"
        style={{ ['--i' as string]: 2 }}
      >
        <li>Crie um projeto em supabase.com</li>
        <li>
          No SQL Editor, rode o arquivo{' '}
          <code className="break-all rounded-md bg-painel2 px-1.5 py-0.5 text-[.875rem] text-gelo">
            supabase/migrations/20261006000000_cria_lancamentos_diarios.sql
          </code>
        </li>
        <li>
          Copie{' '}
          <code className="rounded-md bg-painel2 px-1.5 py-0.5 text-[.875rem] text-gelo">
            .env.example
          </code>{' '}
          para{' '}
          <code className="rounded-md bg-painel2 px-1.5 py-0.5 text-[.875rem] text-gelo">
            .env.local
          </code>
          , preencha as duas variáveis e reinicie
        </li>
      </ol>

      <div className="mov-entra mt-6" style={{ ['--i' as string]: 3 }}>
        <p className="text-[.8125rem] font-[550] tracking-[.01em] text-t2">Variáveis ausentes:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {faltando.map((nome) => (
            <li
              key={nome}
              className="break-all rounded-full bg-painel2 px-3 py-1.5 text-[.8125rem] text-gelo shadow-[inset_0_0_0_1px_var(--linha)]"
            >
              {nome}
            </li>
          ))}
        </ul>
      </div>

      <p className="mov-entra mt-8 text-[.9375rem] text-t3" style={{ ['--i' as string]: 4 }}>
        Só quer ver o app funcionando? Rode{' '}
        <code className="rounded-md bg-painel2 px-1.5 py-0.5 text-[.875rem] text-t2">
          npm run demo
        </code>
        .
      </p>
    </main>
  )
}
