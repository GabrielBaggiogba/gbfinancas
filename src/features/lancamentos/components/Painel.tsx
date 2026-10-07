'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { hojeEmSaoPaulo, inicioDaJanela } from '@/lib/datas'
import { salvarLancamento, type ResultadoSalvar } from '../actions'
import { lancamentoSchema } from '../esquemas'
import { calcularResumo, montarLinhas, temRegistro } from '../resumo'
import type { Lancamento } from '../tipos'
import CartaoDia from './CartaoDia'
import Historico from './Historico'
import Resumo from './Resumo'

type Props = { inicial: Lancamento[]; hoje: string; email: string }
type Fase = 'parado' | 'salvando' | 'salvo' | 'erro'
type Rascunho = { receita: number; despesa: number }

const ERRO_CARTAO = 'Não foi possível salvar. Seus valores continuam aqui; tente de novo.'

const paraMapa = (lista: Lancamento[]) => new Map(lista.map((l) => [l.data, l]))

function movimentoReduzido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function Painel({ inicial, hoje, email }: Props) {
  const router = useRouter()
  const [registros, setRegistros] = useState(() => paraMapa(inicial))
  const [dataSelecionada, setDataSelecionada] = useState(hoje)
  const [rascunho, setRascunho] = useState<Rascunho>(() => {
    const r = paraMapa(inicial).get(hoje)
    return { receita: r?.receitaCentavos ?? 0, despesa: r?.despesaCentavos ?? 0 }
  })
  const [fase, setFase] = useState<Fase>('parado')
  const [mensagemErro, setMensagemErro] = useState('')
  const [pulsoErro, setPulsoErro] = useState(0)
  const [mostrarSalvando, setMostrarSalvando] = useState(false)
  const [ultimaSalva, setUltimaSalva] = useState<{ data: string | null; pulso: number }>({
    data: null,
    pulso: 0,
  })

  const faseRef = useRef<Fase>('parado')
  const timerSalvo = useRef<ReturnType<typeof setTimeout> | null>(null)
  const campoEntrada = useRef<HTMLInputElement | null>(null)
  const cartao = useRef<HTMLFormElement | null>(null)

  function mudarFase(nova: Fase) {
    faseRef.current = nova
    setFase(nova)
  }

  function limparTimerSalvo() {
    if (timerSalvo.current) clearTimeout(timerSalvo.current)
    timerSalvo.current = null
  }

  // Quando o servidor devolve dados novos (após revalidar), refaz o mapa, exceto no meio de um salvamento.
  useEffect(() => {
    if (faseRef.current !== 'salvando') setRegistros(paraMapa(inicial))
  }, [inicial])

  // Voltou para o app em outro dia: atualiza.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && hojeEmSaoPaulo() !== hoje) router.refresh()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [hoje, router])

  useEffect(() => limparTimerSalvo, [])

  const salvoDoDia = registros.get(dataSelecionada)
  const sujo =
    rascunho.receita !== (salvoDoDia?.receitaCentavos ?? 0) ||
    rascunho.despesa !== (salvoDoDia?.despesaCentavos ?? 0)

  const resumo = useMemo(
    () => calcularResumo(Array.from(registros.values()), inicioDaJanela(hoje), hoje),
    [registros, hoje],
  )
  const linhas = useMemo(() => montarLinhas(registros, hoje), [registros, hoje])

  function editar(campo: keyof Rascunho, valor: number) {
    setRascunho((r) => ({ ...r, [campo]: valor }))
    if (faseRef.current === 'erro') {
      mudarFase('parado')
      setMensagemErro('')
    }
  }

  async function salvar() {
    if (faseRef.current === 'salvando') return
    const l: Lancamento = {
      data: dataSelecionada,
      receitaCentavos: rascunho.receita,
      despesaCentavos: rascunho.despesa,
    }
    if (!lancamentoSchema.safeParse(l).success) return

    const anterior = registros.get(l.data)
    limparTimerSalvo()
    setRegistros((m) => new Map(m).set(l.data, l))
    setUltimaSalva((u) => ({ data: l.data, pulso: u.pulso + 1 }))
    setMensagemErro('')
    mudarFase('salvando')
    const timer = setTimeout(() => setMostrarSalvando(true), 300)

    const falhar = (mensagem: string) => {
      setRegistros((m) => {
        const n = new Map(m)
        if (anterior) n.set(l.data, anterior)
        else n.delete(l.data)
        return n
      })
      setUltimaSalva((u) => ({ data: null, pulso: u.pulso }))
      setMensagemErro(
        mensagem && !mensagem.startsWith('Não foi possível salvar') ? mensagem : ERRO_CARTAO,
      )
      setPulsoErro((p) => p + 1)
      mudarFase('erro')
    }

    try {
      // Com a sessão expirada o middleware redireciona a chamada e a action devolve undefined.
      const r = (await salvarLancamento(l)) as ResultadoSalvar | undefined
      if (!r) {
        window.location.assign('/login')
        return
      }
      if (!r.ok) {
        falhar(r.mensagem)
        return
      }
      setRegistros((m) => new Map(m).set(r.lancamento.data, r.lancamento))
      mudarFase('salvo')
      timerSalvo.current = setTimeout(() => {
        if (faseRef.current === 'salvo') mudarFase('parado')
      }, 1600)
    } catch {
      falhar(ERRO_CARTAO)
    } finally {
      clearTimeout(timer)
      setMostrarSalvando(false)
    }
  }

  function selecionarDia(data: string) {
    limparTimerSalvo()
    const r = registros.get(data)
    setDataSelecionada(data)
    setRascunho({ receita: r?.receitaCentavos ?? 0, despesa: r?.despesaCentavos ?? 0 })
    setMensagemErro('')
    mudarFase('parado')
    campoEntrada.current?.focus({ preventScroll: true })
    const el = cartao.current
    if (el) {
      const topoUtil = document.querySelector('.cabecalho')?.getBoundingClientRect().bottom ?? 0
      const r = el.getBoundingClientRect()
      // Só rola quando o cartão não está inteiro na área visível (no desktop ele já está).
      if (r.top < topoUtil || r.bottom > window.innerHeight) {
        el.scrollIntoView({ block: 'start', behavior: movimentoReduzido() ? 'auto' : 'smooth' })
      }
    }
  }

  const botao = (() => {
    if (fase === 'salvando' && mostrarSalvando)
      return { estado: 'carregando' as const, rotulo: 'Salvar', desabilitado: true }
    if (fase === 'salvando')
      return { estado: 'normal' as const, rotulo: 'Salvo', desabilitado: true }
    if (sujo) return { estado: 'normal' as const, rotulo: 'Salvar', desabilitado: false }
    if (fase === 'salvo') return { estado: 'sucesso' as const, rotulo: 'Salvo', desabilitado: true }
    if (temRegistro(salvoDoDia))
      return { estado: 'normal' as const, rotulo: 'Salvo', desabilitado: true }
    return { estado: 'normal' as const, rotulo: 'Salvar', desabilitado: true }
  })()

  return (
    <main className="grade-painel">
      <div className="coluna-esquerda">
        <div className="mov-entra" style={{ ['--i' as string]: 0 }}>
          <Resumo {...resumo} />
        </div>
        <div className="mov-entra" style={{ ['--i' as string]: 1 }}>
          <CartaoDia
            hoje={hoje}
            data={dataSelecionada}
            receita={rascunho.receita}
            despesa={rascunho.despesa}
            aoMudarReceita={(c) => editar('receita', c)}
            aoMudarDespesa={(c) => editar('despesa', c)}
            botao={botao}
            mensagemErro={mensagemErro}
            pulsoErro={pulsoErro}
            aoSalvar={salvar}
            aoVoltar={() => selecionarDia(hoje)}
            campoEntradaRef={campoEntrada}
            cartaoRef={cartao}
          />
        </div>
      </div>

      <div className="mov-entra" style={{ ['--i' as string]: 2 }}>
        <Historico
          linhas={linhas}
          hoje={hoje}
          selecionada={dataSelecionada}
          ultimaSalva={ultimaSalva}
          aoSelecionar={selecionarDia}
        />
      </div>

      <footer className="rodape">Conectado como {email}</footer>
    </main>
  )
}
