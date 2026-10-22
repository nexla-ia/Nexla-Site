import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, organizar, pct, buscarResumos, CERTIFICADO_MIN, SELECT_CURSO, type Curso, type Aula, type ResumoCurso } from './supabase';

export type CursoAluno = ReturnType<typeof organizar> & {
  feitas: Set<string>;
  ultima: number;          // data (ms) da última aula concluída
  proxima: Aula | null;    // primeira aula ainda não concluída
  percentual: number;
  faltamCertificado: number;
  media: number | null;    // média de estrelas do curso (null = ainda sem avaliações)
  avaliacoes: number;
  minhaNota: number | null; // estrelas que o próprio aluno deu (null = não avaliou)
};

/* Curso da vitrine que o aluno ainda não tem */
export type CursoVitrine = ReturnType<typeof organizar> & { horas: number; modulos: number; totalAulas: number; media: number | null; avaliacoes: number };

type Medias = Map<string, { media: number; total: number }>;

// Quem não comprou não lê a grade do curso: os números vêm do resumo público
const paraVitrine = (c: Curso, medias: Medias, resumos: Map<string, ResumoCurso>): CursoVitrine => {
  const o = organizar(c);
  const r = resumos.get(o.id);
  return {
    ...o,
    media: medias.get(o.id)?.media ?? null,
    avaliacoes: medias.get(o.id)?.total ?? 0,
    horas: r?.horas ?? 1,
    modulos: r?.modulos ?? 0,
    totalAulas: r?.aulas ?? 0,
  };
};

export const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] || 'aluno';
export const certificadoLiberado = (c: CursoAluno) => c.percentual >= CERTIFICADO_MIN;

/* Nome, cursos matriculados, progresso e os outros cursos publicados (vitrine) do aluno logado */
export function useCursosAluno(sessao: Session) {
  const [estado, setEstado] = useState<{ nome: string; cursos: CursoAluno[]; outros: CursoVitrine[]; erro: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const uid = sessao.user.id;
      const [perfil, matriculas, progresso, catalogo, notas, minhas, resumos] = await Promise.all([
        supabase.from('academy_profiles').select('nome').eq('id', uid).maybeSingle(),
        supabase.from('academy_enrollments').select(`criado_em, academy_courses(${SELECT_CURSO})`).eq('user_id', uid).eq('ativo', true),
        supabase.from('academy_lesson_progress').select('lesson_id, atualizado_em').eq('user_id', uid).eq('concluida', true),
        supabase.from('academy_courses').select(SELECT_CURSO).eq('publicado', true),
        supabase.rpc('academy_media_cursos'), // se o 006 não rodou, volta erro e as médias ficam vazias
        supabase.from('academy_course_reviews').select('course_id, estrelas').eq('user_id', uid),
        buscarResumos(),
      ]);
      if (!vivo) return;
      const erro = matriculas.error || progresso.error;
      const medias: Medias = new Map(((notas.data ?? []) as { course_id: string; media: number; total: number }[])
        .map(n => [n.course_id, { media: Number(n.media), total: n.total }]));
      const minhasNotas = new Map(((minhas.data ?? []) as { course_id: string; estrelas: number | null }[])
        .map(r => [r.course_id, r.estrelas]));
      const feitasTodas = new Map((progresso.data ?? []).map(p => [p.lesson_id as string, new Date(p.atualizado_em as string).getTime()]));

      const cursos: CursoAluno[] = (matriculas.data ?? [])
        .map(m => m.academy_courses as unknown as Curso | null)
        .filter((c): c is Curso => !!c)
        .map(c => {
          const o = organizar(c);
          const feitas = new Set(o.aulas.filter(a => feitasTodas.has(a.id)).map(a => a.id));
          return {
            ...o,
            feitas,
            ultima: Math.max(0, ...o.aulas.map(a => feitasTodas.get(a.id) ?? 0)),
            proxima: o.aulas.find(a => !feitas.has(a.id)) ?? null,
            percentual: pct(feitas.size, o.aulas.length),
            media: medias.get(o.id)?.media ?? null,
            avaliacoes: medias.get(o.id)?.total ?? 0,
            faltamCertificado: Math.max(0, Math.ceil((CERTIFICADO_MIN / 100) * o.aulas.length) - feitas.size),
            minhaNota: minhasNotas.get(o.id) ?? null,
          };
        })
        .sort((a, b) => a.ordem - b.ordem);

      const meus = new Set(cursos.map(c => c.id));
      const outros = ((catalogo.data ?? []) as unknown as Curso[])
        .filter(c => !meus.has(c.id))
        .map(c => paraVitrine(c, medias, resumos))
        .sort((a, b) => a.ordem - b.ordem);

      setEstado({
        outros,
        nome: (perfil.data?.nome as string | undefined) || (sessao.user.user_metadata?.nome as string | undefined) || sessao.user.email || '',
        cursos,
        erro: erro ? 'Não foi possível carregar seus cursos agora. Recarregue a página.' : '',
      });
    })();
    return () => { vivo = false; };
  }, [sessao]);

  return estado;
}
