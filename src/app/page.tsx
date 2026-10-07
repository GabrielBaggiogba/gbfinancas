import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Botao from '@/components/ui/Botao'
import EsqueletoPainel from '@/components/EsqueletoPainel'
import Marca from '@/components/ui/Marca'
import { sair } from '@/features/auth/actions'
import { obterUsuario } from '@/features/auth/sessao'
import Painel from '@/features/lancamentos/components/Painel'
import { obterRepositorio } from '@/features/lancamentos/repositorio'
import { hojeEmSaoPaulo, inicioDaJanela } from '@/lib/datas'
import { obterModo } from '@/lib/modo'

// O esqueleto vem de um <Suspense> da própria página, e não de um loading.tsx: o loading.tsx
// remonta o painel (e perde o dia selecionado e o rascunho) toda vez que uma Server Action
// atualiza a rota.
async function DadosDoPainel({ hoje }: { hoje: string }) {
  const [usuario, lista] = await Promise.all([
    obterUsuario(),
    obterRepositorio()
      .listarPeriodo(inicioDaJanela(hoje), hoje)
      .catch((e: unknown) => e),
  ])
  if (!usuario) redirect('/login')
  if (lista instanceof Error) throw lista
  if (!Array.isArray(lista)) throw new Error('Não foi possível carregar os lançamentos.')
  return <Painel key={hoje} inicial={lista} hoje={hoje} email={usuario.email} />
}

export default function Inicio() {
  const modo = obterModo()
  if (modo === 'pendente') redirect('/configuracao')
  const hoje = hojeEmSaoPaulo()

  return (
    <>
      <header className="cabecalho">
        <div className="cabecalho-in">
          <div className="flex items-center gap-2.5">
            <Marca tamanho={20} />
            <span className="text-[1.0625rem] font-[650] tracking-[-.01em]">GBFinanças</span>
          </div>
          <form action={sair}>
            <Botao variante="fantasma" type="submit">
              Sair
            </Botao>
          </form>
        </div>
      </header>
      {modo === 'demo' && (
        <div className="faixa">
          <p className="pilula pilula-aviso mov-pilula" role="status">
            Modo demonstração · dados só neste navegador
          </p>
        </div>
      )}
      <Suspense fallback={<EsqueletoPainel />}>
        <DadosDoPainel hoje={hoje} />
      </Suspense>
    </>
  )
}
