import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProvedorDeAvisos } from '@/components/app/Avisos'
import Casca from '@/components/app/Casca'
import { ProvedorDeConfirmacao } from '@/components/app/Confirmar'
import { ProvedorDePreferencias, type Tema } from '@/components/app/Preferencias'
import { obterUsuario } from '@/features/auth/sessao'
import { ProvedorDoEditor } from '@/features/financas/components/Editor'
import { carregarDados } from '@/features/financas/servidor/carregar'
import { ProvedorDeDados } from '@/features/financas/store'
import { hojeEmSaoPaulo } from '@/lib/datas'
import { obterModo } from '@/lib/modo'
import './app.css'

// Área logada. Os dados são lidos uma vez aqui e ficam no cliente: trocar de tela
// não volta ao servidor, então a navegação é instantânea.
export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const modo = obterModo()
  if (modo === 'pendente') redirect('/configuracao')
  const usuario = await obterUsuario()
  if (!usuario) redirect('/login')

  const dados = await carregarDados(usuario)
  const loja = await cookies()
  const tema = loja.get('gbf_tema')?.value
  const prefs = {
    tema: (tema === 'claro' || tema === 'escuro' ? tema : 'sistema') as Tema,
    compacto: loja.get('gbf_compacto')?.value === '1',
    ocultar: loja.get('gbf_ocultar')?.value === '1',
  }

  return (
    <ProvedorDePreferencias inicial={prefs}>
      <ProvedorDeAvisos>
        <ProvedorDeConfirmacao>
          <ProvedorDeDados
            inicial={dados}
            hoje={hojeEmSaoPaulo()}
            email={usuario.email}
            demo={modo === 'demo'}
          >
            <ProvedorDoEditor>
              <Casca>{children}</Casca>
            </ProvedorDoEditor>
          </ProvedorDeDados>
        </ProvedorDeConfirmacao>
      </ProvedorDeAvisos>
    </ProvedorDePreferencias>
  )
}
