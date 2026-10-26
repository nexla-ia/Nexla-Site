// ═══════════════════════════════════════════════════════════════════
// Nexla Academy — o aluno exclui a própria conta (LGPD)
//
// POST { confirmacao: 'EXCLUIR' } com o login do aluno.
// Apaga tudo da Academy dessa pessoa: progresso, comentários, avaliações, certificados,
// matrículas, sessão, visitas e o perfil. Os PEDIDOS ficam guardados, mas anônimos
// (obrigação fiscal e de defesa do consumidor; precisa do 027 no banco).
//
// O login (auth.users) é compartilhado com outro sistema da Nexla neste mesmo Supabase:
//   • a linha que o outro sistema cria sozinha no cadastro (profiles vazio) também sai;
//   • se o login estiver em uso no outro sistema, ele NÃO é apagado — só os dados da Academy.
// Admin não pode se excluir por aqui (para ninguém perder o acesso ao painel por engano).
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SITE_PADRAO = 'https://www.nexla.com.br';
const ORIGENS_OK = ['https://www.nexla.com.br', 'https://nexla.com.br', 'http://localhost:5173', 'http://localhost:4173'];
const cors = (origem: string | null) => ({
  'Access-Control-Allow-Origin': origem && ORIGENS_OK.includes(origem) ? origem : SITE_PADRAO,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dispositivo',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

Deno.serve(async (req) => {
  const origem = req.headers.get('origin');
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...cors(origem), 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origem) });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem } = await admin.auth.getUser(token);
  const usuario = quem?.user;
  if (!usuario) return json({ erro: 'nao_logado' }, 401);

  let entrada: { confirmacao?: string } = {};
  try { entrada = await req.json(); } catch { /* sem corpo */ }
  if (entrada.confirmacao !== 'EXCLUIR') return json({ erro: 'confirmacao' }, 400);

  const uid = usuario.id;
  const { data: perfil } = await admin.from('academy_profiles').select('role').eq('id', uid).maybeSingle();
  if (perfil?.role === 'admin') return json({ erro: 'admin' }, 403);

  // 1) Pedidos ficam, mas anônimos. Se o 027 não rodou (coluna ainda obrigatória), para aqui sem apagar nada.
  const { error: erroPedidos } = await admin.from('academy_orders').update({ user_id: null, rastreio: null }).eq('user_id', uid);
  if (erroPedidos) {
    console.error('Excluir conta: não deu para anonimizar os pedidos', uid, erroPedidos.message);
    return json({ erro: 'configuracao' }, 500);
  }

  // 2) Dados da Academy
  for (const [tabela, coluna] of [
    ['academy_lesson_comments', 'user_id'], ['academy_lesson_progress', 'user_id'], ['academy_course_reviews', 'user_id'],
    ['academy_certificates', 'user_id'], ['academy_enrollments', 'user_id'], ['academy_sessoes', 'user_id'],
    ['academy_events', 'user_id'], ['academy_profiles', 'id'],
  ] as const) {
    const { error } = await admin.from(tabela).delete().eq(coluna, uid);
    if (error && !/does not exist|schema cache/i.test(error.message)) console.error('Excluir conta:', tabela, error.message);
  }

  // 3) Linha vazia que o outro sistema cria sozinho no cadastro (só se continuar vazia)
  await admin.from('profiles').delete().eq('id', uid).is('full_name', null).is('avatar_url', null)
    .then(() => undefined, () => undefined);

  // 4) O login. Se o outro sistema ainda usa essa conta, o banco recusa: fica o login, sem nada da Academy.
  const { error: erroLogin } = await admin.auth.admin.deleteUser(uid);
  if (erroLogin) {
    console.error('Excluir conta: login mantido (em uso por outro sistema)', uid, erroLogin.message);
    return json({ ok: true, login_mantido: true });
  }
  return json({ ok: true });
});
