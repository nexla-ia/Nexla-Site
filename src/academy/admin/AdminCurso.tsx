import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown, ArrowLeft, ArrowUp, Eye, FileText, ImageIcon, Layers, ListVideo, Paperclip, Pencil, Plus,
  Settings, Trash2, Upload, Users, Video, X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando } from '../AppLayout';
import { Link, navegar, parametro } from '../router';
import { supabase } from '../supabase';
import AbaAlunos from './AbaAlunos';
import { CartaoVenda } from './Vendas';
import { CartaoBonus, CartaoInstrutor, CartaoPerguntas } from './BonusFaq';
import { SoAdmin, AdminLayout, gerarSlug, inputCls, Rotulo, Chave, botaoPrimario, botaoSecundario, CAPA_PADRAO, SalvarTudo, type ParteSalvavel } from './comum';

/* ─── Tipos ─────────────────────────────────────────────────────── */
type Material = { id: string; nome: string; arquivo: string; tamanho: number | null };
type AulaA = { id: string; titulo: string; descricao: string | null; ordem: number; duracao_seg: number; gratuita: boolean; video_id: string | null; academy_lesson_materials: Material[] };
type ModuloA = { id: string; titulo: string; ordem: number; academy_lessons: AulaA[] };
type CursoA = {
  id: string; slug: string; titulo: string; subtitulo: string | null; descricao: string | null; capa: string | null;
  publicado: boolean; ordem: number; destaque: boolean; categoria: string | null; nivel: string | null; instrutor: string | null;
  aprendizados: string[]; certificado: boolean; carga_horaria_h: number | null; academy_modules: ModuloA[];
};

const MATERIAIS = 'academy-materiais';
const CAPAS = 'academy-capas';
const SELECT = 'id, slug, titulo, subtitulo, descricao, capa, publicado, ordem, destaque, categoria, nivel, instrutor, aprendizados, certificado, carga_horaria_h, '
  + 'academy_modules(id, titulo, ordem, academy_lessons(id, titulo, descricao, ordem, duracao_seg, gratuita, video_id, academy_lesson_materials(id, nome, arquivo, tamanho)))';
const NIVEIS = [{ v: '', t: 'Não informar' }, { v: 'iniciante', t: 'Iniciante' }, { v: 'intermediario', t: 'Intermediário' }, { v: 'avancado', t: 'Avançado' }];

const ordenar = (c: CursoA): CursoA => ({
  ...c,
  aprendizados: c.aprendizados ?? [],
  academy_modules: [...c.academy_modules].sort((a, b) => a.ordem - b.ordem)
    .map(m => ({ ...m, academy_lessons: [...m.academy_lessons].sort((a, b) => a.ordem - b.ordem) })),
});
const kb = (n: number | null) => (n == null ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const totalAulas = (c: CursoA) => c.academy_modules.reduce((s, m) => s + m.academy_lessons.length, 0);
const horasAulas = (c: CursoA) => Math.max(1, Math.round(c.academy_modules.reduce((s, m) => s + m.academy_lessons.reduce((x, a) => x + a.duracao_seg, 0), 0) / 3600));

/* Reordena: troca o item de posição e regrava a ordem 1..n de quem mudou */
async function mover<X extends { id: string; ordem: number }>(tabela: string, itens: X[], i: number, delta: number) {
  const j = i + delta;
  if (j < 0 || j >= itens.length) return;
  const nova = [...itens];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  await Promise.all(nova.map((x, k) => (x.ordem !== k + 1 ? supabase.from(tabela).update({ ordem: k + 1 }).eq('id', x.id) : null)));
}

function Cartao({ titulo, sub, children, perigo = false }: { titulo: string; sub?: string; children: React.ReactNode; perigo?: boolean }) {
  return (
    <section className="rounded-2xl p-6 md:p-7 grid md:grid-cols-[14rem_1fr] gap-5 md:gap-8"
      style={{ background: T.card, border: `1px solid ${perigo ? 'rgba(185,28,28,0.25)' : T.rule}` }}>
      <div>
        <h3 className="font-bold text-[16.5px]" style={{ ...display, color: perigo ? 'var(--a-red)' : T.ink }}>{titulo}</h3>
        {sub && <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.mute }}>{sub}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/* ─── Novo curso: só nome e endereço, o resto é na aba Configurações ── */
function NovoCurso() {
  const [titulo, setTitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [manual, setManual] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !slug) return setErro('Informe o nome do curso.');
    setSalvando(true); setErro('');
    const { data, error } = await supabase.from('academy_courses').insert({ titulo: titulo.trim(), slug, publicado: false, ordem: 99 }).select('id').single();
    if (!error && data) await supabase.from('academy_modules').insert({ course_id: data.id, titulo: 'Módulo 1', ordem: 1 });
    setSalvando(false);
    if (error) return setErro(error.code === '23505' ? 'Já existe um curso com esse endereço.' : 'Não foi possível criar o curso.');
    navegar(`/admin/curso/${data.id}?aba=config`, { substituir: true });
  };

  return (
    <form onSubmit={criar} className="max-w-xl rounded-2xl p-6 md:p-7 space-y-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <Rotulo texto="Nome do curso">
        <input className={inputCls} value={titulo} autoFocus placeholder="Ex.: Planilha no Automático"
          onChange={e => { setTitulo(e.target.value); if (!manual) setSlug(gerarSlug(e.target.value)); }} />
      </Rotulo>
      <Rotulo texto="Endereço" dica={`nexla.com.br/academy/curso/${slug || '...'}`}>
        <input className={inputCls} value={slug} onChange={e => { setManual(true); setSlug(gerarSlug(e.target.value)); }} />
      </Rotulo>
      <p className="text-[13px]" style={{ color: T.mute }}>O curso nasce como rascunho, com um módulo. Depois você completa foto, descrição e módulos em Configurações.</p>
      {erro && <p className="text-[13.5px]" style={{ color: 'var(--a-red)' }}>{erro}</p>}
      <button type="submit" disabled={salvando} className={botaoPrimario}>{salvando ? 'Criando…' : 'Criar curso'}</button>
    </form>
  );
}

/* Duração real do vídeo no Bunny (a função academy-video lê da página do player).
   É essa duração que o banco usa para exigir que o aluno assista 70% antes de concluir a aula. */
function useDuracaoVideo(aulaId: string, videoId: string) {
  const [estado, setEstado] = useState<{ seg: number | null; lendo: boolean; falhou: boolean }>({ seg: null, lendo: false, falhou: false });
  useEffect(() => {
    const id = videoId.trim();
    setEstado({ seg: null, lendo: false, falhou: false });
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    let vivo = true;
    const t = window.setTimeout(async () => {
      setEstado({ seg: null, lendo: true, falhou: false });
      const { data } = await supabase.functions.invoke('academy-video', { body: { aula: aulaId, video: id } });
      if (!vivo) return;
      const seg = Number(data?.duracao_seg);
      setEstado(seg > 0 ? { seg, lendo: false, falhou: false } : { seg: null, lendo: false, falhou: true });
    }, 500);
    return () => { vivo = false; window.clearTimeout(t); };
  }, [aulaId, videoId]);
  return estado;
}

const tempoVideo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ─── Editor de aula (janela) ────────────────────────────────────── */
function EditorAula({ aula, modulos, moduloAtual, onFechar, onSalvo }: {
  aula: AulaA; modulos: ModuloA[]; moduloAtual: string; onFechar: () => void; onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState(aula.titulo);
  const [descricao, setDescricao] = useState(aula.descricao ?? '');
  const [segundos, setSegundos] = useState(aula.duracao_seg); // lida do vídeo; à mão só se não der para ler
  const [minutos, setMinutos] = useState(String(Math.round(aula.duracao_seg / 60)));
  const [gratuita, setGratuita] = useState(aula.gratuita);
  const [videoId, setVideoId] = useState(aula.video_id ?? '');
  const duracao = useDuracaoVideo(aula.id, videoId);
  // Achou a duração no vídeo: é ela que vale (segundos exatos)
  useEffect(() => { if (duracao.seg !== null) setSegundos(duracao.seg); }, [duracao.seg]);
  const [moduloId, setModuloId] = useState(moduloAtual);
  const [materiais, setMateriais] = useState(aula.academy_lesson_materials);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!titulo.trim()) return setErro('Informe o título da aula.');
    setSalvando(true); setErro('');
    const destino = modulos.find(m => m.id === moduloId);
    const { error } = await supabase.from('academy_lessons').update({
      titulo: titulo.trim(), descricao: descricao.trim() || null,
      duracao_seg: Math.max(0, segundos),
      gratuita, video_id: videoId.trim() || null,
      ...(moduloId !== moduloAtual && destino ? { module_id: moduloId, ordem: destino.academy_lessons.length + 1 } : {}),
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
      const up = await supabase.storage.from(MATERIAIS).upload(caminho, f, { upsert: false });
      if (up.error) { setErro(`Falha ao enviar "${f.name}" (limite de 50 MB).`); continue; }
      const { data, error } = await supabase.from('academy_lesson_materials')
        .insert({ lesson_id: aula.id, nome: f.name, arquivo: caminho, tamanho: f.size }).select('id, nome, arquivo, tamanho').single();
      if (error) { await supabase.storage.from(MATERIAIS).remove([caminho]); setErro(`Falha ao registrar "${f.name}".`); continue; }
      setMateriais(m => [...m, data as Material]);
    }
    setEnviando(false);
  };

  const remover = async (m: Material) => {
    if (!window.confirm(`Apagar o material "${m.nome}"?`)) return;
    await supabase.storage.from(MATERIAIS).remove([m.arquivo]);
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
          <Rotulo texto="Módulo">
            <select className={inputCls} value={moduloId} onChange={e => setModuloId(e.target.value)}>
              {modulos.map((m, i) => <option key={m.id} value={m.id}>{i + 1}. {m.titulo}</option>)}
            </select>
          </Rotulo>
          <div>
            <Rotulo texto="ID do vídeo (Bunny Stream)" dica="Cole o ID do vídeo (Video ID / GUID) da biblioteca do Bunny Stream. A duração da aula vem do próprio vídeo.">
              <input className={inputCls} value={videoId} placeholder="ex.: 3f2a9c1e-..." onChange={e => setVideoId(e.target.value)} />
            </Rotulo>
            {duracao.lendo && <p className="text-[12.5px] mt-1.5" style={{ color: T.mute }}>Lendo a duração do vídeo…</p>}
            {duracao.seg !== null && (
              <p className="text-[12.5px] mt-1.5 font-medium" style={{ color: 'var(--a-green)' }}>
                Duração: {tempoVideo(duracao.seg)} (lida do vídeo). O aluno precisa assistir 70% para concluir.
              </p>
            )}
            {duracao.falhou && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <p className="text-[12.5px] flex-1 min-w-[14rem]" style={{ color: 'var(--a-amber)' }}>
                  Não deu para ler a duração deste vídeo. Confira o ID ou informe os minutos.
                </p>
                <div className="w-32">
                  <Rotulo texto="Duração (min)">
                    <input className={inputCls} inputMode="decimal" value={minutos}
                      onChange={e => { setMinutos(e.target.value); setSegundos(Math.max(0, Math.round(Number(e.target.value.replace(',', '.')) * 60) || 0)); }} />
                  </Rotulo>
                </div>
              </div>
            )}
          </div>
          <Rotulo texto="Descrição (aparece abaixo do vídeo)">
            <textarea className="acad-field w-full rounded-[10px] px-3.5 py-3 text-[14.5px] leading-relaxed" rows={4} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </Rotulo>
          <Chave ligado={gratuita} onChange={setGratuita} texto={gratuita ? 'Aula grátis (qualquer conta assiste)' : 'Só para alunos matriculados'} />

          <div className="pt-5" style={{ borderTop: `1px solid ${T.rule}` }}>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: T.ink2 }}>Materiais para baixar</p>
            {materiais.length === 0 && <p className="text-[13.5px] mb-3" style={{ color: T.mute }}>Nenhum material nesta aula.</p>}
            <ul className="space-y-2 mb-3">
              {materiais.map(m => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--a-soft2)', border: `1px solid ${T.rule}` }}>
                  <FileText size={16} strokeWidth={1.75} style={{ color: T.accent }} />
                  <span className="flex-1 min-w-0 text-[14px] truncate">{m.nome}</span>
                  <span className="text-[12px] shrink-0" style={{ color: T.mute }}>{kb(m.tamanho)}</span>
                  <button onClick={() => remover(m)} aria-label={`Apagar ${m.nome}`} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-red-50" style={{ color: 'var(--a-red)' }}>
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

          {erro && <p className="text-[13.5px]" style={{ color: 'var(--a-red)' }}>{erro}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onFechar} className={botaoSecundario} style={{ color: T.mute, border: `1px solid ${T.rule}` }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} className={botaoPrimario}>{salvando ? 'Salvando…' : 'Salvar aula'}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Aba Aulas: os vídeos do curso separados por módulo ─────────── */
function AbaAulas({ curso, recarregar, irConfig }: { curso: CursoA; recarregar: () => Promise<void>; irConfig: () => void }) {
  const [editando, setEditando] = useState<{ aula: AulaA; modulo: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const acao = async (fn: () => PromiseLike<unknown>) => { setOcupado(true); await fn(); await recarregar(); setOcupado(false); };

  const novaAula = async (m: ModuloA) => {
    setOcupado(true);
    const { data } = await supabase.from('academy_lessons')
      .insert({ module_id: m.id, titulo: 'Nova aula', ordem: m.academy_lessons.length + 1 })
      .select('id, titulo, descricao, ordem, duracao_seg, gratuita, video_id').single();
    await recarregar(); setOcupado(false);
    if (data) setEditando({ aula: { ...(data as Omit<AulaA, 'academy_lesson_materials'>), academy_lesson_materials: [] }, modulo: m.id });
  };
  const apagarAula = (a: AulaA) => window.confirm(`Apagar a aula "${a.titulo}"? O progresso e os comentários dos alunos nela também serão apagados.`)
    && acao(() => supabase.from('academy_lessons').delete().eq('id', a.id));

  const iconeBtn = 'w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-30';

  if (curso.academy_modules.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
        <Layers size={28} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
        <p className="font-semibold mt-3">Crie os módulos do curso primeiro</p>
        <p className="text-[14px] mt-1" style={{ color: T.mute }}>As aulas ficam organizadas dentro dos módulos.</p>
        <button onClick={irConfig} className={`${botaoPrimario} mt-5`}><Settings size={16} /> Ir para Configurações → Módulos</button>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ opacity: ocupado ? 0.7 : 1 }}>
      {curso.academy_modules.map((m, mi) => (
        <section key={m.id} className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
          <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ background: 'var(--a-soft2)', borderBottom: `1px solid ${T.rule}` }}>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: T.accent }}>Módulo {mi + 1}</p>
              <h3 className="font-bold text-[16px] truncate" style={display}>{m.titulo}</h3>
            </div>
            <span className="text-[12.5px] shrink-0" style={{ color: T.mute }}>{m.academy_lessons.length} aula{m.academy_lessons.length === 1 ? '' : 's'}</span>
          </div>

          {m.academy_lessons.length === 0 && <p className="px-5 py-4 text-[13.5px]" style={{ color: T.mute }}>Nenhuma aula neste módulo.</p>}
          <ul>
            {m.academy_lessons.map((a, ai) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5" style={ai ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: a.video_id ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.12)', color: a.video_id ? 'var(--a-green)' : 'var(--a-amber)' }}
                  title={a.video_id ? 'Com vídeo' : 'Sem vídeo'}>
                  <Video size={16} strokeWidth={1.75} />
                </span>
                <button onClick={() => setEditando({ aula: a, modulo: m.id })} className="flex-1 min-w-0 text-left">
                  <span className="block text-[14.5px] font-medium truncate" style={{ color: T.ink }}>{ai + 1}. {a.titulo}</span>
                  <span className="flex flex-wrap items-center gap-x-2.5 text-[12px]" style={{ color: T.mute }}>
                    {a.duracao_seg < 60 ? `${a.duracao_seg} s` : `${Math.round(a.duracao_seg / 60)} min`}
                    {a.gratuita && <span className="font-semibold" style={{ color: T.accent }}>grátis</span>}
                    {!a.video_id && <span style={{ color: 'var(--a-amber)' }}>sem vídeo</span>}
                    {a.academy_lesson_materials.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} /> {a.academy_lesson_materials.length}</span>}
                  </span>
                </button>
                <button className={iconeBtn} disabled={ai === 0 || ocupado} onClick={() => acao(() => mover('academy_lessons', m.academy_lessons, ai, -1))} aria-label="Subir aula"><ArrowUp size={15} /></button>
                <button className={iconeBtn} disabled={ai === m.academy_lessons.length - 1 || ocupado} onClick={() => acao(() => mover('academy_lessons', m.academy_lessons, ai, 1))} aria-label="Descer aula"><ArrowDown size={15} /></button>
                <button className={iconeBtn} onClick={() => setEditando({ aula: a, modulo: m.id })} aria-label="Editar aula" style={{ color: T.accent }}><Pencil size={14} /></button>
                <button className={iconeBtn} disabled={ocupado} onClick={() => apagarAula(a)} aria-label="Apagar aula" style={{ color: 'var(--a-red)' }}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${T.rule}` }}>
            <button disabled={ocupado} onClick={() => novaAula(m)} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold px-2 h-8 rounded-md hover:bg-slate-50" style={{ color: T.accent }}>
              <Plus size={15} strokeWidth={2} /> Adicionar aula neste módulo
            </button>
          </div>
        </section>
      ))}

      <AnimatePresence>
        {editando && <EditorAula key={editando.aula.id} aula={editando.aula} modulos={curso.academy_modules} moduloAtual={editando.modulo}
          onFechar={() => setEditando(null)} onSalvo={async () => { setEditando(null); await recarregar(); }} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── Aba Configurações ──────────────────────────────────────────── */
function AbaConfig({ curso, recarregar }: { curso: CursoA; recarregar: () => Promise<void> }) {
  const [f, setF] = useState({
    titulo: curso.titulo, slug: curso.slug, subtitulo: curso.subtitulo ?? '', descricao: curso.descricao ?? '',
    categoria: curso.categoria ?? '', nivel: curso.nivel ?? '', instrutor: curso.instrutor ?? '',
    aprendizados: curso.aprendizados.join('\n'), publicado: curso.publicado, destaque: curso.destaque,
    ordem: String(curso.ordem),
  });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' });
  const [salvoF, setSalvoF] = useState(() => JSON.stringify(f)); // informações como estão gravadas
  // Cartões que se registram para o botão Salvar único (preços, perguntas, instrutor)
  const [partes, setPartes] = useState<Record<string, ParteSalvavel>>({});
  const registrar = useCallback((id: string, parte: ParteSalvavel | null) => setPartes(x => {
    const resto = { ...x };
    if (parte) resto[id] = parte; else delete resto[id];
    return resto;
  }), []);
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const muda = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }));
  // Categorias já usadas em outros cursos, sugeridas no campo para não escrever a mesma de jeitos diferentes
  const [categorias, setCategorias] = useState<string[]>([]);
  useEffect(() => {
    supabase.from('academy_courses').select('categoria').not('categoria', 'is', null).then(({ data }) =>
      setCategorias([...new Set((data ?? []).map(d => (d.categoria as string).trim()).filter(Boolean))].sort()));
  }, []);

  // Informações e vitrine (devolve o erro ou null)
  const salvarInfo = async (): Promise<string | null> => {
    if (!f.titulo.trim() || !f.slug) return 'Nome e endereço são obrigatórios.';
    const { error } = await supabase.from('academy_courses').update({
      titulo: f.titulo.trim(), slug: f.slug, subtitulo: f.subtitulo.trim() || null, descricao: f.descricao.trim() || null,
      categoria: f.categoria.trim() || null, nivel: f.nivel || null, instrutor: f.instrutor.trim() || null,
      aprendizados: f.aprendizados.split('\n').map(s => s.trim()).filter(Boolean),
      publicado: f.publicado, destaque: f.destaque, ordem: Number(f.ordem) || 0,
      // Todo curso emite certificado; a carga horária é a soma da duração das aulas (calculada ao emitir)
      certificado: true, carga_horaria_h: null,
    }).eq('id', curso.id);
    if (error) return error.code === '23505' ? 'Já existe outro curso com esse endereço.' : 'Não foi possível salvar as informações do curso.';
    setSalvoF(JSON.stringify(f));
    return null;
  };

  // Um botão só: grava as informações e todos os cartões que mudaram
  const mudouInfo = JSON.stringify(f) !== salvoF;
  const pendentes = [...(mudouInfo ? ['informações'] : []), ...Object.values(partes).filter(x => x.mudou).map(x => x.nome)];
  const salvar = async () => {
    if (!pendentes.length) return;
    setSalvando(true); setMsg({ erro: '', ok: '' });
    const erros: string[] = [];
    if (mudouInfo) { const e = await salvarInfo(); if (e) erros.push(e); }
    for (const parte of Object.values(partes).filter(x => x.mudou)) { const e = await parte.salvar(); if (e) erros.push(e); }
    setSalvando(false);
    setMsg(erros.length ? { erro: erros.join(' '), ok: '' } : { erro: '', ok: 'Tudo salvo.' });
    if (mudouInfo) await recarregar();
  };
  // Saindo da página com algo sem salvar: o navegador pergunta antes
  useEffect(() => {
    if (!pendentes.length) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [pendentes.length]);

  const trocarCapa = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) return setMsg({ erro: 'A foto pode ter no máximo 5 MB.', ok: '' });
    setEnviandoCapa(true); setMsg({ erro: '', ok: '' });
    const ext = arquivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const caminho = `${curso.id}/capa-${Date.now()}.${ext}`;
    const up = await supabase.storage.from(CAPAS).upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
    if (up.error) { setEnviandoCapa(false); return setMsg({ erro: 'Não foi possível enviar a foto (JPG, PNG ou WebP até 5 MB).', ok: '' }); }
    const url = supabase.storage.from(CAPAS).getPublicUrl(caminho).data.publicUrl;
    await supabase.from('academy_courses').update({ capa: url }).eq('id', curso.id);
    if (curso.capa?.includes(`/${CAPAS}/`)) await supabase.storage.from(CAPAS).remove([curso.capa.split(`/${CAPAS}/`)[1]]);
    setEnviandoCapa(false);
    await recarregar();
  };
  const tirarCapa = async () => {
    if (!curso.capa || !window.confirm('Remover a foto do curso?')) return;
    if (curso.capa.includes(`/${CAPAS}/`)) await supabase.storage.from(CAPAS).remove([curso.capa.split(`/${CAPAS}/`)[1]]);
    await supabase.from('academy_courses').update({ capa: null }).eq('id', curso.id);
    await recarregar();
  };

  // Módulos
  const acao = async (fn: () => PromiseLike<unknown>) => { setOcupado(true); await fn(); await recarregar(); setOcupado(false); };
  const novoModulo = () => acao(() => supabase.from('academy_modules').insert({ course_id: curso.id, titulo: `Módulo ${curso.academy_modules.length + 1}`, ordem: curso.academy_modules.length + 1 }));
  const renomear = (m: ModuloA, t: string) => t.trim() && t.trim() !== m.titulo && acao(() => supabase.from('academy_modules').update({ titulo: t.trim() }).eq('id', m.id));
  const apagarModulo = (m: ModuloA) => window.confirm(m.academy_lessons.length
    ? `Apagar o módulo "${m.titulo}" e as ${m.academy_lessons.length} aulas dele? O progresso dos alunos nessas aulas também será apagado.`
    : `Apagar o módulo "${m.titulo}"?`) && acao(() => supabase.from('academy_modules').delete().eq('id', m.id));

  const apagarCurso = async () => {
    const conf = window.prompt(`Isso apaga o curso, todas as aulas, matrículas e o progresso dos alunos.\nPara confirmar, digite o endereço do curso: ${curso.slug}`);
    if (conf !== curso.slug) return;
    await supabase.from('academy_courses').delete().eq('id', curso.id);
    navegar('/admin/cursos');
  };

  const iconeBtn = 'w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-30';

  return (
    <SalvarTudo.Provider value={registrar}>
    <div className="space-y-5">
      <Cartao titulo="Foto do curso" sub="Aparece nos blocos da vitrine e do painel. Use uma imagem horizontal (16:9), JPG, PNG ou WebP até 5 MB.">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-full sm:w-72 aspect-[16/9] rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: CAPA_PADRAO }}>
            {curso.capa ? <img src={curso.capa} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={28} strokeWidth={1.5} style={{ color: 'rgba(224,231,255,0.5)' }} />}
          </div>
          <div className="flex flex-col gap-2.5">
            <label className={`${botaoSecundario} cursor-pointer`} style={{ color: T.ink, border: `1px solid ${T.rule}` }}>
              <Upload size={16} strokeWidth={1.75} /> {enviandoCapa ? 'Enviando…' : curso.capa ? 'Trocar foto' : 'Enviar foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={enviandoCapa}
                onChange={e => { trocarCapa(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {curso.capa && <button onClick={tirarCapa} className="text-[13.5px] font-medium text-left px-1 hover:underline underline-offset-4" style={{ color: 'var(--a-red)' }}>Remover foto</button>}
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Informações" sub="Nome, endereço e os textos que o aluno lê sobre o curso.">
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <Rotulo texto="Nome do curso"><input className={inputCls} value={f.titulo} onChange={e => muda('titulo', e.target.value)} /></Rotulo>
            <Rotulo texto="Endereço" dica={`nexla.com.br/academy/curso/${f.slug}`}>
              <input className={inputCls} value={f.slug} onChange={e => muda('slug', gerarSlug(e.target.value))} />
            </Rotulo>
          </div>
          <Rotulo texto="Promessa curta (subtítulo)" dica="Uma frase. Aparece embaixo do nome nos blocos.">
            <input className={inputCls} value={f.subtitulo} onChange={e => muda('subtitulo', e.target.value)} />
          </Rotulo>
          <Rotulo texto="Sobre o curso" dica="Texto completo: para quem é, o que resolve, como funciona.">
            <textarea className="acad-field w-full rounded-[10px] px-3.5 py-3 text-[14.5px] leading-relaxed" rows={5} value={f.descricao} onChange={e => muda('descricao', e.target.value)} />
          </Rotulo>
          <Rotulo texto="O que o aluno vai aprender" dica="Um item por linha.">
            <textarea className="acad-field w-full rounded-[10px] px-3.5 py-3 text-[14.5px] leading-relaxed" rows={4} value={f.aprendizados}
              placeholder={'Montar um agente de atendimento no WhatsApp\nAutomatizar confirmações de agenda'} onChange={e => muda('aprendizados', e.target.value)} />
          </Rotulo>
          <div className="grid md:grid-cols-3 gap-5">
            <Rotulo texto="Categoria">
              <input className={inputCls} value={f.categoria} placeholder="Ex.: Atendimento" list="categorias-cursos" onChange={e => muda('categoria', e.target.value)} />
              <datalist id="categorias-cursos">{categorias.map(c => <option key={c} value={c} />)}</datalist>
            </Rotulo>
            <Rotulo texto="Nível">
              <select className={inputCls} value={f.nivel} onChange={e => muda('nivel', e.target.value)}>
                {NIVEIS.map(n => <option key={n.v} value={n.v}>{n.t}</option>)}
              </select>
            </Rotulo>
            <Rotulo texto="Instrutor"><input className={inputCls} value={f.instrutor} onChange={e => muda('instrutor', e.target.value)} /></Rotulo>
          </div>
        </div>
      </Cartao>

      <CartaoInstrutor cursoId={curso.id} />
      <CartaoBonus cursoId={curso.id} />
      <CartaoPerguntas cursoId={curso.id} />

      <Cartao titulo="Módulos" sub="As partes do curso. As aulas de cada módulo você organiza na aba Aulas.">
        <ul className="space-y-2" style={{ opacity: ocupado ? 0.6 : 1 }}>
          {curso.academy_modules.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ border: `1px solid ${T.rule}` }}>
              <span className="text-[12.5px] font-semibold w-7 text-center" style={{ color: T.mute }}>{i + 1}</span>
              <input defaultValue={m.titulo} key={m.titulo} onBlur={e => renomear(m, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="flex-1 min-w-0 bg-transparent font-medium text-[14.5px] px-2 h-9 rounded-md hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Nome do módulo" />
              <span className="text-[12px] shrink-0 hidden sm:block" style={{ color: T.mute }}>{m.academy_lessons.length} aulas</span>
              <button className={iconeBtn} disabled={i === 0 || ocupado} onClick={() => acao(() => mover('academy_modules', curso.academy_modules, i, -1))} aria-label="Subir módulo"><ArrowUp size={15} /></button>
              <button className={iconeBtn} disabled={i === curso.academy_modules.length - 1 || ocupado} onClick={() => acao(() => mover('academy_modules', curso.academy_modules, i, 1))} aria-label="Descer módulo"><ArrowDown size={15} /></button>
              <button className={iconeBtn} disabled={ocupado} onClick={() => apagarModulo(m)} aria-label="Apagar módulo" style={{ color: 'var(--a-red)' }}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
        <button disabled={ocupado} onClick={novoModulo} className={`${botaoSecundario} mt-3`} style={{ color: T.accent, border: '1px dashed rgba(79,70,229,0.4)' }}>
          <Plus size={16} strokeWidth={2} /> Adicionar módulo
        </button>
        <p className="text-[12.5px] mt-2" style={{ color: T.mute }}>Clique no nome para renomear. Salva sozinho ao sair do campo.</p>
      </Cartao>

      <Cartao titulo="Vitrine e publicação" sub="Rascunho: só o admin vê. Publicado: aparece em Explorar cursos.">
        <div className="space-y-4">
          <Chave ligado={f.publicado} onChange={v => muda('publicado', v)} texto={f.publicado ? 'Publicado' : 'Rascunho'} />
          <Chave ligado={f.destaque} onChange={v => muda('destaque', v)} texto="Curso em destaque (selo na vitrine)" />
          <div className="w-40"><Rotulo texto="Ordem na vitrine" dica="Menor aparece primeiro."><input type="number" className={inputCls} value={f.ordem} onChange={e => muda('ordem', e.target.value)} /></Rotulo></div>
        </div>
      </Cartao>

      <CartaoVenda cursoId={curso.id} tituloCurso={curso.titulo} />

      <div className="sticky bottom-4 z-10 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: 'var(--a-vidro)', border: `1px solid ${T.rule}`, boxShadow: '0 12px 30px -16px rgba(15,23,42,0.35)', backdropFilter: 'blur(8px)' }}>
        <span className="text-[13.5px]" style={{ color: msg.erro ? 'var(--a-red)' : pendentes.length ? 'var(--a-amber)' : msg.ok ? 'var(--a-green)' : T.mute }}>
          {msg.erro || (pendentes.length ? `Alterações não salvas: ${pendentes.join(', ')}` : msg.ok || 'Tudo salvo. A foto e os módulos salvam na hora.')}
        </span>
        <button onClick={salvar} disabled={salvando || !pendentes.length} className={`${botaoPrimario} disabled:opacity-50 disabled:cursor-not-allowed`}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      <Cartao titulo="Apagar curso" sub="Remove o curso, as aulas, as matrículas e o progresso dos alunos. Para só esconder, deixe como rascunho." perigo>
        <button onClick={apagarCurso} className={botaoSecundario} style={{ color: 'var(--a-red)', border: '1px solid rgba(185,28,28,0.3)' }}>
          <Trash2 size={15} strokeWidth={1.75} /> Apagar curso
        </button>
      </Cartao>
    </div>
    </SalvarTudo.Provider>
  );
}

/* ─── Página do curso no admin: cabeçalho + abas ─────────────────── */
function Editor({ nome, id }: { nome: string; id: string }) {
  const [curso, setCurso] = useState<CursoA | 'erro' | null>(null);
  type Aba = 'aulas' | 'alunos' | 'config';
  const [aba, setAba] = useState<Aba>(() => { const a = parametro('aba'); return a === 'config' || a === 'alunos' ? a : 'aulas'; });

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('academy_courses').select(SELECT).eq('id', id).maybeSingle();
    setCurso(error || !data ? 'erro' : ordenar(data as unknown as CursoA));
  }, [id]);
  useEffect(() => { recarregar(); }, [recarregar]);

  useEffect(() => {
    const aoNavegar = () => { const a = parametro('aba'); setAba(a === 'config' || a === 'alunos' ? a : 'aulas'); };
    window.addEventListener('popstate', aoNavegar);
    return () => window.removeEventListener('popstate', aoNavegar);
  }, []);

  const trocarAba = (a: Aba) => { setAba(a); navegar(`/admin/curso/${id}${a === 'aulas' ? '' : `?aba=${a}`}`, { substituir: true }); };

  if (!curso) return <AdminLayout nome={nome}><Carregando /></AdminLayout>;
  if (curso === 'erro') {
    return (
      <AdminLayout nome={nome}>
        <p className="text-[14.5px]" style={{ color: 'var(--a-red)' }}>Não foi possível abrir o curso. Confira se o <strong>010_config_curso.sql</strong> foi rodado no Supabase.</p>
        <Link para="/admin/cursos" className="inline-block mt-4 font-semibold" style={{ color: T.accent }}>Voltar para os cursos</Link>
      </AdminLayout>
    );
  }

  const ABAS = [
    { id: 'aulas' as const,  icone: ListVideo, texto: `Aulas (${totalAulas(curso)})` },
    { id: 'alunos' as const, icone: Users,     texto: 'Alunos' },
    { id: 'config' as const, icone: Settings,  texto: 'Configurações' },
  ];

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <Link para="/admin/cursos" className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-5 hover:underline underline-offset-4" style={{ color: T.mute }}>
          <ArrowLeft size={15} strokeWidth={1.75} /> Todos os cursos
        </Link>

        {/* Cabeçalho do curso */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
          <div className="w-full sm:w-44 aspect-[16/9] rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: CAPA_PADRAO }}>
            {curso.capa ? <img src={curso.capa} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={22} strokeWidth={1.5} style={{ color: 'rgba(224,231,255,0.5)' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(22px,2.8vw,30px)' }}>{curso.titulo}</h1>
              <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full"
                style={curso.publicado ? { background: 'var(--a-green-bg)', color: 'var(--a-green)' } : { background: 'var(--a-soft)', color: T.mute }}>
                {curso.publicado ? 'Publicado' : 'Rascunho'}
              </span>
            </div>
            <p className="text-[13.5px] mt-1" style={{ color: T.mute }}>
              {curso.academy_modules.length} módulos · {totalAulas(curso)} aulas · {horasAulas(curso)}h de conteúdo
            </p>
          </div>
          <Link para={`/curso/${curso.slug}`} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[14px] font-semibold shrink-0 hover:bg-white"
            style={{ color: T.accent, border: '1px solid rgba(79,70,229,0.3)' }}>
            <Eye size={15} strokeWidth={1.75} /> Ver como aluno
          </Link>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mb-6" role="tablist" style={{ borderBottom: `1px solid ${T.rule}` }}>
          {ABAS.map(a => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} onClick={() => trocarAba(a.id)}
              className="inline-flex items-center gap-2 px-4 h-11 text-[14.5px] font-semibold -mb-px transition-colors"
              style={{ color: aba === a.id ? T.accent : T.mute, borderBottom: `2px solid ${aba === a.id ? T.accent : 'transparent'}` }}>
              <a.icone size={16} strokeWidth={1.75} /> {a.texto}
            </button>
          ))}
        </div>

        {aba === 'aulas' && <AbaAulas curso={curso} recarregar={recarregar} irConfig={() => trocarAba('config')} />}
        {aba === 'alunos' && <AbaAlunos cursoId={curso.id} />}
        {aba === 'config' && <AbaConfig key={curso.id} curso={curso} recarregar={recarregar} />}
      </motion.div>
    </AdminLayout>
  );
}

export default function AdminCurso({ sessao, id }: { sessao: Session; id: string }) {
  return (
    <SoAdmin sessao={sessao}>
      {nome => id === 'novo' ? (
        <AdminLayout nome={nome}>
          <Link para="/admin/cursos" className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-5 hover:underline underline-offset-4" style={{ color: T.mute }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> Todos os cursos
          </Link>
          <h1 className="font-bold leading-tight mb-6" style={{ ...display, fontSize: 'clamp(24px,3vw,32px)' }}>Novo curso</h1>
          <NovoCurso />
        </AdminLayout>
      ) : <Editor key={id} nome={nome} id={id} />}
    </SoAdmin>
  );
}
