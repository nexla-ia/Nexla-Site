import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, Check, GraduationCap, MessageSquare, Star, UserPlus, Users } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando, BarraProgresso } from '../AppLayout';
import { Link } from '../router';
import { supabase, pct, CERTIFICADO_MIN } from '../supabase';
import { SoAdmin, AdminLayout, TituloAdmin } from './comum';

type LinhaCurso = {
  id: string; titulo: string; publicado: boolean; aulas: number;
  alunos: number; concluidos: number; certificados: number; progressoMedio: number;
  media: number | null; avaliacoes: number; comentarios: number;
};
type Cadastro = { id: string; nome: string | null; whatsapp: string | null; criado_em: string; marketing: boolean; cursos: number };
type Resumo = {
  cadastros: number; alunos: number; matriculas: number; certificados: number;
  mediaGeral: number | null; totalAvaliacoes: number; comentarios: number;
  cursos: LinhaCurso[]; recentes: Cadastro[];
};

const fmtWhats = (w: string | null) => {
  const d = (w ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : '—';
};
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const nota = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

async function carregar(): Promise<Resumo | string> {
  const [cursos, mats, prog, perfis, revs, coms] = await Promise.all([
    supabase.from('academy_courses').select('id, titulo, publicado, ordem, academy_modules(academy_lessons(id))').order('ordem'),
    supabase.from('academy_enrollments').select('user_id, course_id').eq('ativo', true),
    supabase.from('academy_lesson_progress').select('user_id, lesson_id').eq('concluida', true),
    supabase.from('academy_profiles').select('id, nome, whatsapp, role, criado_em, consentimento_marketing').order('criado_em', { ascending: false }),
    supabase.from('academy_course_reviews').select('course_id, estrelas').not('estrelas', 'is', null),
    supabase.from('academy_lesson_comments').select('lesson_id'),
  ]);
  const falha = [cursos, mats, prog, perfis, revs, coms].find(r => r.error);
  if (falha) return 'Não foi possível carregar os números. Confira se o 011_admin_visao.sql foi rodado no Supabase.';

  // aula → curso
  const cursoDaAula = new Map<string, string>();
  const aulasDoCurso = new Map<string, number>();
  for (const c of cursos.data ?? []) {
    const ids = ((c.academy_modules ?? []) as { academy_lessons: { id: string }[] }[]).flatMap(m => m.academy_lessons.map(a => a.id));
    ids.forEach(id => cursoDaAula.set(id, c.id as string));
    aulasDoCurso.set(c.id as string, ids.length);
  }
  // aulas concluídas por aluno e curso
  const feitas = new Map<string, number>(); // `${user}|${curso}` → n
  for (const p of prog.data ?? []) {
    const curso = cursoDaAula.get(p.lesson_id as string);
    if (curso) feitas.set(`${p.user_id}|${curso}`, (feitas.get(`${p.user_id}|${curso}`) ?? 0) + 1);
  }
  const comentariosPorCurso = new Map<string, number>();
  for (const c of coms.data ?? []) {
    const curso = cursoDaAula.get(c.lesson_id as string);
    if (curso) comentariosPorCurso.set(curso, (comentariosPorCurso.get(curso) ?? 0) + 1);
  }

  const alunos = (perfis.data ?? []).filter(p => p.role !== 'admin');
  const admins = new Set((perfis.data ?? []).filter(p => p.role === 'admin').map(p => p.id as string));
  const matriculas = (mats.data ?? []).filter(m => !admins.has(m.user_id as string));
  const notas = revs.data ?? [];

  let certificados = 0;
  const linhas: LinhaCurso[] = (cursos.data ?? []).map(c => {
    const id = c.id as string;
    const total = aulasDoCurso.get(id) ?? 0;
    const percentuais = matriculas.filter(m => m.course_id === id).map(m => pct(feitas.get(`${m.user_id}|${id}`) ?? 0, total));
    const certs = percentuais.filter(p => p >= CERTIFICADO_MIN).length;
    certificados += certs;
    const ns = notas.filter(r => r.course_id === id).map(r => r.estrelas as number);
    return {
      id, titulo: c.titulo as string, publicado: !!c.publicado, aulas: total,
      alunos: percentuais.length,
      concluidos: percentuais.filter(p => p >= 100).length,
      certificados: certs,
      progressoMedio: percentuais.length ? Math.round(percentuais.reduce((s, p) => s + p, 0) / percentuais.length) : 0,
      media: ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null,
      avaliacoes: ns.length,
      comentarios: comentariosPorCurso.get(id) ?? 0,
    };
  });

  const cursosPorAluno = new Map<string, number>();
  matriculas.forEach(m => cursosPorAluno.set(m.user_id as string, (cursosPorAluno.get(m.user_id as string) ?? 0) + 1));
  const todasNotas = notas.map(r => r.estrelas as number);

  return {
    cadastros: alunos.length,
    alunos: new Set(matriculas.map(m => m.user_id as string)).size,
    matriculas: matriculas.length,
    certificados,
    mediaGeral: todasNotas.length ? todasNotas.reduce((s, n) => s + n, 0) / todasNotas.length : null,
    totalAvaliacoes: todasNotas.length,
    comentarios: (coms.data ?? []).length,
    cursos: linhas,
    recentes: alunos.slice(0, 8).map(p => ({
      id: p.id as string, nome: p.nome as string | null, whatsapp: p.whatsapp as string | null,
      criado_em: p.criado_em as string, marketing: !!p.consentimento_marketing, cursos: cursosPorAluno.get(p.id as string) ?? 0,
    })),
  };
}

function Painel({ nome }: { nome: string }) {
  const [dados, setDados] = useState<Resumo | string | null>(null);
  useEffect(() => { carregar().then(setDados); }, []);

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloAdmin titulo="Visão geral" sub="Quantas pessoas estão na Academy, em quais cursos e como estão indo." />
        {!dados ? <Carregando /> : typeof dados === 'string' ? (
          <p className="text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{dados}</p>
        ) : (
          <>
            {/* Números gerais */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
              {[
                { icone: UserPlus,      v: dados.cadastros,    l: 'cadastros',       d: 'contas de aluno' },
                { icone: Users,         v: dados.alunos,       l: 'alunos',          d: 'com pelo menos 1 curso' },
                { icone: GraduationCap, v: dados.matriculas,   l: 'matrículas',      d: 'ativas' },
                { icone: Award,         v: dados.certificados, l: 'certificados',    d: 'alunos que concluíram' },
                { icone: Star,          v: dados.mediaGeral === null ? '—' : nota(dados.mediaGeral), l: 'nota média', d: `${dados.totalAvaliacoes} avaliações` },
              ].map(k => (
                <div key={k.l} className="rounded-2xl p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <k.icone size={18} strokeWidth={1.75} style={{ color: T.accent }} />
                  <div className="font-bold text-[28px] leading-none mt-3" style={display}>{k.v}</div>
                  <div className="text-[13.5px] font-medium mt-1" style={{ color: T.ink2 }}>{k.l}</div>
                  <div className="text-[12px]" style={{ color: T.mute }}>{k.d}</div>
                </div>
              ))}
            </div>

            {/* Por curso */}
            <section className="mb-10">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Alunos por curso</h2>
              <div className="rounded-2xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <table className="w-full min-w-[760px] text-[14px]">
                  <thead>
                    <tr className="text-left text-[12px] uppercase tracking-wide" style={{ color: T.mute, borderBottom: `1px solid ${T.rule}` }}>
                      <th className="px-5 py-3 font-semibold">Curso</th>
                      <th className="px-3 py-3 font-semibold text-right">Alunos</th>
                      <th className="px-3 py-3 font-semibold w-48">Progresso médio</th>
                      <th className="px-3 py-3 font-semibold text-right">Concluíram</th>
                      <th className="px-3 py-3 font-semibold text-right">Certificados</th>
                      <th className="px-3 py-3 font-semibold text-right">Nota</th>
                      <th className="px-5 py-3 font-semibold text-right">Comentários</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.cursos.map((c, i) => (
                      <tr key={c.id} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                        <td className="px-5 py-3.5">
                          <Link para={`/admin/curso/${c.id}`} className="font-semibold hover:underline underline-offset-4" style={{ color: T.ink }}>{c.titulo}</Link>
                          <span className="block text-[12px]" style={{ color: T.mute }}>{c.aulas} aulas{c.publicado ? '' : ' · rascunho'}</span>
                        </td>
                        <td className="px-3 py-3.5 text-right font-bold" style={display}>{c.alunos}</td>
                        <td className="px-3 py-3.5">
                          {c.alunos ? (
                            <div className="flex items-center gap-2"><div className="flex-1"><BarraProgresso valor={c.progressoMedio} /></div><span className="text-[12.5px] w-9 text-right">{c.progressoMedio}%</span></div>
                          ) : <span style={{ color: '#94A3B8' }}>—</span>}
                        </td>
                        <td className="px-3 py-3.5 text-right">{c.concluidos}</td>
                        <td className="px-3 py-3.5 text-right">{c.certificados}</td>
                        <td className="px-3 py-3.5 text-right whitespace-nowrap">
                          {c.media === null ? <span style={{ color: '#94A3B8' }}>—</span> : (
                            <span className="inline-flex items-center gap-1"><Star size={13} strokeWidth={0} fill="#F59E0B" /> {nota(c.media)} <span style={{ color: T.mute }}>({c.avaliacoes})</span></span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">{c.comentarios}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Cadastros recentes */}
            <section>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: T.mute }}>Cadastros recentes</h2>
                <Link para="/admin/comunidade" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: T.accent }}>
                  <MessageSquare size={14} /> {dados.comentarios} comentários na comunidade
                </Link>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                {dados.recentes.length === 0 && <p className="p-6 text-center text-[14px]" style={{ color: T.mute }}>Nenhum cadastro ainda.</p>}
                {dados.recentes.map((p, i) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.violet})` }}>{(p.nome?.trim()[0] || '?').toUpperCase()}</span>
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-semibold text-[14.5px]">{p.nome || 'Sem nome'}</p>
                      <p className="text-[12.5px]" style={{ color: T.mute }}>{fmtWhats(p.whatsapp)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12.5px]" style={{ color: T.mute }}>
                      <BookOpen size={13} /> {p.cursos ? `${p.cursos} curso${p.cursos > 1 ? 's' : ''}` : 'só cadastro'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12.5px] w-36" style={{ color: p.marketing ? 'var(--a-green)' : '#94A3B8' }}>
                      {p.marketing ? <><Check size={13} /> aceita marketing</> : 'sem marketing'}
                    </span>
                    <span className="text-[12.5px] w-14 text-right" style={{ color: T.mute }}>{fmtData(p.criado_em)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}

export default function VisaoGeral({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Painel nome={nome} />}</SoAdmin>;
}
