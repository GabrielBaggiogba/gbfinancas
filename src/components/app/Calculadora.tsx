'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Calculator, Delete, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MOLA_RAPIDA, MOLA_VIVA } from '@/components/motion/molas'
import { calcular, formatarResultado } from '@/lib/calculadora'

const TECLAS = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', ',', '%', '='],
]
const OPERADOR = /^[÷×−+%()]$/

/**
 * Botão no canto inferior direito que abre uma calculadora flutuante. Não é modal: a tela
 * continua visível e clicável, para conferir os valores enquanto calcula.
 */
export default function Calculadora() {
  const [aberta, setAberta] = useState(false)
  const [conta, setConta] = useState('')
  const campo = useRef<HTMLInputElement>(null)
  const resultado = calcular(conta)

  useEffect(() => {
    if (aberta) campo.current?.focus({ preventScroll: true })
  }, [aberta])

  const resolver = () => {
    if (resultado !== null) setConta(formatarResultado(resultado))
  }

  const apertar = (tecla: string) => {
    if (tecla === 'C') setConta('')
    else if (tecla === '=') resolver()
    else setConta((c) => c + tecla)
    campo.current?.focus({ preventScroll: true })
  }

  return (
    <div className="calc nao-imprimir">
      <AnimatePresence>
        {aberta && (
          <motion.div
            role="dialog"
            aria-label="Calculadora"
            className="calc-painel"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: MOLA_VIVA }}
            exit={{ opacity: 0, scale: 0.94, y: 8, transition: MOLA_RAPIDA }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setAberta(false)
              }
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="titulo-secao text-[1rem]">Calculadora</h2>
              <button
                type="button"
                className="b b-fantasma b-icone -mr-2"
                onClick={() => setAberta(false)}
                aria-label="Fechar calculadora"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="calc-visor">
              <div className="flex items-center gap-1">
                <input
                  ref={campo}
                  className="num"
                  // Sem teclado virtual: no celular a conta é feita nas teclas da calculadora.
                  inputMode="none"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Conta"
                  placeholder="0"
                  value={conta}
                  onChange={(e) => setConta(e.target.value.replace(/[^\d.,+\-−*x×/÷:%() ]/gi, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === '=') {
                      e.preventDefault()
                      resolver()
                    }
                  }}
                />
                <button
                  type="button"
                  className="b b-fantasma b-icone"
                  onClick={() => setConta((c) => c.slice(0, -1))}
                  aria-label="Apagar o último caractere"
                >
                  <Delete size={18} aria-hidden="true" />
                </button>
              </div>
              <p className="num calc-resultado" aria-live="polite">
                {conta.trim() === ''
                  ? ' '
                  : resultado === null
                    ? 'Conta incompleta'
                    : `= ${resultado.toLocaleString('pt-BR', { maximumFractionDigits: 10 })}`}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TECLAS.flat().map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`b calc-tecla ${
                    t === '=' ? 'b-primario' : OPERADOR.test(t) || t === 'C' ? 'b-realce' : 'b-suave'
                  }`}
                  aria-label={t === 'C' ? 'Limpar' : undefined}
                  onClick={() => apertar(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="calc-botao"
        aria-label={aberta ? 'Fechar calculadora' : 'Abrir calculadora'}
        aria-expanded={aberta}
        title="Calculadora"
        onClick={() => setAberta((a) => !a)}
      >
        {aberta ? <X size={22} aria-hidden="true" /> : <Calculator size={22} aria-hidden="true" />}
      </button>
    </div>
  )
}
