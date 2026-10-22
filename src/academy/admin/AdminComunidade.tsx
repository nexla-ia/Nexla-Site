import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CornerDownRight, ExternalLink, MessageSquare, Send, Star } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando } from '../AppLayout';
import { Link } from '../router';
import { supabase } from '../supabase';
import { SoAdmin, AdminLayout, TituloAdmin, inputCls } from './comum';

type InfoAula = { titulo: string; modulo: string; cursoId: string; cursoTitulo: string; slug: string };
type Comentario = { id: string; lesson_id: string; parent_id: string | null; texto: string; autor_nome: string | null; autor_admin: boolean; criado_em: string };
type Avaliacao = { course_id: string; user_id: string; estrelas: number; comentario: string | null; atualizado_em: string };

const AMBAR = '#F59E0B';
const quando = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `há ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) { const d = Math.floor(s / 86400); return `há ${d} dia${d > 1 ? 's' : ''}`; }
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const Estrelas = ({ n, tam = 14 }: { n: number; tam?: number }) => (
  <span className="inline-flex gap-0.5" aria-label={`${n} de 5 estrelas`}>
    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={tam} strokeWidth={1.5} color={i <= n ? AMBAR : '#CBD5E1'} fill={i <= n ? AMBAR : 'transparent'} />)}
  </span>
);

function Tela({ nome, sessao }: { nome: string; sessao: Session }) {
  const [aba, setAba] = useState<'comentarios' | 'avaliacoes'>('comentarios');
  const [filtro, setFiltro] = useState('');
  const [aulas, setAulas] = useState<Map<string, InfoAula> | null>(null);
  const [cursos, setCursos] = useState<{ id: string; titulo: string }[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const [erro, setErro] = useState('');
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    const [cs, cm, av, pf] = await Promise.all([
      supabase.from('academy_courses').select('id, slug, titulo, ordem, academy_modules(titulo, academy_lessons(id, titulo))').order('ordem'),
      supabase.from('academy_lesson_comments').select('id, lesson_id, parent_id, texto, autor_nome, autor_admin, criado_em').order('criado_em', { ascending: false }).limit(300),
      supabase.from('academy_course_reviews').select('course_id, user_id, estrelas, comentario, atualizado_em').not('estrelas', 'is', null).order('atualizado_em', { ascending: false }),
      supabase.from('academy_profiles').select('id, nome'),
    ]);
    if (cs.error || cm.error || av.error || pf.error) setErro('Parte dos dados não carregou. Confira se o 011_admin_visao.sql foi rodado no Supabase.');
    const mapa = new Map<string, InfoAula>();
    for (const c of cs.data ?? []) {
      for (const m of (c.academy_modules ?? []) as { titulo: string; academy_lessons: { id: string; titulo: string }[] }[]) {
        for (const a of m.academy_lessons) mapa.set(a.id, { titulo: a.titulo, modulo: m.titulo, cursoId: c.id as string, cursoTitulo: c.titulo as string, slug: c.slug as string });
      }
    }
    setAulas(mapa);
    setCursos((cs.data ?? []).map(c => ({ id: c.id as string, titulo: c.titulo as string })));
    setComentarios((cm.data ?? []) as Comentario[]);
    setAvaliacoes((av.data ?? []) as Avaliacao[]);
    setNomes(new Map((pf.data ?? []).map(p => [p.id as string, (p.nome as string) || 'Aluno'])));
  };
  useEffect(() => { carregar(); }, []);

  const responder = async (c: Comentario) => {
    if (!resposta.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from('academy_lesson_comments').insert({
      lesson_id: c.lesson_id, user_id: sessao.user.id, parent_id: c.parent_id ?? c.id, texto: resposta.trim(),
    });
    setEnviando(false);
    if (error) return setErro('Não foi possível enviar a resposta.');
    setResposta(''); setRespondendo(null);
    carregar();
  };

  const comentariosFiltrados = useMemo(
    () => comentarios.filter(c => !filtro || aulas?.get(c.lesson_id)?.cursoId === filtro), [comentarios, filtro, aulas]);
  const avaliacoesFiltradas = useMemo(() => avaliacoes.filter(a => !filtro || a.course_id === filtro), [avaliacoes, filtro]);
  const media = avaliacoesFiltradas.length ? avaliacoesFiltradas.reduce((s, a) => s + a.estrelas, 0) / avaliacoesFiltradas.length : 0;
  const distribuicao = [5, 4, 3, 2, 1].map(n => ({ n, q: avaliacoesFiltradas.filter(a => a.estrelas === n).length }));
  const tituloCurso = (id: string) => cursos.find(c => c.id === id)?.titulo ?? 'Curso';

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloAdmin titulo="Comunidade" sub="O que os alunos estão falando em cada aula e o que acharam de cada curso." />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderBottom: `1px solid ${T.rule}` }}>
          <div className="flex gap-1" role="tablist">
            {[
              { id: 'comentarios' as const, texto: `Comentários das aulas (${comentariosFiltrados.length})` },
              { id: 'avaliacoes' as const,  texto: `Avaliações dos cursos (${avaliacoesFiltradas.length})` },
            ].map(a => (
              <button key={a.id} role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}
                className="px-4 h-11 text-[14.5px] font-semibold -mb-px"
                style={{ color: aba === a.id ? T.accent : T.mute, borderBottom: `2px solid ${aba === a.id ? T.accent : 'transparent'}` }}>
                {a.texto}
              </button>
            ))}
          </div>
          <div className="pb-3 md:w-72">
            <select className={inputCls} value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por curso">
              <option value="">Todos os cursos</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
            </select>
          </div>
        </div>

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {!aulas ? <Carregando /> : aba === 'comentarios' ? (
          <div className="space-y-3">
            {comentariosFiltrados.length === 0 && (
              <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
                <MessageSquare size={26} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
                <p className="text-[14.5px] mt-2" style={{ color: T.mute }}>Nenhum comentário ainda.</p>
              </div>
            )}
            {comentariosFiltrados.map(c => {
              const a = aulas.get(c.lesson_id);
              return (
                <article key={c.id} className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-[12.5px]" style={{ color: T.mute }}>
                      <strong style={{ color: T.accent }}>{a?.cursoTitulo ?? 'Curso'}</strong> › {a?.modulo} › {a?.titulo ?? 'Aula'}
                    </p>
                    {a && (
                      <Link para={`/curso/${a.slug}?aula=${c.lesson_id}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: T.accent }}>
                        Ver na aula <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[14.5px]">{c.autor_nome || 'Aluno'}</span>
                    {c.autor_admin && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--a-orange)' }}>Instrutor</span>}
                    {c.parent_id && <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: T.mute }}><CornerDownRight size={12} /> resposta</span>}
                    <span className="text-[12.5px]" style={{ color: '#94A3B8' }}>· {quando(c.criado_em)}</span>
                  </div>
                  <p className="text-[14.5px] leading-relaxed mt-1.5 whitespace-pre-wrap break-words" style={{ color: T.ink2 }}>{c.texto}</p>

                  {!c.autor_admin && (respondendo === c.id ? (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <input className={inputCls} autoFocus value={resposta} onChange={e => setResposta(e.target.value.slice(0, 2000))}
                        placeholder="Responder como instrutor…" onKeyDown={e => { if (e.key === 'Enter') responder(c); }} />
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setRespondendo(null)} className="h-11 px-3 rounded-[10px] text-[13.5px] hover:bg-slate-50" style={{ color: T.mute }}>Cancelar</button>
                        <button onClick={() => responder(c)} disabled={enviando || !resposta.trim()}
                          className="acad-btn inline-flex items-center gap-1.5 h-11 px-4 rounded-[10px] text-[13.5px] font-semibold text-white">
                          <Send size={14} /> {enviando ? 'Enviando…' : 'Responder'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setRespondendo(c.id); setResposta(''); }} className="mt-2 text-[13px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
                      Responder como instrutor
                    </button>
                  ))}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid lg:grid-cols-[18rem_1fr] gap-6 items-start">
            {/* Resumo das notas */}
            <aside className="rounded-2xl p-6 lg:sticky lg:top-24" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
              <p className="text-[13px] font-semibold" style={{ color: T.mute }}>{filtro ? tituloCurso(filtro) : 'Todos os cursos'}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-bold text-[40px] leading-none" style={display}>{avaliacoesFiltradas.length ? media.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—'}</span>
                <span className="text-[14px]" style={{ color: T.mute }}>de 5</span>
              </div>
              <div className="mt-1.5"><Estrelas n={Math.round(media)} tam={16} /></div>
              <p className="text-[13px] mt-1" style={{ color: T.mute }}>{avaliacoesFiltradas.length} avaliação(ões)</p>
              <div className="space-y-1.5 mt-5">
                {distribuicao.map(d => (
                  <div key={d.n} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-3" style={{ color: T.mute }}>{d.n}</span>
                    <Star size={12} strokeWidth={0} fill={AMBAR} />
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--a-track)' }}>
                      <div className="h-full rounded-full" style={{ width: `${avaliacoesFiltradas.length ? (d.q / avaliacoesFiltradas.length) * 100 : 0}%`, background: AMBAR }} />
                    </div>
                    <span className="w-6 text-right" style={{ color: T.mute }}>{d.q}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* Avaliações */}
            <div className="space-y-3">
              {avaliacoesFiltradas.length === 0 && (
                <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
                  <Star size={26} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
                  <p className="text-[14.5px] mt-2" style={{ color: T.mute }}>Nenhuma avaliação ainda. O pedido aparece quando o aluno conclui o curso.</p>
                </div>
              )}
              {avaliacoesFiltradas.map(a => (
                <article key={`${a.user_id}-${a.course_id}`} className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Estrelas n={a.estrelas} />
                      <span className="font-semibold text-[14.5px]">{nomes.get(a.user_id) ?? 'Aluno'}</span>
                    </div>
                    <span className="text-[12.5px]" style={{ color: '#94A3B8' }}>{quando(a.atualizado_em)}</span>
                  </div>
                  {!filtro && <p className="text-[12.5px] mt-1" style={{ color: T.accent }}>{tituloCurso(a.course_id)}</p>}
                  <p className="text-[14.5px] leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: a.comentario ? T.ink2 : '#94A3B8' }}>
                    {a.comentario || 'Deu a nota sem comentário.'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}

export default function AdminComunidade({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Tela nome={nome} sessao={sessao} />}</SoAdmin>;
}
