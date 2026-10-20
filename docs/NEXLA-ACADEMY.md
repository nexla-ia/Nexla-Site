# Nexla Academy: onde paramos

Documento de passagem para continuar o desenvolvimento. Base: o briefing "Plataforma de Cursos Nexla" (19/10/2026).
Última atualização: 20/10/2026.

## Situação em uma frase

A área do aluno está pronta e funcionando com o Supabase: login, painel, curso, certificado, perfil, vitrine, comunidade, avaliações e painel admin de conteúdo. **Ainda não existe venda** (Asaas), nem vídeo de verdade, e-mails ou métricas.

## Onde está o código

- **Branch:** `feat/academy`. Não foi enviada (sem push) nem juntada na `main`.
- **Endereço:** `nexla.com.br/academy`, com entrada própria e separada do site: `academy/index.html` + `src/academy/`.
- **Banco:** Supabase, com as tabelas prefixadas `academy_` para não conflitar com outros sistemas no mesmo projeto. Os scripts estão em `supabase/`.

### Mapa dos arquivos (`src/academy/`)

| Arquivo | O que faz |
|---|---|
| `main.tsx` | Rotas e proteção: deslogado vai para o login; logado em tela pública vai para o painel |
| `router.tsx` | Roteador próprio com base `/academy` (`navegar`, `Link`, `useRota`) |
| `supabase.ts` | Cliente Supabase (só chave anon), sessão, mensagens de erro em português e `CERTIFICADO_MIN = 90` |
| `dados.ts` | Carrega os cursos do aluno, o progresso, a vitrine e as médias de estrelas (usado no painel, em Explorar e em Certificados) |
| `ui.tsx` / `AppLayout.tsx` | Visual comum: telas de acesso, topo com menu do perfil, barras de progresso |
| `Login.tsx`, `CriarConta.tsx` | Entrar e cadastrar (nome, e-mail, WhatsApp, senha, termos e consentimento de marketing) |
| `Painel.tsx` | Boas-vindas, resumo, "Continue de onde parou", meus cursos, "Você também pode gostar" |
| `Curso.tsx` | Aulas, marcar como concluída, materiais, comunidade, parabéns ao concluir, pedido de avaliação |
| `Certificado.tsx`, `certificadoCanvas.ts`, `Certificados.tsx` | Certificado em PDF/PNG a partir de 90% e a lista de certificados |
| `Explorar.tsx` | Vitrine de todos os cursos publicados |
| `Perfil.tsx` | Dados pessoais, senha e pedido de exclusão (LGPD) |
| `Comunidade.tsx`, `Avaliacao.tsx` | Comentários por aula e avaliação do curso com estrelas |
| `admin/` | Painel admin: lista de cursos e editor de curso, módulos, aulas e materiais |

### Regras importantes (seguem o briefing)

- **O acesso ao curso é decidido só pela tabela `academy_enrollments`.** Aula marcada como `gratuita` abre para qualquer conta.
- Tudo é protegido por **RLS** no banco. O site usa só a chave **anon**. A **service_role nunca vai para o front-end.**
- O certificado libera com **90% das aulas concluídas** (regra ainda em definição no briefing).
- Comentários: **só quem escreveu pode apagar**, nem o admin.
- Avaliação: aparece **uma vez por curso**, ao concluir. Fechar no X não pergunta de novo.

## Como rodar no computador

1. Crie o arquivo `.env.local` a partir de `.env.example`, com a URL e a chave **anon** do Supabase. Esse arquivo não vai para o git.
2. Rode `npm install` e depois `npm run dev`.
3. Abra `http://localhost:5173/academy`.

**Conta de teste:** `teste@nexla.com.br`. A senha **não está no repositório**: peça a quem criou a conta ou redefina em Supabase → Authentication → Users.

## Scripts do banco (`supabase/`), rodar no SQL Editor em ordem

| Arquivo | Para que serve | Situação |
|---|---|---|
| `001_academy.sql` | Tabelas, RLS, criação automática do perfil e os 2 cursos iniciais | rodado |
| `002_acesso_teste.sql` | Matricula a conta de teste e cria um progresso de exemplo (rodar de novo zera o teste) | rodado |
| `003_curso_extra.sql` | 3º curso de exemplo para a vitrine | rodado |
| `004_cursos_demo.sql` | 7 cursos `demo-*` só para ver a vitrine cheia. **Apagar antes de lançar:** `delete from public.academy_courses where slug like 'demo-%';` | rodado |
| `005_comunidade.sql` | Comentários e respostas por aula | rodado |
| `006_avaliacoes.sql` | Avaliações com estrelas e média por curso | rodado |
| `007_admin.sql` | Permissões de admin, tabela de materiais e bucket `academy-materiais` | **falta rodar** |
| `008_tornar_admin.sql` / `009_tornar_aluno.sql` | Alterna a conta de teste entre admin e aluno | **falta rodar o 008** para testar o admin |

Os scripts podem ser rodados de novo sem quebrar nada. A coluna "Situação" reflete o que foi informado nesta etapa. Confira no Supabase antes de seguir.

## Configurações pendentes (fora do código)

- [ ] **Vercel → Environment Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Sem elas, a Academy publicada não conecta.
- [ ] **Supabase → Authentication → URL Configuration → Redirect URLs:** `http://localhost:5173/academy/**` e `https://www.nexla.com.br/academy/**`. Sem isso, o link de confirmação do cadastro não funciona.
- [ ] **Gerar uma nova service_role** em Supabase → Settings → API. A chave atual foi compartilhada numa conversa.
- [ ] O `vercel.json` (rewrite de `/academy/*`) é a primeira configuração da Vercel no projeto: conferir o primeiro deploy.

## O que falta, na ordem das fases do briefing

### Fase 2: Conteúdo (em andamento)
- [x] Painel admin de cursos, módulos e aulas, e materiais para baixar
- [ ] **Decidir Bunny Stream ou Cloudflare Stream** (decisão em aberto)
- [ ] Envio do vídeo pelo painel e player com **link assinado que expira**, via Supabase Edge Function. A chave do serviço de vídeo não pode ficar no front-end. Hoje a aula guarda só o `video_id`, e o player é um espaço reservado.

### Fase 3: Área do aluno
- [ ] Marcar a aula como concluída **automaticamente ao fim do vídeo** (hoje é pelo botão)
- [ ] Retomar o vídeo do segundo em que parou (`posicao_seg` já existe na tabela)
- [ ] Proteção do vídeo: bloqueio de incorporação fora do domínio, marca d'água com o e-mail do aluno e limite de sessões simultâneas

### Fase 1: Base (pendências)
- [ ] Login com Google (configurar no Google Cloud e no Supabase; hoje mostra o aviso "em breve")
- [ ] "Esqueci minha senha" (precisa de uma tela para definir a nova senha)

### Fase 4: Venda
- [ ] Página de vendas pública por curso (promessa, vídeo, módulos, bônus, garantia de 7 dias, perguntas frequentes), editável no admin
- [ ] Tabelas `products`, `orders` e `coupons`
- [ ] Checkout Asaas (Pix, cartão, boleto) e oferta extra
- [ ] **Webhook do Asaas** (Edge Function) que confere a assinatura, não duplica avisos, cria a matrícula no pagamento e desativa no reembolso
- [ ] Recuperação de Pix e boleto não pagos
- [ ] Hoje, "Quero este curso" abre o WhatsApp da Nexla: trocar pelo checkout

### Fase 5: Comunicação
- [ ] E-mails automáticos via Resend: boas-vindas, pagamento confirmado, Pix ou boleto pendente, recuperação de senha, certificado
- [ ] n8n + Evolution: recuperação pelo WhatsApp, boas-vindas e avisos para a equipe
- [ ] Avisar o aluno quando responderem o comentário dele

### Fase 6: Medição
- [ ] Gravar a **UTM** da primeira visita no cadastro (a coluna `academy_profiles.utm` já existe e está vazia)
- [ ] Tabela `events`, Meta Pixel com API de Conversões e GA4
- [ ] Painel de métricas do briefing (funil, conversões, ticket médio, vendas por origem)
- [ ] Admin: lista de alunos e leads com filtros e CSV, e liberar ou remover acesso manualmente

### Fase 7: Lançamento
- [ ] Páginas de **Termos de uso** e **Política de privacidade** (hoje são só texto no cadastro)
- [ ] Tabela `certificates`, com o código salvo, e uma página pública para validar o código (hoje o código é calculado no navegador)
- [ ] Apagar os cursos `demo-*` e os dados de teste
- [ ] Teste de compra real com reembolso e checklist de segurança

## Decisões em aberto (do briefing)
- Nome, preço e formato da primeira turma da 5×2 (ao vivo ou workshop)
- Bunny Stream ou Cloudflare Stream
- Parcelamento no cartão: quantas vezes, com ou sem juros
- Quais aulas ficam gratuitas como amostra
- Quem desenvolve e o prazo de cada fase

## Fora da Academy (site e página /5x2)

- **Página inicial:** o slide do robô no carrossel leva para `/academy`. **Falta o item "Academy" no menu do site**, como pede o briefing.
- **Página /5x2 (lista de espera):**
  - o Meta Pixel está desligado (`META_PIXEL_ID` vazio em `src/lp5x2/Landing5x2.tsx`);
  - o formulário não pede e-mail;
  - faltam os links de termos e privacidade.
- **Desempenho do site:**
  - as imagens "ChatGPT Image…" em `public/` têm de 1,6 a 2,8 MB cada: converter para WebP;
  - os vídeos de depoimento estão duplicados em `public/` e `src/depoimentos/`;
  - as animações `WaterRipples` da página inicial rodam o tempo todo, mesmo fora da tela.
- **Projeto dentro do OneDrive:** deixa o servidor local lento. O ideal é mover a pasta para fora do OneDrive.

## Próximo passo sugerido

1. Rodar o `007` e o `008` e testar o painel admin.
2. Fazer as configurações pendentes (Vercel e Redirect URLs).
3. Decidir o serviço de vídeo e montar o player com link assinado (fase 2).
4. Seguir para a venda com o Asaas (fase 4).
