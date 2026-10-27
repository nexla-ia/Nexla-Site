import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, Clock, Download, FileText, Lock, PanelLeft, PlayCircle, RectangleHorizontal, Trophy, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando } from './AppLayout';
import { Link, navegar, parametro } from './router';
import { supabase, organizar, pct, minutos, CERTIFICADO_MIN, SELECT_CURSO, type Aula, type Curso as CursoT } from './supabase';
import Comunidade from './Comunidade';
import Avaliacao from './Avaliacao';
import PaginaCurso from './PaginaCurso';
import VideoAula from './Video';
import { registrarAula } from './rastreio';
import { BotaoTema } from './tema';
import { lerPreferencia, salvarPreferencia } from './preferencias';

type Sugestao = { slug: string; titulo: string; subtitulo: string | null };
type Dados = {
  nome: string; curso: ReturnType<typeof organizar>; matriculado: boolean; feitas: Set<string>; sugestao: Sugestao | null;
  avaliacaoPendente: boolean; // concluiu e ainda não avaliou nem dispensou o pedido
  admin: boolean;             // admin no "Ver como aluno": sem certificado, sugestão nem avaliação
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
    <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: 'var(--a-soft2)', border: `1px solid ${T.rule}` }}>
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

/* Fim da aula (estilo Alura): chama a próxima aula com contagem; o aluno pode ir na hora ou cancelar.
   Com "próxima aula automática" desligada no perfil, não conta: espera o aluno clicar. */
function FimAula({ proxima, ir, cancelar }: { proxima: Aula; ir: () => void; cancelar: () => void }) {
  const [auto] = useState(() => lerPreferencia('proximaAuto'));
  const [resta, setResta] = useState(5);
  useEffect(() => {
    if (!auto) return;
    if (resta <= 0) { ir(); return; }
    const t = setTimeout(() => setResta(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resta]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(11,16,32,0.88)', backdropFilter: 'blur(4px)', color: '#F1F5F9' }}>
      <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#86EFAC' }}>
        <CheckCircle2 size={15} strokeWidth={2} /> Aula concluída
      </p>
      <p className="text-[13px] mt-4" style={{ color: 'rgba(241,245,249,0.6)' }}>{auto ? `Próxima aula em ${resta}s` : 'Próxima aula'}</p>
      <p className="font-bold text-[20px] sm:text-[24px] leading-snug mt-1 max-w-lg" style={display}>{proxima.titulo}</p>
      <div className="flex items-center gap-3 mt-6">
        <button onClick={ir} className="acad-btn inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white">
          <PlayCircle size={17} strokeWidth={2} /> Assistir agora
        </button>
        <button onClick={cancelar} className="h-11 px-4 rounded-[10px] text-[14px] font-medium hover:bg-white/10" style={{ color: 'rgba(241,245,249,0.75)' }}>
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}

/* Player da aula (Bunny Stream) com a chamada da próxima aula por cima quando a aula acaba */
function Player({ aulaId, liberada, fim, proxima, abrir, setFim, onFimVideo, marca, userId }: {
  aulaId: string; liberada: boolean; fim: boolean; proxima?: Aula; abrir: (id: string) => void; setFim: (v: boolean) => void; onFimVideo: () => void;
  marca?: string; userId?: string;
}) {
  const chamada = (
    <AnimatePresence>
      {fim && proxima && <FimAula proxima={proxima} ir={() => abrir(proxima.id)} cancelar={() => setFim(false)} />}
    </AnimatePresence>
  );
  if (liberada) return <VideoAula aulaId={aulaId} onFim={onFimVideo} marca={marca} userId={userId}>{chamada}</VideoAula>;
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
      style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText, border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -32px rgba(15,23,42,0.7)' }}>
      {(
        <>
          <Lock size={40} strokeWidth={1.5} style={{ color: '#A5B4FC' }} />
          <p className="mt-3 font-semibold">Aula disponível para alunos matriculados</p>
          <p className="mt-1 text-[14px]" style={{ color: T.darkMute }}>As aulas gratuitas da lista estão liberadas para você.</p>
        </>
      )}
      {chamada}
    </div>
  );
}

/* Grade do curso na barra lateral (estilo Alura): módulos que abrem e fecham, com o status de cada aula */
function ListaAulas({ curso, aulaId, feitas, matriculado, percentual, abrir }: {
  curso: ReturnType<typeof organizar>; aulaId: string; feitas: Set<string>; matriculado: boolean; percentual: number; abrir: (id: string) => void;
}) {
  const moduloAtual = curso.academy_modules.find(m => m.academy_lessons.some(a => a.id === aulaId))?.id;
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(moduloAtual ? [moduloAtual] : []));
  useEffect(() => { if (moduloAtual) setAbertos(s => (s.has(moduloAtual) ? s : new Set(s).add(moduloAtual))); }, [moduloAtual]);
  const alternar = (id: string) => setAbertos(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div style={{ color: T.ink }}>
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${T.rule}` }}>
        <p className="text-[12.5px] font-medium" style={{ color: T.mute }}>Seu progresso</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--a-track)' }}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${percentual}%`, background: percentual >= 100 ? '#22C55E' : `linear-gradient(90deg, ${T.accent}, ${T.violet})` }} />
          </div>
          <span className="text-[13px] font-semibold">{percentual}%</span>
        </div>
        <p className="text-[12.5px] mt-1.5" style={{ color: T.mute }}>
          {feitas.size} de {curso.aulas.length} aulas concluídas{percentual < CERTIFICADO_MIN && ' · certificado ao concluir todas'}
        </p>
      </div>

      {curso.academy_modules.map((m, mi) => {
        const aberto = abertos.has(m.id);
        const feitasMod = m.academy_lessons.filter(a => feitas.has(a.id)).length;
        const completo = feitasMod === m.academy_lessons.length && m.academy_lessons.length > 0;
        return (
          <div key={m.id} style={{ borderBottom: `1px solid ${T.rule}` }}>
            <button onClick={() => alternar(m.id)} aria-expanded={aberto}
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50">
              <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[12px] font-bold"
                style={completo ? { background: 'rgba(34,197,94,0.12)', color: 'var(--a-green)' } : { background: 'rgba(79,70,229,0.08)', color: T.accent }}>
                {completo ? <Check size={15} strokeWidth={2.5} /> : String(mi + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold leading-snug">{m.titulo}</span>
                <span className="block text-[12px] mt-0.5" style={{ color: T.mute }}>
                  {feitasMod}/{m.academy_lessons.length} aulas · {minutos(m.academy_lessons.reduce((s, a) => s + a.duracao_seg, 0))}
                </span>
              </span>
              <ChevronDown size={17} strokeWidth={1.75} className="shrink-0 transition-transform" style={{ color: T.mute, transform: aberto ? 'rotate(180deg)' : 'none' }} />
            </button>
            {aberto && (
              <ul className="pb-2">
                {m.academy_lessons.map(a => {
                  const atual = a.id === aulaId;
                  const ok = feitas.has(a.id);
                  const bloqueada = !matriculado && !a.gratuita;
                  return (
                    <li key={a.id}>
                      <button onClick={() => abrir(a.id)} aria-current={atual ? 'true' : undefined}
                        className="w-full flex items-start gap-3 pl-6 pr-5 py-2.5 text-left transition-colors hover:bg-slate-50"
                        style={atual ? { background: 'rgba(79,70,229,0.07)', boxShadow: `inset 3px 0 0 ${T.accent}` } : undefined}>
                        <span className="mt-0.5 shrink-0">
                          {ok ? <CheckCircle2 size={17} strokeWidth={2} color="#22C55E" fill="rgba(34,197,94,0.12)" />
                            : bloqueada ? <Lock size={15} strokeWidth={1.75} style={{ color: '#94A3B8' }} />
                            : atual ? <PlayCircle size={17} strokeWidth={1.75} style={{ color: T.accent }} />
                            : <Circle size={17} strokeWidth={1.5} style={{ color: '#CBD5E1' }} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] leading-snug" style={{ color: atual ? T.ink : T.ink2, fontWeight: atual ? 600 : 400 }}>{a.titulo}</span>
                          <span className="block text-[12px] mt-0.5" style={{ color: T.mute }}>{minutos(a.duracao_seg)}{a.gratuita && ' · grátis'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

const lerTeatro = () => lerPreferencia('teatro');

export default function Curso({ sessao, slug }: { sessao: Session; slug: string }) {
  const [dados, setDados] = useState<Dados | null | 'nao-encontrado'>(null);
  const [aulaId, setAulaId] = useState<string | null>(parametro('aula'));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [parabens, setParabens] = useState(false);
  const [teatro, setTeatro] = useState(lerTeatro);
  const [fim, setFim] = useState(false); // aula acabou de ser concluída: mostra a chamada da próxima
  const [gaveta, setGaveta] = useState(false); // celular: aulas do curso abertas

  const alternarTeatro = () => setTeatro(t => {
    salvarPreferencia('teatro', !t);
    return !t;
  });
  // Tecla T liga/desliga o modo teatro, como no YouTube (menos quando está escrevendo um comentário)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (e.key === 'Escape') { setGaveta(false); return; }
      if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || e.altKey || alvo.closest('input, textarea, select, [contenteditable]')) return;
      alternarTeatro();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);

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
        admin: perfil.data?.role === 'admin',
        feitas: new Set((prog.data ?? []).map(p => p.lesson_id as string)),
        sugestao,
        avaliacaoPendente: perfil.data?.role !== 'admin' && !review.error && !review.data, // sem a tabela (006 não rodado), não pergunta
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

  // Funil "onde os alunos abandonam": registra cada aula aberta (não conta o admin)
  useEffect(() => {
    if (!aula || !curso || !dados || dados === 'nao-encontrado' || dados.admin) return;
    if (dados.matriculado || aula.gratuita) registrarAula(sessao.user.id, curso.id, aula.id);
  }, [aula?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dados === null) return <AppLayout nome=""><Carregando /></AppLayout>;
  // Quem não comprou vê a página de apresentação (sem a grade do curso), com só o 1º vídeo
  if (dados !== 'nao-encontrado' && !dados.matriculado) return <PaginaCurso sessao={sessao} slug={slug} nome={dados.nome} />;
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

  const { feitas, matriculado, nome, sugestao, avaliacaoPendente, admin } = dados;

  const i = curso.aulas.findIndex(a => a.id === aula.id);
  const anterior = curso.aulas[i - 1];
  const proxima = curso.aulas[i + 1];
  const modulo = curso.academy_modules.find(m => m.academy_lessons.some(a => a.id === aula.id));
  const percentual = pct(feitas.size, curso.aulas.length);
  const concluida = feitas.has(aula.id);
  const liberada = pode(aula.id);

  const abrir = (id: string) => {
    setErro('');
    setFim(false);
    setGaveta(false);
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
    if (error) {
      return setErro(/assista_aula/.test(error.message)
        ? 'Assista à aula para marcar como concluída.'
        : 'Não foi possível salvar agora. Tente de novo.');
    }
    const prox = new Set(feitas);
    if (novo) prox.add(aula.id); else prox.delete(aula.id);
    setDados({ ...dados, feitas: prox });
    // Concluiu todas as aulas: registra o certificado na hora (o servidor confere e não duplica)
    if (novo && !admin && prox.size === curso.aulas.length) {
      supabase.rpc('academy_emitir_certificado', { p_course: curso.id }).then(() => undefined, () => undefined);
    }
    if (novo && prox.size === curso.aulas.length && !admin) setParabens(true); // acabou de concluir a última aula
    else if (novo && proxima) setFim(true); // chama a próxima aula no player
  };

  // Botão do topo: no computador esconde/mostra a barra de aulas (modo teatro); no celular abre a gaveta
  const alternarMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) alternarTeatro();
    else setGaveta(true);
  };
  const nModulo = curso.academy_modules.findIndex(m => m.id === modulo?.id) + 1;
  /* Módulo, título e duração da aula (no modo teatro vai para baixo do vídeo, como no YouTube) */
  const cabecalhoAula = (
    <div>
      <p className="text-[13px] font-medium" style={{ color: T.accent }}>
        Módulo {nModulo}{modulo && ` · ${modulo.titulo}`}
      </p>
      <div className="flex items-baseline justify-between gap-4 mt-1">
        <h1 className="font-bold leading-snug" style={{ ...display, fontSize: 'clamp(22px,2.6vw,30px)' }}>{aula.titulo}</h1>
        <span className="hidden sm:block text-[13px] shrink-0" style={{ color: T.mute }}>Aula {i + 1} de {curso.aulas.length}</span>
      </div>
      <p className="flex items-center gap-1.5 text-[13px] mt-1.5" style={{ color: T.mute }}>
        <Clock size={14} strokeWidth={1.75} /> {minutos(aula.duracao_seg)}
        {aula.gratuita && <span className="ml-2 text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,70,229,0.08)', color: T.accent }}>Aula grátis</span>}
      </p>
    </div>
  );

  const lista = <ListaAulas curso={curso} aulaId={aula.id} feitas={feitas} matriculado={matriculado} percentual={percentual} abrir={abrir} />;

  return (
    <div className="min-h-screen" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Topo */}
      <header className="sticky top-0 z-30 h-14 flex items-center gap-2 sm:gap-3 px-2 sm:px-4" style={{ background: T.card, borderBottom: `1px solid ${T.rule}` }}>
        <button onClick={alternarMenu} title={teatro ? 'Mostrar as aulas' : 'Esconder as aulas (T)'} aria-label="Aulas do curso"
          className="h-10 px-2.5 shrink-0 rounded-lg inline-flex items-center gap-2 transition-colors hover:bg-slate-100" style={{ color: T.ink2 }}>
          <PanelLeft size={20} strokeWidth={1.75} /> <span className="lg:hidden text-[13.5px] font-medium">Aulas</span>
        </button>
        <Link para={admin ? '/admin/cursos' : '/painel'} className="shrink-0 hidden sm:block" aria-label="Nexla Academy">
          <img src={LOGO} alt="" className="w-7 h-7 object-contain" />
        </Link>
        <span className="hidden sm:block w-px h-6 shrink-0" style={{ background: T.rule }} />
        <p className="font-semibold text-[14.5px] truncate min-w-0">{curso.titulo}</p>
        <div className="ml-auto flex items-center gap-2 sm:gap-4 shrink-0">
          <BotaoTema />
          <div className="hidden md:flex items-center gap-2.5 w-40">
            <div className="flex-1"><BarraProgresso valor={percentual} /></div>
            <span className="text-[13px] font-semibold">{percentual}%</span>
          </div>
          {matriculado && !admin && percentual >= CERTIFICADO_MIN && (
            <Link para={`/certificado/${slug}`} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13.5px] font-semibold transition-colors hover:bg-green-100"
              style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--a-green)' }}>
              <Award size={15} strokeWidth={2} /> Certificado
            </Link>
          )}
          <Link para={admin ? '/admin/cursos' : '/painel'} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13.5px] font-medium transition-colors hover:bg-slate-100" style={{ color: T.ink2 }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> <span className="hidden sm:inline">{admin ? 'Voltar ao admin' : 'Meus cursos'}</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Barra lateral com as aulas (some no modo teatro) */}
        <aside className="hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden transition-[width] duration-300"
          style={{ width: teatro ? 0 : 320, background: T.card, borderRight: teatro ? 'none' : `1px solid ${T.rule}` }} aria-hidden={teatro}>
          <div className="w-80 h-full overflow-y-auto acad-scroll">{lista}</div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className={`mx-auto px-4 sm:px-8 py-6 md:py-8 transition-[max-width] duration-300 ${teatro ? 'max-w-[1500px]' : 'max-w-5xl'}`}>
            {admin && (
              <p className="mb-4 text-[13px] rounded-lg px-3 py-2" style={{ background: 'var(--a-soft)', color: T.ink2 }}>
                <strong>Modo admin:</strong> você está vendo o curso como um aluno que comprou.
              </p>
            )}

            {!teatro && cabecalhoAula}

            <div className={`mx-auto ${teatro ? '' : 'mt-5'}`} style={teatro ? { maxWidth: 'calc((100vh - 13.5rem) * 16 / 9)' } : undefined}>
              <Player key={aula.id} aulaId={aula.id} liberada={liberada} fim={fim} proxima={proxima} abrir={abrir} setFim={setFim}
                onFimVideo={() => { if (!concluida && lerPreferencia('concluirAuto')) alternar(); else if (concluida && proxima) setFim(true); }}
                marca={sessao.user.email} userId={admin ? undefined : sessao.user.id} />

            {/* Ações da aula: concluir, teatro, anterior e próxima (estilo "Próxima atividade" da Alura) */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button onClick={alternar} disabled={!liberada || salvando}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[10px] text-[14.5px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={concluida
                  ? { background: 'rgba(34,197,94,0.1)', color: 'var(--a-green)', border: '1px solid rgba(34,197,94,0.35)' }
                  : { background: T.card, color: T.ink, border: `1px solid ${T.rule}` }}>
                {concluida ? <><CheckCircle2 size={18} strokeWidth={2} /> Aula concluída</> : <><Check size={18} strokeWidth={2} /> Marcar como concluída</>}
              </button>
              <div className="flex items-stretch gap-2 sm:ml-auto">
                <button onClick={alternarTeatro} aria-pressed={teatro} title={teatro ? 'Sair do modo teatro (T)' : 'Modo teatro (T)'}
                  className="hidden lg:inline-flex w-12 h-12 shrink-0 items-center justify-center rounded-[10px] transition-colors hover:bg-white"
                  style={{ color: teatro ? T.accent : T.mute, border: `1px solid ${teatro ? 'rgba(79,70,229,0.35)' : T.rule}` }}>
                  <RectangleHorizontal size={teatro ? 16 : 19} strokeWidth={1.75} />
                </button>
                {anterior && (
                  <button onClick={() => abrir(anterior.id)} title={`Aula anterior: ${anterior.titulo}`}
                    className="inline-flex items-center justify-center gap-1 h-12 px-4 rounded-[10px] text-[14px] font-medium transition-colors hover:bg-white"
                    style={{ color: T.ink2, border: `1px solid ${T.rule}` }}>
                    <ChevronLeft size={17} strokeWidth={1.75} /> Anterior
                  </button>
                )}
                {proxima && (
                  <button onClick={() => abrir(proxima.id)}
                    className="acad-btn flex-1 sm:flex-none inline-flex items-center justify-between gap-4 h-12 pl-5 pr-4 rounded-[10px] text-white text-left min-w-0">
                    <span className="min-w-0">
                      <span className="block text-[11.5px] font-medium leading-none" style={{ color: 'rgba(255,255,255,0.8)' }}>Próxima aula</span>
                      <span className="block text-[14px] font-semibold leading-tight mt-1 truncate max-w-[16rem]">{proxima.titulo}</span>
                    </span>
                    <ChevronRight size={19} strokeWidth={2} className="acad-arrow shrink-0" />
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence>
              {erro && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-[14px]" style={{ color: 'var(--a-red)' }}>{erro}</motion.p>}
            </AnimatePresence>
            </div>
            {teatro && <div className="mt-8">{cabecalhoAula}</div>}

            {/* Curso concluído: certificado + próximo curso sugerido */}
            {matriculado && !admin && percentual >= 100 && (
              <div className="rounded-2xl p-5 mt-8 space-y-4" style={{ background: T.card, border: '1px solid rgba(34,197,94,0.3)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--a-green)' }}>
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

            {aula.descricao && (
              <section className="mt-10">
                <h2 className="font-bold text-[17px]" style={display}>Sobre esta aula</h2>
                <p className="text-[15px] leading-relaxed mt-2" style={{ color: T.ink2 }}>{aula.descricao}</p>
              </section>
            )}

            {liberada && <MateriaisAula aulaId={aula.id} />}

            {/* Comentários da aula (só para quem pode assistir a ela) */}
            {liberada && <Comunidade sessao={sessao} aulaId={aula.id} />}
          </div>
        </main>
      </div>

      {/* Celular e tablet: as aulas abrem numa gaveta */}
      <AnimatePresence>
        {gaveta && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={() => setGaveta(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.aside role="dialog" aria-label="Aulas do curso" className="absolute inset-y-0 left-0 w-[22rem] max-w-[88vw] flex flex-col" style={{ background: T.card }}
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease }}>
              <div className="h-14 px-5 shrink-0 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.rule}`, color: T.ink }}>
                <p className="font-semibold text-[15px] truncate">{curso.titulo}</p>
                <button onClick={() => setGaveta(false)} aria-label="Fechar" className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
                  <X size={20} strokeWidth={1.75} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto acad-scroll">{lista}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

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
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--a-green)' }}>
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
    </div>
  );
}
