export function traduzirErroAuth(erro: {
  code?: string
  status?: number
  message?: string
}): string {
  const codigo = erro.code ?? ''
  if (codigo === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (codigo === 'email_not_confirmed')
    return 'Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.'
  if (codigo === 'user_already_exists' || codigo === 'email_exists')
    return 'Este e-mail já tem conta. Entre com sua senha.'
  if (codigo === 'weak_password') return 'A senha precisa ter pelo menos 6 caracteres.'
  if (codigo === 'signup_disabled') return 'O cadastro está fechado no momento.'
  if (erro.status === 429 || codigo.startsWith('over_'))
    return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  return 'Não foi possível concluir. Tente de novo.'
}
