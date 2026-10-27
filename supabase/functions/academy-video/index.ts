// ═══════════════════════════════════════════════════════════════════
// Nexla Academy — link do player de vídeo (Bunny Stream)
//
// POST { aula } → { url } do player do Bunny para quem PODE assistir a aula.
// POST { aula, video } → só admin: player de um vídeo ainda não salvo (o editor de aula lê a duração dele).
//
// A aula é lida COMO O ALUNO (com o token dele): as regras do banco (academy_pode_assistir)
// decidem se ele comprou o curso, se é a aula de amostra, se é admin e se este é o dispositivo ativo.
// Quem não pode não recebe nem o ID do vídeo.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   BUNNY_LIBRARY_ID  → ID da biblioteca no Bunny Stream (opcional: sem ele, usa a biblioteca da Nexla, 790467)
//   BUNNY_TOKEN_KEY   → chave de "Embed view token authentication" do Bunny (opcional, recomendado):
//                       com ela o link sai assinado e expira, então não adianta copiar e compartilhar.
// SUPABASE_URL e SUPABASE_ANON_KEY são fornecidos automaticamente pelo Supabase.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SITE_PADRAO = 'https://www.nexla.com.br';
const ORIGENS_OK = ['https://www.nexla.com.br', 'https://nexla.com.br', 'http://localhost:5173', 'http://localhost:4173'];
const VALIDADE_SEG = 4 * 60 * 60; // o link assinado vale 4 horas
const BIBLIOTECA_PADRAO = '790467'; // biblioteca da Nexla no Bunny Stream (o ID não é segredo: aparece no link do player)

const cors = (origem: string | null) => ({
  'Access-Control-Allow-Origin': origem && ORIGENS_OK.includes(origem) ? origem : SITE_PADRAO,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dispositivo',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

async function sha256hex(texto: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const origem = req.headers.get('origin');
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...cors(origem), 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origem) });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  let entrada: { aula?: string; video?: string };
  try { entrada = await req.json(); } catch { return json({ erro: 'entrada' }, 400); }
  const aulaId = String(entrada.aula ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(aulaId)) return json({ erro: 'entrada' }, 400);

  // Sem a identificação do aparelho, a trava de 1 dispositivo por conta não teria como conferir
  const dispositivo = (req.headers.get('x-dispositivo') ?? '').trim();
  if (!dispositivo) return json({ erro: 'sem_acesso' }, 403);

  // Lê a aula com o token e o dispositivo do próprio aluno: a RLS diz se ele pode assistir
  const comoAluno = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: req.headers.get('authorization') ?? '', 'x-dispositivo': dispositivo } },
  });

  // Admin no editor de aula: pré-visualiza um vídeo ainda não salvo (para detectar a duração)
  let video = '';
  if (entrada.video) {
    const previa = String(entrada.video).trim();
    const { data: ehAdmin } = await comoAluno.rpc('academy_eh_admin');
    if (ehAdmin !== true || !/^[0-9a-f-]{36}$/i.test(previa)) return json({ erro: 'sem_acesso' }, 403);
    video = previa;
  } else {
    const { data: aula } = await comoAluno.from('academy_lessons').select('id, video_id').eq('id', aulaId).maybeSingle();
    if (!aula) return json({ erro: 'sem_acesso' }, 403);
    video = String(aula.video_id ?? '').trim();
  }
  if (!video) return json({ erro: 'sem_video' }, 404);

  const biblioteca = (Deno.env.get('BUNNY_LIBRARY_ID') ?? '').trim() || BIBLIOTECA_PADRAO;

  const params = new URLSearchParams({ autoplay: 'false', preload: 'true', responsive: 'true' });
  const chave = (Deno.env.get('BUNNY_TOKEN_KEY') ?? '').trim();
  if (chave) {
    // Assinatura do Bunny: SHA256(chave + id do vídeo + expiração), em hexadecimal
    const expira = Math.floor(Date.now() / 1000) + VALIDADE_SEG;
    params.set('token', await sha256hex(chave + video + expira));
    params.set('expires', String(expira));
  }
  return json({ url: `https://player.mediadelivery.net/embed/${encodeURIComponent(biblioteca)}/${encodeURIComponent(video)}?${params}` });
});
