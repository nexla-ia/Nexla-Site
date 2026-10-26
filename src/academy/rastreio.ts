import { supabase } from './supabase';

/* ─── Origem e eventos do funil (alimenta Admin → Métricas e Leads) ─────────
   • Origem (UTM) da PRIMEIRA visita fica guardada no navegador e vai para o perfil no cadastro.
   • Visitas às páginas e aulas abertas viram linhas em academy_events.
   Nada aqui pode quebrar a Academy: sem a tabela (023 não rodado) ou sem armazenamento, só não registra. */

export type Origem = { origem: string; midia?: string; campanha?: string; anuncio?: string; termo?: string; pagina?: string; fbclid?: string; em: string };

const CHAVE_ORIGEM = 'academy-origem';
const CHAVE_VISITANTE = 'academy-visitante';

const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const corta = (v: string | null | undefined, n = 120) => (v ? v.trim().slice(0, n) : undefined);

/* Id anônimo do navegador (conta visitantes únicos sem saber quem é) */
function visitante() {
  let id = ler(CHAVE_VISITANTE);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
    gravar(CHAVE_VISITANTE, id);
  }
  return id;
}

/* Guarda a origem na primeira visita: utm_* da URL; sem UTM, o site de onde veio; sem nada, "direto" */
export function capturarOrigem() {
  if (ler(CHAVE_ORIGEM)) return;
  const q = new URLSearchParams(window.location.search);
  let ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch { /* referrer inválido */ }
  const interno = !ref || ref === window.location.hostname.replace(/^www\./, '');
  const origem: Origem = {
    origem: (corta(q.get('utm_source'), 60) ?? (q.get('fbclid') ? 'facebook' : q.get('gclid') ? 'google' : !interno ? ref : 'direto')).toLowerCase(),
    midia: corta(q.get('utm_medium'), 60),
    campanha: corta(q.get('utm_campaign')),
    anuncio: corta(q.get('utm_content')),
    termo: corta(q.get('utm_term')),
    pagina: corta(window.location.pathname, 120),
    fbclid: corta(q.get('fbclid'), 250), // clique em anúncio do Meta (vira o cookie _fbc na compra)
    em: new Date().toISOString(),
  };
  gravar(CHAVE_ORIGEM, JSON.stringify(origem));
}

export function lerOrigem(): Origem | null {
  try { const o = JSON.parse(ler(CHAVE_ORIGEM) ?? 'null'); return o && typeof o.origem === 'string' ? o : null; } catch { return null; }
}

/* Registra um evento (não espera resposta e ignora erro) */
function registrar(tipo: 'visita' | 'aula', dados: { pagina?: string; userId?: string | null; courseId?: string; lessonId?: string }) {
  const o = lerOrigem();
  supabase.from('academy_events').insert({
    visitante: visitante(),
    user_id: dados.userId ?? null,
    tipo,
    pagina: corta(dados.pagina, 200) ?? null,
    course_id: dados.courseId ?? null,
    lesson_id: dados.lessonId ?? null,
    utm: o ? { origem: o.origem, campanha: o.campanha ?? null } : null,
  }).then(() => undefined, () => undefined);
}

export const registrarVisita = (pagina: string, userId?: string | null) => registrar('visita', { pagina, userId });
export const registrarAula = (userId: string, courseId: string, lessonId: string) => registrar('aula', { userId, courseId, lessonId });

/* Quem entrou sem origem no perfil (ex.: conta antiga ou login com Google) recebe a origem guardada no navegador */
const jaSalvou = new Set<string>();
export function salvarOrigemNoPerfil(userId: string) {
  const o = lerOrigem();
  if (!o || jaSalvou.has(userId)) return;
  jaSalvou.add(userId);
  supabase.from('academy_profiles').update({ utm: o }).eq('id', userId).is('utm', null).then(() => undefined, () => undefined);
}
