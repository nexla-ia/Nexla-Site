// ═══════════════════════════════════════════════════════════════════
// Nexla Academy — prévia do link para WhatsApp, LinkedIn, Facebook, Telegram...
//
// Esses robôs não rodam o JavaScript do site, então só enxergam as tags do academy/index.html
// (a prévia geral). O vercel.json manda para cá só os robôs (pelo user-agent), em duas páginas:
//   /academy/curso/:slug       → ?curso=slug        nome, subtítulo e capa do curso
//   /academy/validar/:codigo   → ?certificado=cod   "Certificado de Fulano · Curso X"
// Pessoas de verdade nunca passam por aqui. Se algo der errado, sai a prévia geral.
//
// Usa a chave pública (anon) do Supabase, a mesma do site: só lê o que já é público.
// Variáveis da Vercel: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (as mesmas do build).
// ═══════════════════════════════════════════════════════════════════
const SITE = 'https://www.nexla.com.br';
const IMAGEM_PADRAO = `${SITE}/academy-og.jpg`;
const GERAL = {
  titulo: 'Nexla Academy · Aprenda a usar IA no seu negócio, na prática',
  descricao: 'Cursos gravados de IA e automação, direto ao ponto e com certificado. Assista no celular ou no computador.',
};

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const corta = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

async function supabase(caminho, corpo) {
  const url = process.env.VITE_SUPABASE_URL;
  const chave = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !chave) return null;
  const r = await fetch(`${url}/rest/v1/${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(3000),
  });
  return r.ok ? r.json() : null;
}

async function dadosDoCurso(slug) {
  if (!/^[\w-]{1,80}$/.test(slug)) return null;
  const linhas = await supabase(`academy_courses?select=titulo,subtitulo,descricao,capa&publicado=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const c = Array.isArray(linhas) ? linhas[0] : null;
  if (!c) return null;
  return {
    titulo: `${c.titulo} · Nexla Academy`,
    descricao: corta(c.subtitulo || c.descricao || GERAL.descricao, 200),
    imagem: typeof c.capa === 'string' && c.capa.startsWith('https://') ? c.capa : IMAGEM_PADRAO,
    url: `${SITE}/academy/curso/${slug}`,
  };
}

async function dadosDoCertificado(codigo) {
  if (!/^[\w-]{4,30}$/.test(codigo)) return null;
  const c = await supabase('rpc/academy_validar_certificado', { p_codigo: codigo });
  if (!c || !c.nome) return null;
  const mes = new Date(c.concluido_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  return {
    titulo: `${c.nome} concluiu ${c.curso} · Nexla Academy`,
    descricao: `Certificado de conclusão com carga horária de ${c.carga_h} hora${c.carga_h > 1 ? 's' : ''}, emitido em ${mes}. Código ${c.codigo}, verificável na Nexla Academy.`,
    imagem: IMAGEM_PADRAO,
    url: `${SITE}/academy/validar/${encodeURIComponent(c.codigo)}`,
  };
}

export default async function handler(req, res) {
  let d = null;
  try {
    if (typeof req.query.curso === 'string') d = await dadosDoCurso(req.query.curso);
    else if (typeof req.query.certificado === 'string') d = await dadosDoCertificado(req.query.certificado);
  } catch { /* sem dados: prévia geral */ }
  d ??= { ...GERAL, imagem: IMAGEM_PADRAO, url: `${SITE}/academy` };

  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>${escapar(d.titulo)}</title>
<meta name="description" content="${escapar(d.descricao)}" />
<meta name="robots" content="noindex" />
<meta property="og:title" content="${escapar(d.titulo)}" />
<meta property="og:description" content="${escapar(d.descricao)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapar(d.url)}" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="Nexla Academy" />
<meta property="og:image" content="${escapar(d.imagem)}" />
<meta property="og:image:alt" content="${escapar(d.titulo)}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${escapar(d.url)}" />
</head><body><a href="${escapar(d.url)}">${escapar(d.titulo)}</a></body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(html);
}
