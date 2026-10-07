import { redirect } from 'next/navigation'
import Botao from '@/components/ui/Botao'
import Marca from '@/components/ui/Marca'
import { sair } from '@/features/auth/actions'
import { obterUsuario } from '@/features/auth/sessao'
import Painel from '@/features/lancamentos/components/Painel'
import { obterRepositorio } from '@/features/lancamentos/repositorio'
import { hojeEmSaoPaulo, inicioDaJanela } from '@/lib/datas'
import { obterModo } from '@/lib/modo'

export default async function Inicio() {
  const modo = obterModo()
  if (modo === 'pendente') redirect('/configuracao')

  const hoje = hojeEmSaoPaulo()
  const [usuario, lista] = await Promise.all([
    obterUsuario(),
    obterRepositorio()
      .listarPeriodo(inicioDaJanela(hoje), hoje)
      .catch((e: unknown) => e),
  ])
  if (!usuario) redirect('/login')
  if (lista instanceof Error) throw lista
  if (!Array.isArray(lista)) throw new Error('Não foi possível carregar os lançamentos.')

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
          <p className="pilula mov-pilula" role="status">
            Modo demonstração · os dados ficam só neste navegador
          </p>
        </div>
      )}
      <Painel key={hoje} inicial={lista} hoje={hoje} email={usuario.email} />
    </>
  )
}
