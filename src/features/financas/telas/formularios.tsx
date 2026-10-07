'use client'

import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import Folha from '@/components/app/Folha'
import { ICONES } from '@/components/app/Icones'
import { Faisca } from '@/components/motion/Efeitos'
import { MOLA_RAPIDA } from '@/components/motion/molas'
import { CORES, COR_NEUTRA } from '../padroes'

/** Guarda o item em edição de uma folha. `chave` muda a cada abertura para zerar o formulário. */
export function useFolha<T>() {
  const [estado, setEstado] = useState<{ item: T; chave: number } | null>(null)
  const [aberta, setAberta] = useState(false)
  const abrir = useCallback((item: T) => {
    setEstado((e) => ({ item, chave: (e?.chave ?? 0) + 1 }))
    setAberta(true)
  }, [])
  const fechar = useCallback(() => setAberta(false), [])
  return { aberta, item: estado?.item ?? null, chave: estado?.chave ?? 0, abrir, fechar }
}

/** Folha com formulário: mostra o erro com a tremida do não e o botão de salvar com faíscas. */
export function FolhaDeFormulario({
  aberta,
  aoFechar,
  titulo,
  aoSalvar,
  children,
  extra,
  rotuloSalvar = 'Salvar',
}: {
  aberta: boolean
  aoFechar: () => void
  titulo: string
  /** Devolve uma mensagem de erro, ou nada quando deu certo. */
  aoSalvar: () => string | void
  children: ReactNode
  extra?: ReactNode
  rotuloSalvar?: string
}) {
  const [erro, setErro] = useState('')
  const [pulso, setPulso] = useState(0)
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const mensagem = aoSalvar()
    if (mensagem) {
      setErro(mensagem)
      setPulso((p) => p + 1)
    } else setErro('')
  }
  return (
    <Folha
      aberta={aberta}
      aoFechar={() => {
        setErro('')
        aoFechar()
      }}
      titulo={titulo}
    >
      <form noValidate onSubmit={enviar} className="flex min-h-full flex-col">
        <div key={pulso} className={`flex flex-col gap-4 ${pulso > 0 && erro ? 'mov-nega' : ''}`}>
          {children}
          {erro && (
            <p role="alert" className="text-[.9375rem] text-erro">
              {erro}
            </p>
          )}
        </div>
        <div className="mt-6 flex gap-2">
          {extra}
          <Faisca className="flex-1">
            <button type="submit" className="b b-primario b-grande w-full">
              {rotuloSalvar}
            </button>
          </Faisca>
        </div>
      </form>
    </Folha>
  )
}

/** Interruptor com o polegar em mola. */
export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  descricao,
}: {
  ligado: boolean
  aoMudar: (v: boolean) => void
  rotulo: string
  descricao?: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block font-[560]">{rotulo}</span>
        {descricao && <span className="miudo block">{descricao}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={rotulo}
        className="interruptor"
        onClick={() => aoMudar(!ligado)}
      >
        <motion.i layout transition={MOLA_RAPIDA} />
      </button>
    </label>
  )
}

export function SeletorDeCor({ valor, aoMudar }: { valor: string; aoMudar: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
      {[...CORES, COR_NEUTRA].map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={valor === c}
          aria-label={`Cor ${c}`}
          className="amostra"
          style={{ ['--c' as string]: c }}
          onClick={() => aoMudar(c)}
        >
          {valor === c && <Check size={16} aria-hidden="true" />}
        </button>
      ))}
    </div>
  )
}

export function SeletorDeIcone({
  valor,
  cor,
  aoMudar,
}: {
  valor: string
  cor: string
  aoMudar: (i: string) => void
}) {
  return (
    <div
      className="grid grid-cols-9 gap-1.5 max-[420px]:grid-cols-7"
      role="radiogroup"
      aria-label="Ícone"
    >
      {Object.entries(ICONES).map(([chave, I]) => (
        <button
          key={chave}
          type="button"
          role="radio"
          aria-checked={valor === chave}
          aria-label={chave}
          className="icone-opcao"
          style={{ ['--c' as string]: cor }}
          onClick={() => aoMudar(chave)}
        >
          <I size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
