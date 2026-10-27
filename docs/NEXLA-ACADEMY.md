# Nexla Academy: onde paramos

Documento de passagem para continuar o desenvolvimento. Base: o briefing "Plataforma de Cursos Nexla" (19/10/2026).
Última atualização: 26/10/2026.

## Situação em uma frase

**A plataforma está pronta para lançar.** Já funcionam:
- **Acesso:** login com e-mail e com Google, recuperação de senha e exclusão da conta pelo aluno.
- **Estudo:** vídeos protegidos no Bunny, certificado com validação pública e área admin completa.
- **Venda:** com o Mercado Pago, em produção.
- **Avisos e medição:** e-mails automáticos pelo n8n, métricas do funil, Meta Pixel, termos e privacidade.

Falta o conteúdo: gravar e cadastrar os cursos reais. Falta também testar uma compra paga com reembolso.

## Onde está o código

- **Branch:** `main`, publicada na Vercel (projeto `nexla-oficial`). A antiga `feat/academy` já foi juntada.
- **Endereço:** `nexla.com.br/academy`, com entrada própria e separada do site: `academy/index.html` + `src/academy/`. O menu do site tem o item "Academy".
- **Banco:** Supabase `lyvknbggtimdivywfeys`. As tabelas da Academy têm o prefixo `academy_`.
  - O projeto é **compartilhado com outro sistema da Nexla**, que é dono da tabela `public.profiles`.
  - **Não mexer** nas tabelas desse sistema nem no **Site URL** do Auth (`http://localhost:3000`).
- **Edge Functions** (`supabase/functions/`):

| Função | O que faz |
|---|---|
| `academy-checkout` | Cria o pedido (preço sempre do banco) e a preferência do Mercado Pago. Curso grátis libera direto. Cancela pedidos pendentes abandonados |
| `academy-webhook-mp` | Recebe o aviso do Mercado Pago, confere o pagamento na API (com assinatura), libera ou tira o acesso e manda a compra para a API de Conversões do Meta |
| `academy-video` | Confere se o aluno pode ver a aula (RLS) e devolve o link assinado do player do Bunny (vale 4 h) |
| `academy-excluir-conta` | O aluno exclui a própria conta. Pedidos ficam anônimos e o login só sai se não for usado pelo outro sistema |

Para publicar: `npx supabase@2.121.0 functions deploy <nome> --project-ref lyvknbggtimdivywfeys --use-api`. O `academy-webhook-mp` leva também `--no-verify-jwt`.

### Mapa dos arquivos (`src/academy/`)

| Arquivo | O que faz |
|---|---|
| `main.tsx` | Rotas e proteção. Deslogado vai para o login, admin vai para `/admin`, conta nova pelo Google vai para "Complete seu cadastro". Registra visitas e o Pixel |
| `router.tsx` | Roteador próprio com base `/academy` (`navegar`, `Link`, `useRota`) |
| `supabase.ts` | Cliente Supabase (só chave anon), sessão, 1 dispositivo por conta, `entrarComGoogle` e `CERTIFICADO_MIN = 100` |
| `Login.tsx`, `CriarConta.tsx` | Entrar e cadastrar com e-mail ou Google |
| `CompletarCadastro.tsx` | Primeiro acesso pelo Google: nome, WhatsApp, aceite dos termos e marketing |
| `Recuperar.tsx` | "Esqueci minha senha" (`/recuperar`) e criação da senha nova pelo link do e-mail (`/nova-senha`) |
| `AppLayout.tsx`, `ui.tsx`, `tema.tsx` | Menu lateral do aluno, telas de acesso e modo claro/escuro (claro é o padrão) |
| `Painel.tsx` | Meus cursos, "Continue de onde parou" e sugestões |
| `Explorar.tsx` | Catálogo com busca, filtros laterais (mostrar, categoria, nível), ordenação, cadeado e selo "Em breve" |
| `PaginaCurso.tsx` | Página de vendas pública: preço, instrutor, ferramentas, bônus, FAQ e "mais comprados" |
| `Compra.tsx` | Tela de compra (oferta extra e cupom), retorno do pagamento e liberação de curso grátis |
| `Curso.tsx`, `Video.tsx` | Tela da aula (modelo Alura): lista lateral, modo teatro (tecla T) e próxima aula automática. O player do Bunny tem marca d'água com o e-mail e retoma de onde parou |
| `Certificado.tsx`, `certificadoCanvas.ts`, `Certificados.tsx` | Certificado em PDF/PNG com código registrado no banco |
| `Validar.tsx` | Página pública `/validar/:codigo` para conferir um certificado |
| `Perfil.tsx` | Dados, senha, aparência e exclusão da conta |
| `Legal.tsx` | Termos de uso e Política de privacidade, com os dados da empresa |
| `Comunidade.tsx`, `Avaliacao.tsx` | Comentários por aula e avaliação do curso com estrelas |
| `rastreio.ts`, `pixel.ts` | Origem (UTM) da primeira visita, eventos do funil e Meta Pixel (`1410172823723220`) |
| `admin/` | Menu lateral com Visão geral, Métricas, Cursos, Comunidade, Vendas e Leads. Os cursos têm aulas, alunos, configurações, venda (preço, curso gratuito, oferta extra), bônus, FAQ e instrutor |

### Regras importantes

- **O acesso ao curso vem só do pagamento**, ou do curso marcado como gratuito. Reembolso ou estorno tira o acesso sozinho. O admin não remove o acesso de quem pagou.
- Quem não comprou vê a página de vendas e só a 1ª aula (amostra, exige estar logado). A grade de aulas fica escondida.
- Tudo é protegido por **RLS**. O site usa só a chave **anon**. A **service_role nunca vai para o front-end**.
- **Certificado só com 100% das aulas concluídas.** O código fica salvo em `academy_certificates` e qualquer pessoa confere em `/validar`.
- **1 dispositivo por conta:** ao entrar em outro aparelho, o anterior é desconectado.
- Comentários: **só quem escreveu pode apagar**, nem o admin.
- **Conta admin usa só a área admin.** A única tela de aluno liberada é o "Ver como aluno" (`/curso/:slug`).
- **Exclusão de conta (LGPD):** apaga progresso, comentários, avaliações, certificados e matrículas. Os pedidos ficam guardados sem os dados pessoais. Admin não se exclui por aqui.

## Como rodar no computador

1. Crie o arquivo `.env.local` a partir de `.env.example`, com a URL e a chave **anon** do Supabase. Esse arquivo não vai para o git.
2. Rode `npm install` e depois `npm run dev`.
3. Abra `http://localhost:5173/academy`. Use a porta 5173, que é a liberada nas funções e no login.

**Contas:** o admin da Academy é `adm.nexla@gmail.com` (entra com Google). As contas de teste foram apagadas no `028`. Para testar como aluno, crie uma conta nova.

## Scripts do banco (`supabase/`)

Todos foram rodados no SQL Editor, na ordem dos números, e podem ser rodados de novo sem erro. Exceção: o `022`, que apaga dados.

| Arquivo | Para que serve |
|---|---|
| `001` a `010` | Tabelas, RLS, comunidade, avaliações, admin, materiais e configuração do curso (`002`–`004` e `008`/`009` eram só para testes) |
| `011_admin_visao.sql` | Admin lê perfis, progresso, matrículas e avaliações |
| `012_seguranca.sql` | Datas pelo servidor, avaliação só após concluir, limite de comentários, ID do vídeo fora do acesso público |
| `013_matricula_manual.sql` / `016_sem_acesso_manual.sql` | Liberação manual por e-mail, depois restrita: o acesso vem só do pagamento |
| `014_vendas.sql` | Produtos, cupons e pedidos |
| `015_aula_amostra.sql` / `018_amostra_so_logado.sql` | 1ª aula como amostra, só para quem está logado |
| `017_sessao_unica.sql` | 1 dispositivo por conta |
| `019_bonus_faq.sql` / `021_pagina_curso.sql` | Bônus, FAQ, ferramentas, instrutor e "mais vendidos" na página de vendas |
| `020_esconder_conteudo.sql` | Esconde a grade do curso de quem não comprou |
| `022_limpar_dados_teste.sql` | **Já rodado.** Apagou os dados de teste. Não rodar de novo depois do lançamento |
| `023_metricas_leads.sql` | E-mail e UTM no perfil, tabela de eventos, métricas do funil e lista de leads |
| `024_certificados.sql` / `026_certificado_100.sql` | Registro e validação de certificados, regra dos 100% |
| `025_meta_pixel.sql` | Dados do Pixel no pedido, para a API de Conversões |
| `027_excluir_conta.sql` | Pedidos continuam guardados (anônimos) quando a conta é excluída |
| `028_contas_lancamento.sql` | **Já rodado (27/10).** Deixou `adm.nexla@gmail.com` como admin e apagou as contas de teste. Manteve `adm@nexla.com.br`, que é admin do outro sistema. Não rodar de novo |
| `029_seguranca_revisao.sql` | **Falta rodar.** Aula só conta como concluída depois de assistir 70% da duração cadastrada (por isso os minutos de cada aula no admin precisam estar certos). O aluno não muda mais o e-mail nem a data de cadastro do perfil. Amostra e aula grátis só valem em curso publicado |

## Configurações feitas fora do código

**Supabase → Edge Functions → Secrets**
- `MP_ACCESS_TOKEN`: produção.
- `MP_WEBHOOK_SECRET`: confirmar que é a assinatura de produção no teste de compra.
- `BUNNY_TOKEN_KEY`: chave do token do Bunny.
- `BUNNY_LIBRARY_ID`: opcional, o padrão é a biblioteca "Aulas", `790467`.
- `MP_SOMENTE_EMAILS`: **foi apagado**, então as vendas estão abertas a todos.

**Supabase → Authentication**
- **SMTP próprio (Gmail):** `adm.nexla@gmail.com` com senha de app, remetente "Nexla Academy".
- **Modelo "Reset Password"** em português (`supabase/emails/recuperar-senha.html`).
- **Redirect URLs:** `https://www.nexla.com.br/academy/**`, `https://nexla.com.br/academy/**` e `http://localhost:5173/academy/**`.
- **Provedor Google:** projeto "Nexla Academy" no Google Cloud, cliente "Cliente Web 1", app publicado (em produção). A tela do Google mostra o domínio `…supabase.co`, e isso foi aceito.

**Supabase → Integrations → Database Webhooks**
- Eles mandam os eventos para o n8n com o cabeçalho `x-nexla-segredo`:
  - `avisos-cadastro`: `academy_profiles`, INSERT
  - `avisos-pedidos`: `academy_orders`, UPDATE
  - `avisos-certificados`: não é mais usado, pode ser apagado

**n8n** (`n8n/academy-avisos.json`)
- E-mails pelo Gmail (OAuth): boas-vindas, curso liberado (pago ou grátis), pagamento recusado, cancelado e reembolso.
- Pix/boleto pendente e lembretes ficam com os e-mails do próprio Mercado Pago.

**Bunny Stream**
- Biblioteca `790467` ("Aulas"), com link assinado (token de segurança).
- O ID do vídeo vai em cada aula, no admin.

## O que falta

**Antes de abrir as vendas**
- [ ] Gravar os vídeos e cadastrar os cursos reais: aulas, preço, capa, FAQ e instrutor.
- [ ] Teste de compra paga real com reembolso. Conferir se o pedido vira "Pago", se o curso é liberado e se chega o e-mail "Seu curso foi liberado". Se o pedido ficar em "Pendente", revisar o `MP_WEBHOOK_SECRET`.

**Depois**
- [ ] `META_CAPI_TOKEN`: token da API de Conversões do Meta. O Pixel no navegador já funciona sem ele.
- [ ] Entregar a oferta extra: hoje ela é cobrada e registrada no pedido, mas o conteúdo não é liberado sozinho.
- [ ] Nota fiscal: o Mercado Pago não emite, falta definir como emitir.
- [ ] Avisar o aluno quando responderem o comentário dele.
- [ ] WhatsApp (n8n + Evolution) e GA4: não começados, hoje os avisos são só por e-mail.
- [ ] Apagar o webhook `avisos-certificados` (opcional).
- [ ] Conferir se a `service_role` foi renovada depois de ter sido compartilhada numa conversa antiga.

## Fora da Academy (site)

- **Desempenho do site:**
  - as imagens "ChatGPT Image…" em `public/` têm de 1,6 a 2,8 MB cada: converter para WebP;
  - os vídeos de depoimento estão duplicados;
  - as animações `WaterRipples` rodam mesmo fora da tela.
- **Projeto dentro do OneDrive:** deixa o servidor local lento. O ideal é mover a pasta para fora do OneDrive.
