// ═══════════════════════════════════════════════════════════════════
// Nexla Academy — link do player de vídeo (Bunny Stream)
//
// POST { aula } → { url } do player do Bunny para quem PODE assistir a aula.
// POST { aula, video } → só admin: player de um vídeo ainda não salvo + duracao_seg (o editor de aula preenche sozinho).
// Ao abrir uma aula, se a duração cadastrada não bate com a do vídeo no Bunny, ela é corrigida no banco.
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

/* Duração do vídeo, lida da página do player do Bunny (vem como "duration":"PT1M30S").
   O Bunny só entrega a página para os sites autorizados, por isso vai com o endereço do site. */
async function duracaoNoBunny(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { headers: { Referer: `${SITE_PADRAO}/` } });
    if (!r.ok) return null;
    const iso = (await r.text()).match(/"duration"\s*:\s*"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?"/);
    if (!iso) return null;
    const seg = Number(iso[1] ?? 0) * 86400 + Number(iso[2] ?? 0) * 3600 + Number(iso[3] ?? 0) * 60 + Number(iso[4] ?? 0);
    return seg > 0 ? Math.round(seg) : null;
  } catch { return null; }
}
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

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
  let aula: { id: string; video_id: string | null; duracao_seg: number } | null = null;
  if (entrada.video) {
    const previa = String(entrada.video).trim();
    const { data: ehAdmin } = await comoAluno.rpc('academy_eh_admin');
    if (ehAdmin !== true || !/^[0-9a-f-]{36}$/i.test(previa)) return json({ erro: 'sem_acesso' }, 403);
    video = previa;
  } else {
    const { data } = await comoAluno.from('academy_lessons').select('id, video_id, duracao_seg').eq('id', aulaId).maybeSingle();
    if (!data) return json({ erro: 'sem_acesso' }, 403);
    aula = data;
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
  const url = `https://player.mediadelivery.net/embed/${encodeURIComponent(biblioteca)}/${encodeURIComponent(video)}?${params}`;

  // Editor de aula (admin): devolve também a duração do vídeo, para preencher sozinho
  if (!aula) return json({ url, duracao_seg: await duracaoNoBunny(url) });

  // Aula aberta: se a duração cadastrada não bate com a do vídeo, corrige no banco (depois de responder).
  // É ela que decide quanto o aluno precisa assistir para concluir (70%).
  const cadastrada = Number(aula.duracao_seg ?? 0);
  const corrigir = duracaoNoBunny(url).then(async seg => {
    if (!seg || Math.abs(seg - cadastrada) <= 1) return;
    const servico = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    await servico.from('academy_lessons').update({ duracao_seg: seg }).eq('id', aulaId).eq('video_id', video);
  }).catch(() => undefined);
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(corrigir); else await corrigir;
  return json({ url });
});
