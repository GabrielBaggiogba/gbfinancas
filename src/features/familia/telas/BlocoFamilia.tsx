'use client'

import { Copy, LogOut, UserMinus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import { useConfirmar } from '@/components/app/Confirmar'
import { Bloco } from '@/features/financas/telas/partes'
import { useDados } from '@/features/financas/store'
import { criarConvite, removerMembro, sairDaFamilia } from '../actions'

const titulo = (
  <span className="flex items-center gap-2">
    <Users size={18} aria-hidden="true" /> Família
  </span>
)

/** Gestão compartilhada: convidar pessoas, ver quem participa, remover ou sair. */
export default function BlocoFamilia() {
  const { familia, demo } = useDados()
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const [link, setLink] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (demo)
    return (
      <Bloco titulo={titulo}>
        <p className="text-t2">
          Convide quem divide as contas com você para lançar nas mesmas finanças. Indisponível no
          modo demonstração.
        </p>
      </Bloco>
    )
  if (!familia.disponivel) return null

  const falhou = (r: { ok: boolean; mensagem?: string } | null) => {
    if (r?.ok) return false
    avisar({ tipo: 'erro', texto: r?.mensagem ?? 'Sem conexão. Tente de novo.' })
    return true
  }

  const convidar = async () => {
    setOcupado(true)
    const r = await criarConvite().catch(() => null)
    setOcupado(false)
    if (!falhou(r) && r?.ok) setLink(r.link)
  }

  const copiar = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      avisar({ tipo: 'ok', texto: 'Link copiado' })
    } catch {
      avisar({ tipo: 'erro', texto: 'Não deu para copiar. Selecione o link e copie.' })
    }
  }

  const remover = async (id: string, email: string) => {
    const ok = await confirmar({
      titulo: `Remover ${email}?`,
      texto:
        'A pessoa deixa de ver e lançar nas suas finanças. Os lançamentos que ela fez continuam.',
      acao: 'Remover',
      perigo: true,
    })
    if (!ok) return
    if (!falhou(await removerMembro(id).catch(() => null))) window.location.reload()
  }

  const sair = async () => {
    const ok = await confirmar({
      titulo: 'Sair da família?',
      texto: `Você deixa de ver as finanças de ${familia.donoEmail} e volta para as suas.`,
      acao: 'Sair',
      perigo: true,
    })
    if (!ok) return
    if (!falhou(await sairDaFamilia().catch(() => null))) window.location.assign('/')
  }

  if (familia.papel === 'membro')
    return (
      <Bloco titulo={titulo}>
        <p className="text-t2">
          Você está usando as finanças de <b className="text-t1">{familia.donoEmail}</b>. Tudo o que
          você lança aparece para a família.
        </p>
        <ul className="mt-3 grid gap-1.5 text-[.9375rem]">
          {familia.membros.map((m) => (
            <li key={m.id} className="truncate text-t2">
              {m.email}
            </li>
          ))}
        </ul>
        <button type="button" className="b b-suave mt-4" onClick={() => void sair()}>
          <LogOut size={17} aria-hidden="true" /> Sair da família
        </button>
      </Bloco>
    )

  const cheia = familia.membros.length >= 4
  return (
    <Bloco titulo={titulo}>
      <p className="text-t2">
        Convide quem divide as contas com você. Cada pessoa entra com o próprio login e lança nas
        mesmas finanças; você vê quem lançou cada gasto. Até 5 pessoas.
      </p>
      {familia.membros.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {familia.membros.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-xl bg-painel2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">{m.email}</span>
              <button
                type="button"
                className="b b-fantasma b-icone -my-1"
                onClick={() => void remover(m.id, m.email)}
                aria-label={`Remover ${m.email}`}
                title="Remover da família"
              >
                <UserMinus size={17} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {link ? (
        <div className="mt-4 grid gap-2">
          <label className="miudo" htmlFor="link-convite">
            Envie este link para a pessoa. Vale por 7 dias e serve para uma pessoa.
          </label>
          <div className="flex gap-2">
            <input
              id="link-convite"
              readOnly
              value={link}
              className="controle min-w-0 flex-1"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="b b-primario" onClick={() => void copiar()}>
              <Copy size={17} aria-hidden="true" /> Copiar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="b b-primario mt-4"
          disabled={ocupado || cheia}
          onClick={() => void convidar()}
        >
          <UserPlus size={17} aria-hidden="true" />
          {cheia ? 'Família completa' : 'Convidar pessoa'}
        </button>
      )}
    </Bloco>
  )
}
