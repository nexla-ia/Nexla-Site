import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, Circle, Clock, Download, FileText, Lock, PlayCircle, Trophy, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando } from './AppLayout';
import { Link, navegar, parametro } from './router';
import { supabase, organizar, pct, minutos, CERTIFICADO_MIN, SELECT_CURSO, type Curso as CursoT } from './supabase';
import Comunidade from './Comunidade';
import Avaliacao from './Avaliacao';

type Sugestao = { slug: string; titulo: string; subtitulo: string | null };
type Dados = {
  nome: string; curso: ReturnType<typeof organizar>; matriculado: boolean; feitas: Set<string>; sugestao: Sugestao | null;
  avaliacaoPendente: boolean; // concluiu e ainda não avaliou nem dispensou o pedido
};

/* Próximo curso sugerido: o primeiro curso publicado (na ordem da vitrine) que o aluno ainda não tem */
async function buscarSugestao(cursoAtual: string, uid: string): Promise<Sugestao | null> {
  const [cat, mats] = await Promise.all([
    supabase.from('academy_courses').select('id, slug, titulo, subtitulo, ordem').eq('publicado', true).order('ordem'),
    supabase.from('academy_enrollments').select('course_id').eq('user_id', uid).eq('ativo', true),
  ]);
  const meus = new Set((mats.data ?? []).map(m => m.course_id as string));
  const c = (cat.data ?? []).find(x => x.id !== cursoAtual && !meus.has(x.id as string));
  return c ? { slug: c.slug as string, titulo: c.titulo as string, subtitulo: c.subtitulo as string | null } : null;
}

/* Materiais da aula (planilhas, PDFs): baixados por link temporário do Storage, só para quem pode assistir */
function MateriaisAula({ aulaId }: { aulaId: string }) {
  const [lista, setLista] = useState<{ id: string; nome: string; arquivo: string }[]>([]);
  const [baixando, setBaixando] = useState('');
  useEffect(() => {
    setLista([]);
    supabase.from('academy_lesson_materials').select('id, nome, arquivo').eq('lesson_id', aulaId).order('criado_em')
      .then(({ data }) => setLista((data ?? []) as { id: string; nome: string; arquivo: string }[]));
  }, [aulaId]);
  if (!lista.length) return null;

  const baixar = async (m: { id: string; nome: string; arquivo: string }) => {
    setBaixando(m.id);
    const { data } = await supabase.storage.from('academy-materiais').createSignedUrl(m.arquivo, 120, { download: m.nome });
    setBaixando('');
    if (data?.signedUrl) window.location.href = data.signedUrl;
  };

  return (
    <div className="mt-6">
      <p className="text-[13px] font-semibold mb-2.5" style={{ color: T.ink2 }}>Materiais da aula</p>
      <ul className="grid sm:grid-cols-2 gap-2.5">
        {lista.map(m => (
          <li key={m.id}>
            <button onClick={() => baixar(m)} disabled={baixando === m.id}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
              style={{ background: T.card, border: `1px solid ${T.rule}` }}>
              <FileText size={18} strokeWidth={1.75} style={{ color: T.accent }} />
              <span className="flex-1 min-w-0 text-[14px] truncate" style={{ color: T.ink }}>{m.nome}</span>
              <Download size={16} strokeWidth={1.75} style={{ color: T.mute }} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Bloco "próximo passo": curso sugerido para quem terminou */
function ProximoCurso({ s }: { s: Sugestao }) {
  return (
    <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#F8FAFC', border: `1px solid ${T.rule}` }}>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: T.accent }}>Próximo passo recomendado</p>
        <p className="font-bold text-[16.5px] leading-snug mt-0.5" style={display}>{s.titulo}</p>
        {s.subtitulo && <p className="text-[13.5px] mt-0.5" style={{ color: T.mute }}>{s.subtitulo}</p>}
      </div>
      <Link para={`/curso/${s.slug}`} className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-[14px] font-semibold shrink-0 transition-colors hover:bg-white"
        style={{ color: T.accent, border: '1px solid rgba(79,70,229,0.3)' }}>
        Conhecer curso <ArrowRight size={15} strokeWidth={2} />
      </Link>
    </div>
  );
}

export default function Curso({ sessao, slug }: { sessao: Session; slug: string }) {
  const [dados, setDados] = useState<Dados | null | 'nao-encontrado'>(null);
  const [aulaId, setAulaId] = useState<string | null>(parametro('aula'));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [parabens, setParabens] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const uid = sessao.user.id;
      const { data: c } = await supabase.from('academy_courses').select(SELECT_CURSO).eq('slug', slug).maybeSingle();
      if (!vivo) return;
      if (!c) return setDados('nao-encontrado');
      const curso = organizar(c as unknown as CursoT);
      const [perfil, mat, prog, sugestao, review] = await Promise.all([
        supabase.from('academy_profiles').select('nome, role').eq('id', uid).maybeSingle(),
        supabase.from('academy_enrollments').select('ativo').eq('course_id', curso.id).eq('user_id', uid).maybeSingle(),
        supabase.from('academy_lesson_progress').select('lesson_id').eq('user_id', uid).eq('concluida', true).in('lesson_id', curso.aulas.map(a => a.id)),
        buscarSugestao(curso.id, uid),
        supabase.from('academy_course_reviews').select('user_id').eq('course_id', curso.id).eq('user_id', uid).maybeSingle(),
      ]);
      if (!vivo) return;
      setDados({
        nome: (perfil.data?.nome as string | undefined) || sessao.user.email || '',
        curso,
        matriculado: !!mat.data?.ativo || perfil.data?.role === 'admin', // admin vê tudo no "Ver como aluno"
        feitas: new Set((prog.data ?? []).map(p => p.lesson_id as string)),
        sugestao,
        avaliacaoPendente: !review.error && !review.data, // sem a tabela (006 não rodado), não pergunta
      });
    })();
    return () => { vivo = false; };
  }, [sessao, slug]);

  const curso = dados && dados !== 'nao-encontrado' ? dados.curso : null;
  const pode = (id: string) => !!dados && dados !== 'nao-encontrado' && (dados.matriculado || !!curso?.aulas.find(a => a.id === id)?.gratuita);

  /* Aula aberta: a da URL, senão a primeira não concluída que o aluno pode ver */
  const aula = useMemo(() => {
    if (!curso || !dados || dados === 'nao-encontrado') return null;
    return curso.aulas.find(a => a.id === aulaId)
      ?? curso.aulas.find(a => !dados.feitas.has(a.id) && pode(a.id))
      ?? curso.aulas[0];
  }, [curso, aulaId, dados]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dados === null) return <AppLayout nome=""><Carregando /></AppLayout>;
  if (dados === 'nao-encontrado' || !curso || !aula) {
    return (
      <AppLayout nome="">
        <div className="text-center py-20">
          <p className="font-bold text-[22px]" style={display}>Curso não encontrado</p>
          <Link para="/painel" className="inline-flex items-center gap-1.5 mt-4 font-semibold" style={{ color: T.accent }}>
            <ArrowLeft size={15} /> Voltar para meus cursos
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { feitas, matriculado, nome, sugestao, avaliacaoPendente } = dados;
  const i = curso.aulas.findIndex(a => a.id === aula.id);
  const anterior = curso.aulas[i - 1];
  const proxima = curso.aulas[i + 1];
  const modulo = curso.academy_modules.find(m => m.academy_lessons.some(a => a.id === aula.id));
  const percentual = pct(feitas.size, curso.aulas.length);
  const concluida = feitas.has(aula.id);
  const liberada = pode(aula.id);

  const abrir = (id: string) => {
    setErro('');
    setAulaId(id);
    navegar(`/curso/${slug}?aula=${id}`, { substituir: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Marca/desmarca a aula como concluída. Com o player de verdade, isso acontece sozinho ao fim do vídeo. */
  const alternar = async () => {
    if (!liberada || salvando) return;
    setSalvando(true); setErro('');
    const novo = !concluida;
    const { error } = await supabase.from('academy_lesson_progress').upsert(
      { user_id: sessao.user.id, lesson_id: aula.id, concluida: novo, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' },
    );
    setSalvando(false);
    if (error) return setErro('Não foi possível salvar agora. Tente de novo.');
    const prox = new Set(feitas);
    if (novo) prox.add(aula.id); else prox.delete(aula.id);
    setDados({ ...dados, feitas: prox });
    if (novo && prox.size === curso.aulas.length) setParabens(true); // acabou de concluir a última aula
  };

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        {/* Cabeçalho do curso */}
        <Link para="/painel" className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-4 hover:underline underline-offset-4" style={{ color: T.mute }}>
          <ArrowLeft size={15} strokeWidth={1.75} /> Meus cursos
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(24px,3vw,34px)' }}>{curso.titulo}</h1>
            <div className="flex items-center gap-3 mt-3 max-w-md">
              <div className="flex-1"><BarraProgresso valor={percentual} /></div>
              <span className="text-[13.5px] font-semibold whitespace-nowrap">{percentual}% · {feitas.size}/{curso.aulas.length} aulas</span>
            </div>
          </div>
          {!matriculado || percentual >= 100 ? null : percentual >= CERTIFICADO_MIN ? (
            <Link para={`/certificado/${slug}`} className="inline-flex items-center gap-2 text-[13.5px] font-semibold px-3.5 py-2 rounded-xl self-start md:self-auto transition-colors hover:bg-green-100"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#15803D' }}>
              <Award size={16} strokeWidth={2} /> Ver certificado <ArrowRight size={15} strokeWidth={2} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-xl self-start md:self-auto"
              style={{ background: 'rgba(15,23,42,0.05)', color: T.mute }}>
              <Lock size={14} strokeWidth={2} /> Certificado libera em {CERTIFICADO_MIN}%
            </span>
          )}
        </div>

        {/* Curso concluído: certificado + próximo curso sugerido */}
        {matriculado && percentual >= 100 && (
          <div className="rounded-2xl p-5 mb-6 space-y-4" style={{ background: T.card, border: '1px solid rgba(34,197,94,0.3)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803D' }}>
                <Trophy size={21} strokeWidth={1.75} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-[15.5px]">Você concluiu este curso!</p>
                <p className="text-[14px]" style={{ color: T.mute }}>Pode rever qualquer aula quando quiser. Seu certificado já está disponível.</p>
              </div>
              <Link para={`/certificado/${slug}`} className="acad-btn inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white shrink-0">
                <Award size={16} strokeWidth={2} /> Ver certificado
              </Link>
            </div>
            {sugestao && <ProximoCurso s={sugestao} />}
          </div>
        )}

        {/* Quem ainda não tem o curso: vê as aulas grátis e o convite para adquirir */}
        {!matriculado && (
          <div className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.2)' }}>
            <div className="flex-1">
              <p className="font-semibold text-[15px]" style={{ color: T.ink }}>Você está vendo as aulas grátis deste curso</p>
              <p className="text-[14px] mt-0.5" style={{ color: T.mute }}>
                {curso.aulas.filter(a => a.gratuita).length} aula(s) liberada(s). O curso completo tem {curso.aulas.length} aulas e certificado.
              </p>
            </div>
            <a href={`https://wa.me/556999300101?text=${encodeURIComponent(`Olá! Quero o curso "${curso.titulo}" da Nexla Academy.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="acad-btn inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white shrink-0">
              Quero este curso <ArrowRight size={16} strokeWidth={2} className="acad-arrow" />
            </a>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          {/* Aula */}
          <section>
            <div className="aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
              style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText }}>
              {liberada ? (
                <>
                  <PlayCircle size={52} strokeWidth={1.25} style={{ color: '#A5B4FC' }} />
                  <p className="mt-3 text-[14px]" style={{ color: 'rgba(241,245,249,0.7)' }}>O vídeo desta aula entra aqui (Bunny Stream)</p>
                </>
              ) : (
                <>
                  <Lock size={40} strokeWidth={1.5} style={{ color: '#A5B4FC' }} />
                  <p className="mt-3 font-semibold">Aula disponível para alunos matriculados</p>
                  <p className="mt-1 text-[14px]" style={{ color: 'rgba(241,245,249,0.7)' }}>As aulas gratuitas da lista estão liberadas para você.</p>
                </>
              )}
            </div>

            <div className="mt-6">
              {modulo && <p className="text-[13px] font-medium" style={{ color: T.accent }}>{modulo.titulo}</p>}
              <h2 className="font-bold text-[22px] md:text-[26px] leading-snug mt-1" style={display}>{aula.titulo}</h2>
              <p className="flex items-center gap-1.5 text-[13.5px] mt-2" style={{ color: T.mute }}>
                <Clock size={14} strokeWidth={1.75} /> {minutos(aula.duracao_seg)}
                {aula.gratuita && <span className="ml-2 text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,70,229,0.08)', color: T.accent }}>Aula grátis</span>}
              </p>
              {aula.descricao && <p className="text-[15px] leading-relaxed mt-4" style={{ color: T.ink2 }}>{aula.descricao}</p>}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-6">
                <button onClick={alternar} disabled={!liberada || salvando}
                  className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[10px] text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={concluida
                    ? { background: 'rgba(34,197,94,0.1)', color: '#15803D', border: '1px solid rgba(34,197,94,0.35)' }
                    : { background: T.card, color: T.ink, border: `1px solid ${T.rule}` }}>
                  {concluida ? <><CheckCircle2 size={18} strokeWidth={2} /> Aula concluída</> : <><Check size={18} strokeWidth={2} /> Marcar como concluída</>}
                </button>
                <div className="flex gap-3 sm:ml-auto">
                  {anterior && (
                    <button onClick={() => abrir(anterior.id)} className="inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-[10px] text-[14px] font-medium hover:bg-white"
                      style={{ color: T.mute, border: `1px solid ${T.rule}` }}>
                      <ArrowLeft size={16} strokeWidth={1.75} /> Anterior
                    </button>
                  )}
                  {proxima && (
                    <button onClick={() => abrir(proxima.id)}
                      className="acad-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[10px] text-[15px] font-semibold text-white">
                      Próxima aula <ArrowRight size={17} strokeWidth={2} className="acad-arrow" />
                    </button>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {erro && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-[14px]" style={{ color: '#B91C1C' }}>{erro}</motion.p>}
              </AnimatePresence>
            </div>

            {liberada && <MateriaisAula aulaId={aula.id} />}

            {/* Comentários da aula (só para quem pode assistir a ela) */}
            {liberada && <Comunidade sessao={sessao} aulaId={aula.id} />}
          </section>

          {/* Lista de aulas */}
          <aside className="rounded-2xl overflow-hidden lg:sticky lg:top-24" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.rule}` }}>
              <p className="font-semibold text-[15px]">Conteúdo do curso</p>
              <p className="text-[12.5px] mt-0.5" style={{ color: T.mute }}>{feitas.size} de {curso.aulas.length} aulas concluídas</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {curso.academy_modules.map((m, mi) => {
                const feitasMod = m.academy_lessons.filter(a => feitas.has(a.id)).length;
                return (
                  <div key={m.id} style={{ borderBottom: `1px solid ${T.rule}` }}>
                    <div className="px-5 pt-4 pb-2 flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-semibold" style={{ color: T.ink2 }}>{mi + 1}. {m.titulo}</p>
                      <span className="text-[11.5px] shrink-0" style={{ color: T.mute }}>{feitasMod}/{m.academy_lessons.length}</span>
                    </div>
                    <ul className="pb-2">
                      {m.academy_lessons.map(a => {
                        const atual = a.id === aula.id;
                        const ok = feitas.has(a.id);
                        const bloqueada = !matriculado && !a.gratuita;
                        return (
                          <li key={a.id}>
                            <button onClick={() => abrir(a.id)}
                              className="w-full flex items-start gap-3 px-5 py-2.5 text-left transition-colors hover:bg-slate-50"
                              style={atual ? { background: 'rgba(79,70,229,0.07)', boxShadow: `inset 3px 0 0 ${T.accent}` } : undefined}>
                              <span className="mt-0.5 shrink-0">
                                {ok ? <CheckCircle2 size={18} strokeWidth={2} color="#22C55E" fill="rgba(34,197,94,0.12)" />
                                  : bloqueada ? <Lock size={16} strokeWidth={1.75} style={{ color: '#94A3B8' }} />
                                  : atual ? <PlayCircle size={18} strokeWidth={1.75} style={{ color: T.accent }} />
                                  : <Circle size={18} strokeWidth={1.5} style={{ color: '#CBD5E1' }} />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[14px] leading-snug" style={{ color: atual ? T.ink : T.ink2, fontWeight: atual ? 600 : 400 }}>{a.titulo}</span>
                                <span className="block text-[12px] mt-0.5" style={{ color: T.mute }}>
                                  {minutos(a.duracao_seg)}{a.gratuita && ' · grátis'}{ok && ' · assistida'}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </motion.div>

      {/* Avaliação do curso: depois dos parabéns, uma única vez por curso */}
      <AnimatePresence>
        {matriculado && percentual >= 100 && avaliacaoPendente && !parabens && (
          <Avaliacao sessao={sessao} cursoId={curso.id} titulo={curso.titulo}
            onFim={() => setDados({ ...dados, avaliacaoPendente: false })} />
        )}
      </AnimatePresence>

      {/* Parabéns: aparece no momento em que o aluno conclui a última aula */}
      <AnimatePresence>
        {parabens && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setParabens(false)}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="parabens-titulo"
              initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.35, ease }}
              className="relative w-full max-w-lg rounded-2xl p-7 md:p-8" style={{ background: T.card }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setParabens(false)} aria-label="Fechar"
                className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
                <X size={18} strokeWidth={1.75} />
              </button>
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803D' }}>
                <Trophy size={26} strokeWidth={1.75} />
              </span>
              <h2 id="parabens-titulo" className="font-bold text-[24px] md:text-[26px] leading-tight mt-5" style={display}>
                Parabéns, {nome.trim().split(/\s+/)[0] || 'aluno'}! Você concluiu o curso.
              </h2>
              <p className="text-[15px] mt-2" style={{ color: T.mute }}>
                Você terminou todas as {curso.aulas.length} aulas de <strong style={{ color: T.ink2 }}>{curso.titulo}</strong>. Seu certificado já está liberado.
              </p>
              <Link para={`/certificado/${slug}`}
                className="acad-btn mt-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-[10px] text-[15px] font-semibold text-white">
                <Award size={17} strokeWidth={2} /> Ver e baixar meu certificado
              </Link>
              {sugestao && <div className="mt-5"><ProximoCurso s={sugestao} /></div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
