import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, FileText, Paperclip, Pencil, Plus, Trash2, Upload, Video, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { AppLayout, Carregando } from '../AppLayout';
import { Link, navegar } from '../router';
import { supabase } from '../supabase';
import { SoAdmin, gerarSlug, inputCls, Rotulo, Chave, botaoPrimario, botaoSecundario } from './comum';

/* ─── Tipos ─────────────────────────────────────────────────────── */
type Material = { id: string; nome: string; arquivo: string; tamanho: number | null };
type AulaA = { id: string; titulo: string; descricao: string | null; ordem: number; duracao_seg: number; gratuita: boolean; video_id: string | null; academy_lesson_materials: Material[] };
type ModuloA = { id: string; titulo: string; ordem: number; academy_lessons: AulaA[] };
type CursoA = { id: string; slug: string; titulo: string; subtitulo: string | null; publicado: boolean; ordem: number; academy_modules: ModuloA[] };

const BUCKET = 'academy-materiais';
const SELECT = 'id, slug, titulo, subtitulo, publicado, ordem, academy_modules(id, titulo, ordem, academy_lessons(id, titulo, descricao, ordem, duracao_seg, gratuita, video_id, academy_lesson_materials(id, nome, arquivo, tamanho)))';

const ordenar = (c: CursoA): CursoA => ({
  ...c,
  academy_modules: [...c.academy_modules].sort((a, b) => a.ordem - b.ordem)
    .map(m => ({ ...m, academy_lessons: [...m.academy_lessons].sort((a, b) => a.ordem - b.ordem) })),
});
const kb = (n: number | null) => (n == null ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/* Reordena: troca o item de posição e regrava a ordem 1..n de quem mudou */
async function mover<X extends { id: string; ordem: number }>(tabela: string, itens: X[], i: number, delta: number) {
  const j = i + delta;
  if (j < 0 || j >= itens.length) return;
  const nova = [...itens];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  await Promise.all(nova.map((x, k) => (x.ordem !== k + 1 ? supabase.from(tabela).update({ ordem: k + 1 }).eq('id', x.id) : null)));
}

/* ─── Dados do curso (novo ou existente) ─────────────────────────── */
function FormCurso({ curso, onSalvo }: { curso: CursoA | null; onSalvo: (id: string) => void }) {
  const [titulo, setTitulo] = useState(curso?.titulo ?? '');
  const [slug, setSlug] = useState(curso?.slug ?? '');
  const [slugManual, setSlugManual] = useState(!!curso);
  const [subtitulo, setSubtitulo] = useState(curso?.subtitulo ?? '');
  const [ordem, setOrdem] = useState(String(curso?.ordem ?? 10));
  const [publicado, setPublicado] = useState(curso?.publicado ?? false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return setMsg({ erro: 'Informe o título do curso.', ok: '' });
    if (!slug) return setMsg({ erro: 'Informe o endereço (slug) do curso.', ok: '' });
    setSalvando(true); setMsg({ erro: '', ok: '' });
    const dados = { titulo: titulo.trim(), slug, subtitulo: subtitulo.trim() || null, ordem: Number(ordem) || 0, publicado };
    const r = curso
      ? await supabase.from('academy_courses').update(dados).eq('id', curso.id).select('id').single()
      : await supabase.from('academy_courses').insert(dados).select('id').single();
    setSalvando(false);
    if (r.error) return setMsg({ erro: r.error.code === '23505' ? 'Já existe um curso com esse endereço. Troque o slug.' : 'Não foi possível salvar.', ok: '' });
    setMsg({ erro: '', ok: 'Curso salvo.' });
    onSalvo(r.data.id as string);
  };

  return (
    <form onSubmit={salvar} className="rounded-2xl p-6 md:p-7 space-y-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <h2 className="font-bold text-[18px]" style={display}>Dados do curso</h2>
      <div className="grid md:grid-cols-2 gap-5">
        <Rotulo texto="Título">
          <input className={inputCls} value={titulo} placeholder="Ex.: Planilha no Automático"
            onChange={e => { setTitulo(e.target.value); if (!slugManual) setSlug(gerarSlug(e.target.value)); }} />
        </Rotulo>
        <Rotulo texto="Endereço (slug)" dica={`nexla.com.br/academy/curso/${slug || '...'}`}>
          <input className={inputCls} value={slug} onChange={e => { setSlugManual(true); setSlug(gerarSlug(e.target.value)); }} />
        </Rotulo>
      </div>
      <Rotulo texto="Subtítulo (promessa curta)">
        <input className={inputCls} value={subtitulo} placeholder="Ex.: Planilhas e relatórios que se atualizam sozinhos" onChange={e => setSubtitulo(e.target.value)} />
      </Rotulo>
      <div className="flex flex-wrap items-end gap-6">
        <div className="w-32"><Rotulo texto="Ordem na vitrine"><input type="number" className={inputCls} value={ordem} onChange={e => setOrdem(e.target.value)} /></Rotulo></div>
        <div className="pb-2.5"><Chave ligado={publicado} onChange={setPublicado} texto={publicado ? 'Publicado (aparece para os alunos)' : 'Rascunho (só o admin vê)'} /></div>
      </div>
      {msg.erro && <p className="text-[13.5px]" style={{ color: '#B91C1C' }}>{msg.erro}</p>}
      {msg.ok && <p className="text-[13.5px]" style={{ color: '#15803D' }}>{msg.ok}</p>}
      <button type="submit" disabled={salvando} className={botaoPrimario}>{salvando ? 'Salvando…' : curso ? 'Salvar curso' : 'Criar curso'}</button>
    </form>
  );
}

/* ─── Editor de aula (janela) ────────────────────────────────────── */
function EditorAula({ aula, onFechar, onSalvo }: { aula: AulaA; onFechar: () => void; onSalvo: () => void }) {
  const [titulo, setTitulo] = useState(aula.titulo);
  const [descricao, setDescricao] = useState(aula.descricao ?? '');
  const [minutos, setMinutos] = useState(String(Math.round(aula.duracao_seg / 60)));
  const [gratuita, setGratuita] = useState(aula.gratuita);
  const [videoId, setVideoId] = useState(aula.video_id ?? '');
  const [materiais, setMateriais] = useState(aula.academy_lesson_materials);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!titulo.trim()) return setErro('Informe o título da aula.');
    setSalvando(true); setErro('');
    const { error } = await supabase.from('academy_lessons').update({
      titulo: titulo.trim(), descricao: descricao.trim() || null,
      duracao_seg: Math.max(0, Math.round(Number(minutos.replace(',', '.')) * 60) || 0),
      gratuita, video_id: videoId.trim() || null,
    }).eq('id', aula.id);
    setSalvando(false);
    if (error) return setErro('Não foi possível salvar a aula.');
    onSalvo();
  };

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setEnviando(true); setErro('');
    for (const f of Array.from(arquivos)) {
      const caminho = `${aula.id}/${Date.now()}-${f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_')}`;
      const up = await supabase.storage.from(BUCKET).upload(caminho, f, { upsert: false });
      if (up.error) { setErro(`Falha ao enviar "${f.name}" (limite de 50 MB).`); continue; }
      const { data, error } = await supabase.from('academy_lesson_materials')
        .insert({ lesson_id: aula.id, nome: f.name, arquivo: caminho, tamanho: f.size }).select('id, nome, arquivo, tamanho').single();
      if (error) { await supabase.storage.from(BUCKET).remove([caminho]); setErro(`Falha ao registrar "${f.name}".`); continue; }
      setMateriais(m => [...m, data as Material]);
    }
    setEnviando(false);
  };

  const remover = async (m: Material) => {
    if (!window.confirm(`Apagar o material "${m.nome}"?`)) return;
    await supabase.storage.from(BUCKET).remove([m.arquivo]);
    await supabase.from('academy_lesson_materials').delete().eq('id', m.id);
    setMateriais(ms => ms.filter(x => x.id !== m.id));
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(15,23,42,0.55)' }}>
      <motion.div role="dialog" aria-modal="true" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease }}
        className="relative w-full max-w-2xl rounded-2xl p-6 md:p-7 my-8" style={{ background: T.card }}>
        <button onClick={onFechar} aria-label="Fechar" className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
          <X size={18} strokeWidth={1.75} />
        </button>
        <h2 className="font-bold text-[20px] mb-5" style={display}>Editar aula</h2>
        <div className="space-y-5">
          <Rotulo texto="Título da aula"><input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} /></Rotulo>
          <Rotulo texto="Descrição (aparece abaixo do vídeo)">
            <textarea className="acad-field w-full rounded-[10px] px-3.5 py-3 text-[14.5px] leading-relaxed" rows={4} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </Rotulo>
          <div className="grid sm:grid-cols-[9rem_1fr] gap-5">
            <Rotulo texto="Duração (min)"><input className={inputCls} inputMode="decimal" value={minutos} onChange={e => setMinutos(e.target.value)} /></Rotulo>
            <Rotulo texto="ID do vídeo (Bunny Stream)" dica="Cole o ID do vídeo da biblioteca. O player entra quando o serviço de vídeo for definido.">
              <input className={inputCls} value={videoId} placeholder="ex.: 3f2a9c1e-..." onChange={e => setVideoId(e.target.value)} />
            </Rotulo>
          </div>
          <Chave ligado={gratuita} onChange={setGratuita} texto={gratuita ? 'Aula grátis (qualquer conta assiste)' : 'Só para alunos matriculados'} />

          <div className="pt-5" style={{ borderTop: `1px solid ${T.rule}` }}>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: T.ink2 }}>Materiais para baixar</p>
            {materiais.length === 0 && <p className="text-[13.5px] mb-3" style={{ color: T.mute }}>Nenhum material nesta aula.</p>}
            <ul className="space-y-2 mb-3">
              {materiais.map(m => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: '#F8FAFC', border: `1px solid ${T.rule}` }}>
                  <FileText size={16} strokeWidth={1.75} style={{ color: T.accent }} />
                  <span className="flex-1 min-w-0 text-[14px] truncate">{m.nome}</span>
                  <span className="text-[12px] shrink-0" style={{ color: T.mute }}>{kb(m.tamanho)}</span>
                  <button onClick={() => remover(m)} aria-label={`Apagar ${m.nome}`} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-red-50" style={{ color: '#B91C1C' }}>
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
            <label className={`${botaoSecundario} cursor-pointer`} style={{ color: T.ink, border: `1px dashed ${T.rule}` }}>
              <Upload size={16} strokeWidth={1.75} /> {enviando ? 'Enviando…' : 'Anexar arquivos (planilha, PDF…)'}
              <input type="file" multiple className="sr-only" disabled={enviando} onChange={e => { anexar(e.target.files); e.target.value = ''; }} />
            </label>
          </div>

          {erro && <p className="text-[13.5px]" style={{ color: '#B91C1C' }}>{erro}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onFechar} className={botaoSecundario} style={{ color: T.mute, border: `1px solid ${T.rule}` }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} className={botaoPrimario}>{salvando ? 'Salvando…' : 'Salvar aula'}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Conteúdo: módulos e aulas ──────────────────────────────────── */
function Conteudo({ curso, recarregar }: { curso: CursoA; recarregar: () => Promise<void> }) {
  const [editando, setEditando] = useState<AulaA | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const acao = async (fn: () => PromiseLike<unknown>) => { setOcupado(true); await fn(); await recarregar(); setOcupado(false); };

  const novoModulo = () => acao(() => supabase.from('academy_modules').insert({ course_id: curso.id, titulo: 'Novo módulo', ordem: curso.academy_modules.length + 1 }));
  const renomearModulo = (m: ModuloA, titulo: string) => titulo.trim() && titulo.trim() !== m.titulo
    && acao(() => supabase.from('academy_modules').update({ titulo: titulo.trim() }).eq('id', m.id));
  const apagarModulo = (m: ModuloA) => window.confirm(`Apagar o módulo "${m.titulo}" e todas as ${m.academy_lessons.length} aulas dele? O progresso dos alunos nessas aulas também será apagado.`)
    && acao(() => supabase.from('academy_modules').delete().eq('id', m.id));
  const novaAula = async (m: ModuloA) => {
    setOcupado(true);
    const { data } = await supabase.from('academy_lessons')
      .insert({ module_id: m.id, titulo: 'Nova aula', ordem: m.academy_lessons.length + 1 })
      .select('id, titulo, descricao, ordem, duracao_seg, gratuita, video_id').single();
    await recarregar(); setOcupado(false);
    if (data) setEditando({ ...(data as Omit<AulaA, 'academy_lesson_materials'>), academy_lesson_materials: [] });
  };
  const apagarAula = (a: AulaA) => window.confirm(`Apagar a aula "${a.titulo}"? O progresso e os comentários dos alunos nela também serão apagados.`)
    && acao(() => supabase.from('academy_lessons').delete().eq('id', a.id));

  const iconeBtn = 'w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-30';

  return (
    <section className="rounded-2xl p-6 md:p-7" style={{ background: T.card, border: `1px solid ${T.rule}`, opacity: ocupado ? 0.7 : 1 }}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="font-bold text-[18px]" style={display}>Conteúdo</h2>
        <span className="text-[13px]" style={{ color: T.mute }}>
          {curso.academy_modules.length} módulos · {curso.academy_modules.reduce((s, m) => s + m.academy_lessons.length, 0)} aulas
        </span>
      </div>

      <div className="space-y-4">
        {curso.academy_modules.map((m, mi) => (
          <div key={m.id} className="rounded-xl" style={{ border: `1px solid ${T.rule}` }}>
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#F8FAFC', borderBottom: `1px solid ${T.rule}` }}>
              <span className="text-[12.5px] font-semibold w-6 text-center" style={{ color: T.mute }}>{mi + 1}</span>
              <input defaultValue={m.titulo} key={m.titulo} onBlur={e => renomearModulo(m, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="flex-1 min-w-0 bg-transparent font-semibold text-[15px] px-2 h-9 rounded-md hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Nome do módulo" />
              <button className={iconeBtn} disabled={mi === 0 || ocupado} onClick={() => acao(() => mover('academy_modules', curso.academy_modules, mi, -1))} aria-label="Subir módulo"><ArrowUp size={15} /></button>
              <button className={iconeBtn} disabled={mi === curso.academy_modules.length - 1 || ocupado} onClick={() => acao(() => mover('academy_modules', curso.academy_modules, mi, 1))} aria-label="Descer módulo"><ArrowDown size={15} /></button>
              <button className={iconeBtn} disabled={ocupado} onClick={() => apagarModulo(m)} aria-label="Apagar módulo" style={{ color: '#B91C1C' }}><Trash2 size={15} /></button>
            </div>

            <ul>
              {m.academy_lessons.map((a, ai) => (
                <li key={a.id} className="flex items-center gap-2 px-3 py-2" style={ai ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                  <span className="text-[12px] w-6 text-center" style={{ color: '#94A3B8' }}>{mi + 1}.{ai + 1}</span>
                  <button onClick={() => setEditando(a)} className="flex-1 min-w-0 text-left px-2 py-1 rounded-md hover:bg-slate-50">
                    <span className="block text-[14px] truncate" style={{ color: T.ink }}>{a.titulo}</span>
                    <span className="flex flex-wrap items-center gap-x-2.5 text-[12px]" style={{ color: T.mute }}>
                      {Math.round(a.duracao_seg / 60)} min
                      {a.gratuita && <span style={{ color: T.accent }}>grátis</span>}
                      <span className="inline-flex items-center gap-1" style={{ color: a.video_id ? '#15803D' : '#B45309' }}>
                        <Video size={12} /> {a.video_id ? 'com vídeo' : 'sem vídeo'}
                      </span>
                      {a.academy_lesson_materials.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} /> {a.academy_lesson_materials.length}</span>}
                    </span>
                  </button>
                  <button className={iconeBtn} disabled={ai === 0 || ocupado} onClick={() => acao(() => mover('academy_lessons', m.academy_lessons, ai, -1))} aria-label="Subir aula"><ArrowUp size={15} /></button>
                  <button className={iconeBtn} disabled={ai === m.academy_lessons.length - 1 || ocupado} onClick={() => acao(() => mover('academy_lessons', m.academy_lessons, ai, 1))} aria-label="Descer aula"><ArrowDown size={15} /></button>
                  <button className={iconeBtn} onClick={() => setEditando(a)} aria-label="Editar aula" style={{ color: T.accent }}><Pencil size={14} /></button>
                  <button className={iconeBtn} disabled={ocupado} onClick={() => apagarAula(a)} aria-label="Apagar aula" style={{ color: '#B91C1C' }}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
            <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${T.rule}` }}>
              <button disabled={ocupado} onClick={() => novaAula(m)} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold px-2 h-8 rounded-md hover:bg-slate-50" style={{ color: T.accent }}>
                <Plus size={15} strokeWidth={2} /> Adicionar aula
              </button>
            </div>
          </div>
        ))}
      </div>

      <button disabled={ocupado} onClick={novoModulo} className={`${botaoSecundario} mt-4 w-full`} style={{ color: T.accent, border: '1px dashed rgba(79,70,229,0.4)' }}>
        <Plus size={16} strokeWidth={2} /> Adicionar módulo
      </button>

      <AnimatePresence>
        {editando && <EditorAula key={editando.id} aula={editando} onFechar={() => setEditando(null)}
          onSalvo={async () => { setEditando(null); await recarregar(); }} />}
      </AnimatePresence>
    </section>
  );
}

/* ─── Página ─────────────────────────────────────────────────────── */
function Editor({ nome, id }: { nome: string; id: string }) {
  const novo = id === 'novo';
  const [curso, setCurso] = useState<CursoA | null | 'erro'>(null);
  const [carregando, setCarregando] = useState(!novo);

  const recarregar = useCallback(async () => {
    if (novo) return;
    const { data, error } = await supabase.from('academy_courses').select(SELECT).eq('id', id).maybeSingle();
    setCurso(error || !data ? 'erro' : ordenar(data as unknown as CursoA));
    setCarregando(false);
  }, [id, novo]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const apagarCurso = async () => {
    if (!curso || curso === 'erro') return;
    const conf = window.prompt(`Isso apaga o curso, todas as aulas, matrículas e o progresso dos alunos.\nPara confirmar, digite o endereço do curso: ${curso.slug}`);
    if (conf !== curso.slug) return;
    await supabase.from('academy_courses').delete().eq('id', curso.id);
    navegar('/admin');
  };

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="space-y-6">
        <div>
          <Link para="/admin" className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-4 hover:underline underline-offset-4" style={{ color: T.mute }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> Todos os cursos
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(24px,3vw,32px)' }}>
              {novo ? 'Novo curso' : curso && curso !== 'erro' ? curso.titulo : 'Editar curso'}
            </h1>
            {curso && curso !== 'erro' && (
              <Link para={`/curso/${curso.slug}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: T.accent }}>
                <Eye size={15} strokeWidth={1.75} /> Ver como aluno
              </Link>
            )}
          </div>
        </div>

        {carregando ? <Carregando /> : curso === 'erro' ? (
          <p className="text-[14.5px]" style={{ color: '#B91C1C' }}>Curso não encontrado.</p>
        ) : (
          <>
            <FormCurso key={curso?.id ?? 'novo'} curso={curso} onSalvo={nid => (novo ? navegar(`/admin/curso/${nid}`, { substituir: true }) : recarregar())} />
            {curso && <Conteudo curso={curso} recarregar={recarregar} />}
            {curso && (
              <section className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ border: '1px solid rgba(185,28,28,0.25)' }}>
                <div>
                  <p className="font-semibold text-[15px]" style={{ color: '#B91C1C' }}>Apagar curso</p>
                  <p className="text-[13.5px]" style={{ color: T.mute }}>Remove o curso, as aulas, as matrículas e o progresso dos alunos. Para só esconder, deixe como rascunho.</p>
                </div>
                <button onClick={apagarCurso} className={botaoSecundario} style={{ color: '#B91C1C', border: '1px solid rgba(185,28,28,0.3)' }}>
                  <Trash2 size={15} strokeWidth={1.75} /> Apagar curso
                </button>
              </section>
            )}
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}

export default function AdminCurso({ sessao, id }: { sessao: Session; id: string }) {
  return <SoAdmin sessao={sessao}>{nome => <Editor key={id} nome={nome} id={id} />}</SoAdmin>;
}
