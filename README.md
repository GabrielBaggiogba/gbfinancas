# GBFinanças

Controle financeiro pessoal de uma tela só: a pessoa anota a entrada e a saída do dia, vê o saldo acumulado e o histórico dos últimos 30 dias. Sem categorias, sem gráficos, sem conexão bancária. Tema preto com azul claro, feito para o celular.

**Produção:** https://gbfinancas.vercel.app

## Funcionalidades

- Login e cadastro com e-mail e senha.
- Painel com saldo, entradas e saídas dos últimos 30 dias.
- Dois campos por dia (entrada e saída), com máscara de centavos e botão grande de salvar.
- Histórico dos últimos 30 dias. Tocar numa linha carrega aquele dia no mesmo cartão para corrigir.
- Funciona com a confirmação de e-mail do Supabase ligada ou desligada.
- Pode ser instalado na tela inicial do celular.

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind 3 · Supabase · Zod · Vercel

## Ver sem Supabase

```bash
npm install
npm run demo
```

Abra http://localhost:3000 e entre com qualquer e-mail e senha. Os dados ficam em cookies do navegador, não em um banco. O modo demonstração só existe sem Supabase configurado e fora de produção na Vercel.

## Rodando localmente

1. `git clone <repo> && cd gbfinancas`
2. `npm install`
3. Copie `.env.example` para `.env.local` e preencha (veja abaixo)
4. `npm run dev` e abra http://localhost:3000

Sem as variáveis do Supabase, o app mostra a tela `/configuracao` com o que falta.

## Supabase

### Opção A: pelo painel

1. Crie um projeto em supabase.com.
2. No SQL Editor, cole e rode `supabase/migrations/20261006000000_cria_lancamentos_diarios.sql`.
3. (Opcional) crie uma conta no app e rode `supabase/seed.sql` para ter 14 dias de exemplo.
4. Em Project Settings, API, copie a URL e a chave pública para o `.env.local`.

### Opção B: pela CLI

```bash
npx supabase init
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase gen types typescript --linked > src/types/database.types.ts
```

### Authentication

Em Authentication, URL Configuration:

- **Site URL:** a URL de produção (ou `http://localhost:3000` durante o desenvolvimento).
- **Redirect URLs:** `http://localhost:3000/**` e a URL da Vercel com `/**`.

## Variáveis de ambiente

| Variável                        | Para que serve                                        | Onde pegar                      |
| ------------------------------- | ----------------------------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | endereço do projeto                                   | Supabase, Project Settings, API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (a nova "publishable key" também serve) | Supabase, Project Settings, API |
| `NEXT_PUBLIC_SITE_URL`          | opcional, endereço do site para o link de confirmação | sua URL de produção             |
| `GBF_MODO_DEMO`                 | opcional, `1` liga o modo demonstração                | só para desenvolvimento         |

## GitHub

Este repositório foi criado só localmente: o `gh` do ambiente de construção não estava autenticado, então nada foi enviado. Para publicar:

1. Crie um repositório privado vazio no GitHub.
2. `git remote add origin git@github.com:<usuario>/gbfinancas.git`
3. `git push -u origin main`

## Vercel

Também não foi feito. Para publicar:

1. Em vercel.com, importe o repositório do GitHub.
2. Adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em Settings, Environment Variables.
3. Se o projeto Supabase estiver em São Paulo, escolha a região `gru1` para as funções.
4. Depois do primeiro deploy, volte ao Supabase e ponha a URL da Vercel em Site URL e Redirect URLs.

A partir daí, cada push na `main` publica sozinho.

## Estrutura

- `src/app`: páginas, rotas, manifesto e ícones
- `src/components`: peças de interface sem regra de negócio
- `src/features/auth`: login, cadastro e sessão
- `src/features/lancamentos`: painel, resumo, histórico e acesso aos dados
- `src/lib`: dinheiro, datas, modo de execução e clientes Supabase
- `supabase/migrations`: banco de dados versionado

## Suposições

- Resumo acumulado: saldo, entradas e saídas dos últimos 30 dias, incluindo hoje, a mesma janela do histórico.
- O dia pode ser corrigido por até 30 dias. O servidor recusa datas fora da janela.
- Os valores do dia substituem o que estava salvo, não somam.
- Trocar de dia com valores não salvos descarta o rascunho, sem confirmação.
- Não há botão de excluir: zerar os dois campos e salvar equivale a apagar (o dia zerado some do histórico).
- Dias anteriores ao primeiro registro não aparecem no histórico.
- Fuso fixo `America/Sao_Paulo`.
- Valores guardados como `numeric(12,2)` e somados em centavos inteiros.
- Sem shadcn/ui: são poucas telas e poucos componentes.
- Sem cliente Supabase no navegador: tudo passa por Server Components e Server Actions.

## Avisos

- `npm audit` pode acusar avisos do Next 14. Não rode `npm audit fix --force`, porque isso sobe a versão maior do Next.
- Recuperação de senha não existe ainda.

## Próximos passos

- Recuperar senha
- Exportar CSV
- Fuso configurável por usuário
- Atualizar para Next 15 ou 16
