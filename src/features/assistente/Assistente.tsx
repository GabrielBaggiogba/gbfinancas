'use client'

import { SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Folha from '@/components/app/Folha'
import Mascote from '@/components/ui/Mascote'
import { useDados } from '@/features/financas/store'
import { perguntar } from './actions'
import type { Mensagem } from './perguntar'
import { resumoParaAssistente } from './resumo'

const SUGESTOES = [
  'Quanto sobrou do meu salário este mês?',
  'Onde estou gastando mais?',
  'Posso gastar R$ 200 em um tênis este mês?',
  'Quais são minhas próximas contas?',
  'Como posso economizar mais?',
]

/** **negrito** vira <b>; o resto é texto puro (sem HTML vindo da resposta). */
function formatar(texto: string): ReactNode[] {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .map((parte, i) =>
      parte.startsWith('**') && parte.endsWith('**') ? <b key={i}>{parte.slice(2, -2)}</b> : parte,
    )
}

/** Pergunte ao Grão: conversa sobre as próprias finanças, respondida pela IA. */
export default function Assistente() {
  const { dados, hoje, ia } = useDados()
  const [aberta, setAberta] = useState(false)
  const [conversa, setConversa] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = useRef<HTMLDivElement>(null)

  // Corpo em bloco: scrollIntoView pode devolver uma Promise, e o efeito não pode devolver nada.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [conversa, pensando])
  if (!ia) return null

  const enviar = async (pergunta: string) => {
    const p = pergunta.trim()
    if (!p || pensando) return
    const nova: Mensagem = { papel: 'pessoa', texto: p }
    // Ímpar, para a conversa sempre começar e terminar com a pessoa.
    const historico = [...conversa, nova].slice(-19)
    setConversa(historico)
    setTexto('')
    setErro('')
    setPensando(true)
    const r = await perguntar({ resumo: resumoParaAssistente(dados, hoje), historico }).catch(
      () => null,
    )
    setPensando(false)
    if (r?.ok) setConversa([...historico, { papel: 'grao' as const, texto: r.resposta }])
    else {
      // Devolve a pergunta para a caixa, para tentar de novo.
      setConversa(conversa)
      setTexto(p)
      setErro(r && !r.ok ? r.mensagem : 'Sem conexão. Tente de novo.')
    }
  }

  const aoEnviar = (e: FormEvent) => {
    e.preventDefault()
    void enviar(texto)
  }

  return (
    <>
      <button
        type="button"
        className="b b-suave"
        onClick={() => setAberta(true)}
        title="Pergunte ao Grão sobre o seu dinheiro"
      >
        <Mascote tamanho={22} animado={false} />
        <span className="max-[1440px]:sr-only">Pergunte ao Grão</span>
      </button>

      <Folha
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Pergunte ao Grão"
        pe={
          <form onSubmit={aoEnviar} className="flex w-full gap-2">
            <input
              data-autofoco
              className="controle min-w-0 flex-1"
              maxLength={2000}
              placeholder="Pergunte sobre o seu dinheiro"
              aria-label="Sua pergunta"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button
              type="submit"
              className="b b-primario b-icone"
              disabled={pensando || !texto.trim()}
              aria-label="Enviar pergunta"
            >
              <SendHorizontal size={18} aria-hidden="true" />
            </button>
          </form>
        }
      >
        <div className="grid gap-3" aria-live="polite">
          {conversa.length === 0 && (
            <div className="flex flex-col items-center text-center">
              <Mascote tamanho={88} />
              <p className="mt-2 font-[650]">Oi! Eu sou o Grão.</p>
              <p className="mt-1 text-t2">
                Pergunte qualquer coisa sobre o seu dinheiro. Eu olho seus lançamentos, contas,
                cartões e metas para responder.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full bg-painel2 px-3 py-1.5 text-[.875rem] font-[560] shadow-[inset_0_0_0_1px_var(--linha)]"
                    onClick={() => void enviar(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {conversa.map((m, i) =>
            m.papel === 'pessoa' ? (
              <p
                key={i}
                className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-menta px-3.5 py-2 text-tinta"
              >
                {m.texto}
              </p>
            ) : (
              <div key={i} className="flex max-w-[92%] items-end gap-2">
                <Mascote tamanho={30} animado={false} className="flex-none" />
                <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-painel2 px-3.5 py-2.5">
                  {formatar(m.texto)}
                </p>
              </div>
            ),
          )}
          {pensando && (
            <div className="flex items-center gap-2 text-t2">
              <Mascote tamanho={30} humor="pensando" />
              <span className="mov-espera">Pensando</span>
            </div>
          )}
          {erro && (
            <p role="alert" className="text-erro">
              {erro}
            </p>
          )}
          <div ref={fim} />
        </div>
      </Folha>
    </>
  )
}
