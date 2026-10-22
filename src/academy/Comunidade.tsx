import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownRight, MessageSquare, Send, Trash2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display } from './ui';
import { supabase } from './supabase';

type Comentario = {
  id: string; user_id: string; parent_id: string | null;
  texto: string; autor_nome: string | null; autor_admin: boolean; criado_em: string;
};

const LIMITE = 2000;

/* "agora", "há 5 min", "há 2 h", "há 3 dias" ou a data */
function quando(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) { const d = Math.floor(s / 86400); return `há ${d} dia${d > 1 ? 's' : ''}`; }
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Avatar({ nome, admin, pequeno = false }: { nome: string; admin: boolean; pequeno?: boolean }) {
  return (
    <span className={`${pequeno ? 'w-8 h-8 text-[12.5px]' : 'w-10 h-10 text-[14px]'} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ background: admin ? 'linear-gradient(135deg, #F97316, #FB923C)' : `linear-gradient(135deg, ${T.accent}, ${T.violet})` }} aria-hidden>
      {(nome.trim()[0] || '?').toUpperCase()}
    </span>
  );
}

function Caixa({ valor, onChange, onEnviar, enviando, placeholder, autoFocus = false, onCancelar }: {
  valor: string; onChange: (v: string) => void; onEnviar: () => void; enviando: boolean;
  placeholder: string; autoFocus?: boolean; onCancelar?: () => void;
}) {
  const vazio = !valor.trim();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <textarea value={valor} onChange={e => onChange(e.target.value.slice(0, LIMITE))} placeholder={placeholder} autoFocus={autoFocus}
        rows={3} className="w-full resize-y px-4 py-3 text-[14.5px] leading-relaxed outline-none bg-transparent" style={{ color: T.ink }}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !vazio) onEnviar(); }} />
      <div className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderTop: `1px solid ${T.rule}`, background: 'var(--a-soft2)' }}>
        <span className="text-[12px]" style={{ color: valor.length > LIMITE * 0.9 ? 'var(--a-red)' : '#94A3B8' }}>{valor.length}/{LIMITE}</span>
        <div className="flex items-center gap-2">
          {onCancelar && (
            <button onClick={onCancelar} className="h-9 px-3 rounded-lg text-[13.5px] font-medium hover:bg-slate-100" style={{ color: T.mute }}>Cancelar</button>
          )}
          <button onClick={onEnviar} disabled={vazio || enviando}
            className="acad-btn inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13.5px] font-semibold text-white">
            <Send size={14} strokeWidth={2} /> {enviando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Comunidade da aula: comentários com 1 nível de resposta. Quem vê e comenta é definido pelo banco (RLS). */
export default function Comunidade({ sessao, aulaId }: { sessao: Session; aulaId: string }) {
  const [lista, setLista] = useState<Comentario[] | null>(null);
  const [texto, setTexto] = useState('');
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    const { data, error } = await supabase.from('academy_lesson_comments')
      .select('id, user_id, parent_id, texto, autor_nome, autor_admin, criado_em')
      .eq('lesson_id', aulaId).order('criado_em', { ascending: true });
    if (error) { setErro('A comunidade não carregou. Recarregue a página.'); setLista([]); return; }
    setLista((data ?? []) as Comentario[]);
  };

  useEffect(() => {
    setLista(null); setTexto(''); setRespondendo(null); setResposta(''); setErro('');
    carregar();
  }, [aulaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const publicar = async (conteudo: string, parent: string | null) => {
    if (!conteudo.trim() || enviando) return;
    setEnviando(true); setErro('');
    const { error } = await supabase.from('academy_lesson_comments')
      .insert({ lesson_id: aulaId, user_id: sessao.user.id, parent_id: parent, texto: conteudo.trim() });
    setEnviando(false);
    if (error) return setErro('Não foi possível publicar agora. Tente de novo.');
    if (parent) { setResposta(''); setRespondendo(null); } else setTexto('');
    carregar();
  };

  const apagar = async (id: string) => {
    if (!window.confirm('Apagar este comentário? As respostas dele também serão apagadas.')) return;
    const { error } = await supabase.from('academy_lesson_comments').delete().eq('id', id);
    if (error) return setErro('Não foi possível apagar agora.');
    carregar();
  };

  const principais = (lista ?? []).filter(c => !c.parent_id).reverse(); // mais recentes primeiro
  const respostasDe = (id: string) => (lista ?? []).filter(c => c.parent_id === id); // em ordem de conversa

  const Item = ({ c, resposta: ehResposta = false }: { c: Comentario; resposta?: boolean }) => (
    <div className="flex gap-3">
      <Avatar nome={c.autor_nome || 'Aluno'} admin={c.autor_admin} pequeno={ehResposta} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[14px] font-semibold" style={{ color: T.ink }}>{c.autor_nome || 'Aluno'}</span>
          {c.autor_admin && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--a-orange)' }}>Instrutor</span>
          )}
          {c.user_id === sessao.user.id && !c.autor_admin && <span className="text-[11.5px]" style={{ color: '#94A3B8' }}>você</span>}
          <span className="text-[12.5px]" style={{ color: '#94A3B8' }}>· {quando(c.criado_em)}</span>
        </div>
        <p className="text-[14.5px] leading-relaxed mt-1 whitespace-pre-wrap break-words" style={{ color: T.ink2 }}>{c.texto}</p>
        <div className="flex items-center gap-4 mt-1.5">
          {!ehResposta && (
            <button onClick={() => { setRespondendo(respondendo === c.id ? null : c.id); setResposta(''); }}
              className="text-[13px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>Responder</button>
          )}
          {c.user_id === sessao.user.id && (
            <button onClick={() => apagar(c.id)} className="inline-flex items-center gap-1 text-[13px] font-medium hover:underline underline-offset-4" style={{ color: T.mute }}>
              <Trash2 size={13} strokeWidth={1.75} /> Apagar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="mt-10 pt-8" style={{ borderTop: `1px solid ${T.rule}` }}>
      <div className="flex items-center gap-2.5 mb-1">
        <MessageSquare size={19} strokeWidth={1.75} style={{ color: T.accent }} />
        <h3 className="font-bold text-[20px]" style={display}>Comunidade</h3>
        {lista && <span className="text-[14px]" style={{ color: T.mute }}>· {lista.length} comentário{lista.length === 1 ? '' : 's'}</span>}
      </div>
      <p className="text-[14px] mb-5" style={{ color: T.mute }}>Tire dúvidas, conte como aplicou na sua empresa e ajude outros alunos.</p>

      <Caixa valor={texto} onChange={setTexto} onEnviar={() => publicar(texto, null)} enviando={enviando && !respondendo}
        placeholder="Escreva um comentário sobre esta aula…" />
      {erro && <p className="mt-3 text-[13.5px]" style={{ color: 'var(--a-red)' }}>{erro}</p>}

      <div className="mt-7 space-y-6">
        {lista === null && <p className="text-[14px]" style={{ color: T.mute }}>Carregando comentários…</p>}
        {lista?.length === 0 && (
          <p className="text-[14px] rounded-xl px-4 py-5 text-center" style={{ color: T.mute, border: `1px dashed ${T.rule}` }}>
            Ninguém comentou nesta aula ainda. Seja o primeiro!
          </p>
        )}
        <AnimatePresence initial={false}>
          {principais.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Item c={c} />
              {(respostasDe(c.id).length > 0 || respondendo === c.id) && (
                <div className="ml-[3.25rem] mt-4 pl-4 space-y-4" style={{ borderLeft: `2px solid ${T.rule}` }}>
                  {respostasDe(c.id).map(r => <Item key={r.id} c={r} resposta />)}
                  {respondendo === c.id && (
                    <div className="flex gap-2">
                      <CornerDownRight size={16} strokeWidth={1.75} className="mt-3 shrink-0" style={{ color: '#94A3B8' }} />
                      <div className="flex-1">
                        <Caixa valor={resposta} onChange={setResposta} onEnviar={() => publicar(resposta, c.id)} enviando={enviando}
                          placeholder={`Responder ${c.autor_nome || 'Aluno'}…`} autoFocus onCancelar={() => setRespondendo(null)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
