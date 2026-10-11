'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import AnelMarca from '@/components/ui/AnelMarca'
import Botao from '@/components/ui/Botao'
import CampoTexto from '@/components/ui/CampoTexto'
import Grainient from '@/components/ui/Grainient'
import Marca from '@/components/ui/Marca'
import { cadastrar, entrar } from '../actions'
import { cadastroSchema, credenciaisSchema } from '../esquemas'

type Props = { aviso?: 'confirmado'; erroLink?: boolean; demo: boolean }
type ModoForm = 'entrar' | 'cadastrar'

const indice = (i: number) => ({ ['--i' as string]: i })

export default function FormularioAuth({ aviso, erroLink, demo }: Props) {
  const [modo, setModo] = useState<ModoForm>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState('')
  const [pulsoErro, setPulsoErro] = useState(0)
  const [confirmarEmail, setConfirmarEmail] = useState<string | null>(null)

  function falhar(mensagem: string) {
    setErro(mensagem)
    setPulsoErro((p) => p + 1)
    setPendente(false)
  }

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pendente) return
    const schema = modo === 'cadastrar' ? cadastroSchema : credenciaisSchema
    const analise = schema.safeParse({ email, senha })
    if (!analise.success) {
      setErro(analise.error.issues[0].message)
      setPulsoErro((p) => p + 1)
      return
    }
    setErro('')
    setPendente(true)
    try {
      const acao = modo === 'entrar' ? entrar : cadastrar
      const resultado = await acao({ email: analise.data.email, senha })
      if (!resultado) return // redirecionou: mantém o botão ocupado
      if (!resultado.ok) {
        falhar(resultado.mensagem)
        return
      }
      setConfirmarEmail(resultado.email)
      setPendente(false)
    } catch {
      falhar('Sem conexão com o servidor. Tente de novo.')
    }
  }

  function trocarModo(novo: ModoForm) {
    setModo(novo)
    setErro('')
  }

  const mensagemAviso = demo
    ? 'Modo demonstração · qualquer e-mail e senha entram'
    : erroLink
      ? 'Link inválido ou expirado. Tente entrar ou crie a conta de novo.'
      : aviso === 'confirmado'
        ? 'E-mail confirmado. Entre com sua senha.'
        : null

  return (
    <main className="palco-auth">
      <Grainient className="fundo-auth" />
      <div className="cartao-vidro">
        <div className="mov-entra mb-8 flex flex-col items-center text-center" style={indice(0)}>
          <div className="selo-marca">
            <Marca tamanho={30} />
          </div>
          <h1 className="mt-4 text-[1.75rem] font-[650] leading-[1.1] tracking-[-0.03em]">
            {modo === 'entrar' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="mt-2 text-t2">
            {modo === 'entrar'
              ? 'Entre para continuar no GBFinanças'
              : 'Comece a organizar seu dinheiro no GBFinanças'}
          </p>
        </div>

        {mensagemAviso && !confirmarEmail && (
          <div className="mov-entra mb-5" style={indice(1)}>
            <p className="pilula mov-pilula" role="status">
              {mensagemAviso}
            </p>
          </div>
        )}
        {demo && (erroLink || aviso) && !confirmarEmail && (
          <div className="mb-5">
            <p className="pilula mov-pilula" role="status">
              {erroLink
                ? 'Link inválido ou expirado. Tente entrar ou crie a conta de novo.'
                : 'E-mail confirmado. Entre com sua senha.'}
            </p>
          </div>
        )}

        {confirmarEmail ? (
          <div className="mov-entra flex flex-col items-start" style={indice(2)}>
            <div className="text-gelo">
              <AnelMarca tamanho={72} />
            </div>
            <h2 className="mt-5 text-[1.25rem] font-[650] leading-[1.2] tracking-[-0.02em]">
              Confira seu e-mail
            </h2>
            <p className="mb-6 mt-2 break-words text-t2">
              Enviamos um link de confirmação para {confirmarEmail}. Abra o link neste aparelho para
              entrar. Se você já tem conta com este e-mail, entre com sua senha.
            </p>
            <Botao
              variante="fantasma"
              className="-ml-[14px]"
              onClick={() => {
                setConfirmarEmail(null)
                setModo('entrar')
                setSenha('')
              }}
            >
              Voltar para entrar
            </Botao>
          </div>
        ) : (
          <>
            <form noValidate onSubmit={aoEnviar} className="mov-entra" style={indice(2)}>
              <div key={pulsoErro} className={pulsoErro > 0 ? 'mov-nega' : undefined}>
                <div className="flex flex-col gap-3">
                  <CampoTexto
                    id="email"
                    rotulo="E-mail"
                    icone={<Mail size={18} aria-hidden="true" />}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <CampoTexto
                    id="senha"
                    rotulo="Senha"
                    icone={<Lock size={18} aria-hidden="true" />}
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    legenda={modo === 'cadastrar' ? 'Pelo menos 8 caracteres.' : undefined}
                    acao={
                      <button
                        type="button"
                        className="toque relative z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-xl text-t2"
                        aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                        aria-pressed={mostrarSenha}
                        onClick={() => setMostrarSenha((v) => !v)}
                      >
                        {mostrarSenha ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    }
                  />
                </div>

                {erro && (
                  <p role="alert" className="mt-4 text-[.9375rem] text-erro">
                    {erro}
                  </p>
                )}

                <Botao
                  variante="primario"
                  type="submit"
                  className="mt-5"
                  estado={pendente ? 'carregando' : 'normal'}
                  rotuloCarregando={modo === 'entrar' ? 'Entrando' : 'Criando conta'}
                >
                  {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
                  <ArrowRight size={20} aria-hidden="true" className="seta-btn" />
                </Botao>
              </div>
            </form>

            <p className="mov-entra mt-7 text-center text-[.9375rem] text-t2" style={indice(3)}>
              {modo === 'entrar' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button
                type="button"
                className="elo"
                onClick={() => trocarModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}
              >
                {modo === 'entrar' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
