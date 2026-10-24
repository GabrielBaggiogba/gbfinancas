'use client'

import { BellRing, MessageCircle, Unlink } from 'lucide-react'
import { useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import { useConfirmar } from '@/components/app/Confirmar'
import { useDados } from '@/features/financas/store'
import { Interruptor } from '@/features/financas/telas/formularios'
import { Bloco } from '@/features/financas/telas/partes'
import { desvincularWhatsApp, gerarCodigoWhatsApp, salvarAvisos } from './actions'

const ANTECEDENCIA = [
  { valor: 0, rotulo: 'No dia' },
  { valor: 1, rotulo: '1 dia antes' },
  { valor: 2, rotulo: '2 dias antes' },
  { valor: 3, rotulo: '3 dias antes' },
  { valor: 5, rotulo: '5 dias antes' },
  { valor: 7, rotulo: '1 semana antes' },
]

const telefoneBonito = (t: string) =>
  t.length === 13 ? `+${t.slice(0, 2)} (${t.slice(2, 4)}) ${t.slice(4, 9)}-${t.slice(9)}` : `+${t}`

/** Lembretes de contas (e-mail e WhatsApp) e o vínculo do número de WhatsApp. */
export default function BlocoAvisos() {
  const { avisos, demo } = useDados()
  const avisar = useAvisar()
  const confirmar = useConfirmar()
  const [prefs, setPrefs] = useState(avisos.preferencias)
  const [codigo, setCodigo] = useState<string | null>(null)

  const titulo = (
    <span className="flex items-center gap-2">
      <BellRing size={18} aria-hidden="true" /> Lembretes e WhatsApp
    </span>
  )
  if (demo)
    return (
      <Bloco titulo={titulo}>
        <p className="text-t2">
          Receba aviso das contas por e-mail e no WhatsApp, e lance gastos mandando mensagem.
          Indisponível no modo demonstração.
        </p>
      </Bloco>
    )
  if (!prefs) return null

  const salvar = async (novo: Partial<typeof prefs>) => {
    const antes = prefs
    const proximo = { ...prefs, ...novo }
    setPrefs(proximo)
    const r = await salvarAvisos({
      avisos_email: proximo.avisos_email,
      avisos_whatsapp: proximo.avisos_whatsapp,
      antecedencia_dias: proximo.antecedencia_dias,
    }).catch(() => null)
    if (!r?.ok) {
      setPrefs(antes)
      avisar({ tipo: 'erro', texto: r && !r.ok ? r.mensagem : 'Sem conexão. Tente de novo.' })
    }
  }

  const gerar = async () => {
    const r = await gerarCodigoWhatsApp().catch(() => null)
    if (r?.ok) setCodigo(r.codigo)
    else avisar({ tipo: 'erro', texto: r && !r.ok ? r.mensagem : 'Sem conexão. Tente de novo.' })
  }

  const desvincular = async () => {
    const ok = await confirmar({
      titulo: 'Desvincular o WhatsApp?',
      texto:
        'Este número deixa de lançar e de receber lembretes. Você pode vincular de novo depois.',
      acao: 'Desvincular',
      perigo: true,
    })
    if (!ok) return
    const r = await desvincularWhatsApp().catch(() => null)
    if (r?.ok) setPrefs({ ...prefs, telefone: null })
    else avisar({ tipo: 'erro', texto: r && !r.ok ? r.mensagem : 'Sem conexão. Tente de novo.' })
  }

  const bot = avisos.numeroBot
  return (
    <Bloco titulo={titulo}>
      <p className="text-t2">
        Avisos das contas recorrentes a pagar e a receber, enviados toda manhã.
      </p>
      <div className="mt-2">
        <Interruptor
          rotulo="Avisos por e-mail"
          descricao={avisos.email ? undefined : 'Ainda não configurado no servidor.'}
          ligado={prefs.avisos_email}
          aoMudar={(v) => void salvar({ avisos_email: v })}
        />
        <Interruptor
          rotulo="Avisos no WhatsApp"
          descricao={prefs.telefone ? undefined : 'Vincule seu número abaixo.'}
          ligado={prefs.avisos_whatsapp}
          aoMudar={(v) => void salvar({ avisos_whatsapp: v })}
        />
        <label className="flex items-center justify-between gap-4 py-2">
          <span className="font-[560]">Avisar</span>
          <select
            className="controle w-auto"
            value={prefs.antecedencia_dias}
            onChange={(e) => void salvar({ antecedencia_dias: Number(e.target.value) })}
          >
            {ANTECEDENCIA.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 border-t border-linha pt-4">
        <p className="flex items-center gap-2 font-[620]">
          <MessageCircle size={18} aria-hidden="true" className="text-menta" /> Lançar pelo WhatsApp
        </p>
        {!avisos.whatsapp || !bot ? (
          <p className="miudo mt-1">Em breve: mande um gasto por mensagem e ele entra aqui.</p>
        ) : prefs.telefone ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-t2">Vinculado a {telefoneBonito(prefs.telefone)}</span>
            <a
              className="b b-suave ml-auto"
              href={`https://wa.me/${bot}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir conversa
            </a>
            <button
              type="button"
              className="b b-fantasma b-icone"
              onClick={() => void desvincular()}
              aria-label="Desvincular WhatsApp"
              title="Desvincular"
            >
              <Unlink size={17} aria-hidden="true" />
            </button>
          </div>
        ) : codigo ? (
          <div className="mt-2 grid gap-2">
            <p className="text-t2">
              Envie <b className="num text-t1">GB {codigo}</b> para o WhatsApp do GBFinanças. O
              código vale 15 minutos.
            </p>
            <a
              className="b b-primario"
              href={`https://wa.me/${bot}?text=${encodeURIComponent(`GB ${codigo}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={17} aria-hidden="true" /> Abrir o WhatsApp
            </a>
          </div>
        ) : (
          <button type="button" className="b b-primario mt-2" onClick={() => void gerar()}>
            <MessageCircle size={17} aria-hidden="true" /> Vincular meu WhatsApp
          </button>
        )}
      </div>
    </Bloco>
  )
}
