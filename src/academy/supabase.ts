import { createClient, type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

/* Cliente do Supabase da Academy — usa só a chave pública (anon). As regras de acesso ficam no banco (RLS). */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

/* Certificado: liberado a partir deste percentual de aulas concluídas (regra ainda em definição) */
export const CERTIFICADO_MIN = 90;

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
export type Curso  = { id: string; slug: string; titulo: string; subtitulo: string | null; ordem: number; academy_modules: Modulo[] };

export const SELECT_CURSO =
  'id, slug, titulo, subtitulo, ordem, academy_modules(id, titulo, ordem, academy_lessons(id, titulo, descricao, ordem, duracao_seg, gratuita))';

/* Ordena módulos e aulas e devolve a lista linear de aulas do curso */
export function organizar(c: Curso) {
  const modulos = [...c.academy_modules].sort((a, b) => a.ordem - b.ordem)
    .map(m => ({ ...m, academy_lessons: [...m.academy_lessons].sort((a, b) => a.ordem - b.ordem) }));
  return { ...c, academy_modules: modulos, aulas: modulos.flatMap(m => m.academy_lessons) };
}

export const pct = (feitas: number, total: number) => (total ? Math.round((feitas / total) * 100) : 0);
export const minutos = (seg: number) => `${Math.max(1, Math.round(seg / 60))} min`;
