import { createClient, type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

/* Cliente do Supabase da Academy — usa só a chave pública (anon). As regras de acesso ficam no banco (RLS).
 * Sem as variáveis (ex.: não configuradas na Vercel), a página mostra um aviso em vez de ficar em branco. */
const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseConfigurado = !!URL_SUPABASE && !!CHAVE_ANON;
/* Identificador deste navegador (1 dispositivo por conta). Vai no cabeçalho x-dispositivo de toda chamada. */
function lerDispositivo() {
  const novo = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    const salvo = localStorage.getItem('nexla_dispositivo');
    if (salvo) return salvo;
    const id = novo();
    localStorage.setItem('nexla_dispositivo', id);
    return id;
  } catch { return novo(); } // sem armazenamento (ex.: modo restrito): vale só nesta aba
}
const DISPOSITIVO = lerDispositivo();

export const supabase = createClient(URL_SUPABASE || 'https://nao-configurado.supabase.co', CHAVE_ANON || 'nao-configurado', {
  global: { headers: { 'x-dispositivo': DISPOSITIVO } },
});

/* ─── 1 dispositivo por conta ──────────────────────────────────────
 * Ao entrar, este navegador vira o dispositivo da conta. Os outros são desconectados na próxima
 * conferência (a cada 30 s ou ao voltar para a aba). O banco também bloqueia o conteúdo para eles. */
const marca = (k: string, v: string | null) => { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const leMarca = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };

/* Chamar ANTES de entrar/cadastrar: o próximo login deste navegador assume a conta */
export const marcarNovoLogin = () => { marca('nexla_novo_login', '1'); marca('nexla_sessao_encerrada', null); };
export const desmarcarNovoLogin = () => marca('nexla_novo_login', null);

/* Entrar ou cadastrar com Google: vai para o Google e volta para `voltar` (ou "Meus cursos") já conectado.
 * Conta nova pelo Google ainda não tem WhatsApp: o main.tsx mostra a tela "Complete seu cadastro". */
export async function entrarComGoogle(voltar: string | null) {
  marcarNovoLogin();
  const destino = voltar && /^\/[\w\-/]*$/.test(voltar) && !voltar.startsWith('//') ? voltar : '/painel';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/academy${destino}`, queryParams: { prompt: 'select_account' } },
  });
  if (error) desmarcarNovoLogin();
  return error;
}

/* Voltou do Google sem entrar (cancelou ou deu erro): lido ao abrir a página, a tela de login avisa uma vez */
let erroGoogle = (() => {
  const p = new URLSearchParams(window.location.hash.slice(1) + '&' + window.location.search.slice(1));
  return !window.location.pathname.endsWith('/nova-senha') && !!(p.get('error') || p.get('error_code'));
})();
export const lerErroGoogle = () => { const e = erroGoogle; erroGoogle = false; return e; };

/* A tela de login mostra o aviso uma vez quando a conta foi aberta em outro dispositivo */
export const lerAvisoOutroDispositivo = () => leMarca('nexla_sessao_encerrada') === '1'; // limpo no próximo login

export const descricaoDispositivo = () => {
  const ua = navigator.userAgent;
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  return [nav, so].filter(Boolean).join(' · ');
};

export function useSessaoUnica(sessao: Session | null | undefined) {
  const uid = sessao?.user.id;
  useEffect(() => {
    if (!uid) return;
    let vivo = true;
    const verificar = async () => {
      if (leMarca('nexla_novo_login')) {
        desmarcarNovoLogin();
        await supabase.rpc('academy_assumir_sessao', { p_descricao: descricaoDispositivo() });
        return;
      }
      const { data, error } = await supabase.rpc('academy_sessao_status');
      if (!vivo || error) return; // sem o 017 no banco, a trava fica desligada
      if (data === 'livre') await supabase.rpc('academy_assumir_sessao', { p_descricao: descricaoDispositivo() });
      if (data === 'outro') {
        marca('nexla_sessao_encerrada', '1');
        await supabase.auth.signOut({ scope: 'local' }); // só este aparelho; o novo continua conectado
      }
    };
    verificar();
    const timer = window.setInterval(verificar, 30_000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') verificar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { vivo = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [uid]);
}

/* Formas de entrar da conta: 'email' (e-mail e senha) e/ou 'google' */
export const provedoresDa = (sessao: Session) =>
  (sessao.user.app_metadata?.providers as string[] | undefined) ?? [sessao.user.app_metadata?.provider as string];

/* Certificado: liberado a partir deste percentual de aulas concluídas (regra ainda em definição) */
export const CERTIFICADO_MIN = 100; // certificado só com todas as aulas concluídas

/* Sessão atual: undefined = carregando, null = deslogado */
export function useSessao() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return sessao;
}

/* A conta logada é admin (role = 'admin')? undefined = carregando. Consulta uma vez por usuário. */
const cacheAdmin = new Map<string, Promise<boolean>>();
export function useEhAdmin(sessao: Session | null | undefined) {
  // Guarda de quem é a resposta: ao trocar de conta, volta a "carregando" em vez de usar a resposta antiga
  const [resposta, setResposta] = useState<{ uid: string; admin: boolean } | null>(null);
  const uid = sessao?.user.id;
  useEffect(() => {
    if (!uid) return;
    if (!cacheAdmin.has(uid)) {
      cacheAdmin.set(uid, Promise.resolve(supabase.from('academy_profiles').select('role').eq('id', uid).maybeSingle())
        .then(({ data }) => data?.role === 'admin'));
    }
    let vivo = true;
    cacheAdmin.get(uid)!.then(admin => { if (vivo) setResposta({ uid, admin }); });
    return () => { vivo = false; };
  }, [uid]);
  if (sessao === null) return false;
  if (!uid || resposta?.uid !== uid) return undefined;
  return resposta.admin;
}

/* Mensagens do Supabase Auth em português */
export function erroAuth(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Já existe uma conta com este e-mail. Tente entrar.';
  if (m.includes('password should be')) return 'A senha é fraca demais. Use pelo menos 8 caracteres.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'O cadastro está fechado no momento.';
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}

/* ─── Tipos e consulta de cursos com progresso ─────────────────── */
export type Aula   = { id: string; titulo: string; descricao: string | null; ordem: number; duracao_seg: number; gratuita: boolean };
export type Modulo = { id: string; titulo: string; ordem: number; academy_lessons: Aula[] };
export type Curso  = { id: string; slug: string; titulo: string; subtitulo: string | null; ordem: number; capa: string | null; categoria: string | null; nivel: string | null; academy_modules: Modulo[] };

export const SELECT_CURSO =
  'id, slug, titulo, subtitulo, ordem, capa, categoria, nivel, academy_modules(id, titulo, ordem, academy_lessons(id, titulo, descricao, ordem, duracao_seg, gratuita))';

/* Ordena módulos e aulas e devolve a lista linear de aulas do curso */
export function organizar(c: Curso) {
  const modulos = [...c.academy_modules].sort((a, b) => a.ordem - b.ordem)
    .map(m => ({ ...m, academy_lessons: [...m.academy_lessons].sort((a, b) => a.ordem - b.ordem) }));
  return { ...c, academy_modules: modulos, aulas: modulos.flatMap(m => m.academy_lessons) };
}

/* Resumo público de cada curso: só números e a aula de amostra (a grade completa só para quem comprou) */
export type ResumoCurso = { modulos: number; aulas: number; horas: number; amostra: { id: string; titulo: string; duracao_seg: number } | null };
export async function buscarResumos(): Promise<Map<string, ResumoCurso>> {
  const { data } = await supabase.rpc('academy_resumo_cursos');
  return new Map(((data ?? []) as { course_id: string; modulos: number; aulas: number; segundos: number; amostra_id: string | null; amostra_titulo: string | null; amostra_duracao: number | null }[])
    .map(r => [r.course_id, {
      modulos: r.modulos, aulas: r.aulas, horas: Math.max(1, Math.round(r.segundos / 3600)),
      amostra: r.amostra_id ? { id: r.amostra_id, titulo: r.amostra_titulo ?? '', duracao_seg: r.amostra_duracao ?? 0 } : null,
    }]));
}

/* Pedido pendente que passou do prazo. O link de pagamento do Mercado Pago vale 30 min (academy-checkout);
   Pix ou boleto já gerado tem até 4 dias para ser pago. Depois disso o pedido conta como expirado. */
export const PRAZO_LINK_H = 0.5; // 30 minutos
export const pedidoExpirado = (p: { status: string; forma_pagamento: string | null; criado_em?: string | null }) =>
  p.status === 'pendente' && !!p.criado_em
  && Date.now() - new Date(p.criado_em).getTime() > (p.forma_pagamento ? 4 * 24 : PRAZO_LINK_H) * 3600 * 1000;

export const pct = (feitas: number, total: number) => (total ? Math.round((feitas / total) * 100) : 0);
export const minutos = (seg: number) => `${Math.max(1, Math.round(seg / 60))} min`;
