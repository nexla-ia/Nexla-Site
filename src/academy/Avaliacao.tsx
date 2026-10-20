import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Star, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { supabase } from './supabase';

const AMBAR = '#F59E0B';
const ROTULOS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];
const LIMITE = 500;

/* Média do curso em estrelas: "★ 4,8 (12 avaliações)" */
export function MediaEstrelas({ media, total, claro = false }: { media: number; total: number; claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px]" style={{ color: claro ? '#E0E7FF' : T.mute }}>
      <Star size={14} strokeWidth={0} fill={AMBAR} />
      <strong style={{ color: claro ? '#FFFFFF' : T.ink }}>{media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
      ({total} {total === 1 ? 'avaliação' : 'avaliações'})
    </span>
  );
}

/* Nota do próprio aluno: "Sua nota ★★★★☆" */
export function MinhaNota({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: T.mute }} aria-label={`Sua nota: ${nota} de 5 estrelas`}>
      Sua nota
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => <Star key={n} size={13} strokeWidth={1.5} color={n <= nota ? AMBAR : '#CBD5E1'} fill={n <= nota ? AMBAR : 'transparent'} />)}
      </span>
    </span>
  );
}

/* Pedido de avaliação ao concluir o curso. Aparece uma vez por curso:
 * fechar no X grava "dispensado" (não aparece mais); escolher as estrelas grava a nota na hora
 * e depois pede um comentário curto (opcional). */
export default function Avaliacao({ sessao, cursoId, titulo, onFim }: {
  sessao: Session; cursoId: string; titulo: string; onFim: () => void;
}) {
  const [etapa, setEtapa] = useState<'estrelas' | 'comentario' | 'obrigado'>('estrelas');
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const gravar = (campos: Record<string, unknown>) =>
    supabase.from('academy_course_reviews').upsert(
      { user_id: sessao.user.id, course_id: cursoId, atualizado_em: new Date().toISOString(), ...campos },
      { onConflict: 'user_id,course_id' },
    );

  const dispensar = async () => {
    if (etapa === 'estrelas') await gravar({ dispensado: true }); // fechou sem avaliar: não pergunta de novo
    onFim();
  };

  const escolher = async (n: number) => {
    setNota(n); setErro(''); setEnviando(true);
    const { error } = await gravar({ estrelas: n, dispensado: false });
    setEnviando(false);
    if (error) return setErro('Não foi possível salvar sua nota. Tente de novo.');
    setEtapa('comentario');
  };

  const enviarComentario = async () => {
    if (!comentario.trim()) return setEtapa('obrigado');
    setEnviando(true); setErro('');
    const { error } = await gravar({ estrelas: nota, comentario: comentario.trim() });
    setEnviando(false);
    if (error) return setErro('Não foi possível enviar o comentário. Tente de novo.');
    setEtapa('obrigado');
  };

  const ativa = hover || nota;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="avaliacao-titulo"
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease }}
        className="relative w-full max-w-md rounded-2xl p-7 text-center" style={{ background: T.card }}>
        <button onClick={etapa === 'obrigado' ? onFim : dispensar} aria-label="Fechar"
          className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
          <X size={18} strokeWidth={1.75} />
        </button>

        <AnimatePresence mode="wait">
          {etapa === 'obrigado' ? (
            <motion.div key="obrigado" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CheckCircle2 size={44} strokeWidth={1.5} className="mx-auto" style={{ color: '#22C55E' }} />
              <h2 id="avaliacao-titulo" className="font-bold text-[22px] mt-4" style={display}>Obrigado pela avaliação!</h2>
              <p className="text-[14.5px] mt-2" style={{ color: T.mute }}>Sua opinião ajuda outros alunos a escolher e ajuda a gente a melhorar os cursos.</p>
              <button onClick={onFim} className="acad-btn mt-6 w-full h-11 rounded-[10px] text-[15px] font-semibold text-white">Fechar</button>
            </motion.div>
          ) : (
            <motion.div key="avaliar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 id="avaliacao-titulo" className="font-bold text-[22px] leading-snug pr-6 pl-6" style={display}>
                {etapa === 'estrelas' ? 'Como foi o curso?' : 'Conta pra gente em poucas palavras'}
              </h2>
              <p className="text-[14.5px] mt-1.5" style={{ color: T.mute }}>
                {etapa === 'estrelas' ? titulo : 'O que você mais gostou ou o que podemos melhorar?'}
              </p>

              {/* Estrelas */}
              <div className="flex justify-center gap-1.5 mt-6" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Nota de 1 a 5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}: ${ROTULOS[n]}`}
                    disabled={enviando} onMouseEnter={() => setHover(n)} onClick={() => escolher(n)}
                    className="p-1 transition-transform hover:scale-110 disabled:cursor-wait">
                    <Star size={36} strokeWidth={1.5} color={n <= ativa ? AMBAR : '#CBD5E1'} fill={n <= ativa ? AMBAR : 'transparent'} />
                  </button>
                ))}
              </div>
              <p className="h-5 mt-1 text-[13.5px] font-semibold" style={{ color: ativa ? '#B45309' : 'transparent' }}>{ROTULOS[ativa]}</p>

              {etapa === 'comentario' && (
                <div className="mt-4 text-left">
                  <textarea value={comentario} onChange={e => setComentario(e.target.value.slice(0, LIMITE))} rows={4} autoFocus
                    placeholder="Ex.: as aulas de WhatsApp já me economizaram horas na semana."
                    className="acad-field w-full rounded-[10px] px-4 py-3 text-[14.5px] leading-relaxed resize-none" />
                  <p className="text-right text-[12px] mt-1" style={{ color: '#94A3B8' }}>{comentario.length}/{LIMITE}</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => setEtapa('obrigado')} className="flex-1 h-11 rounded-[10px] text-[14.5px] font-medium hover:bg-slate-50"
                      style={{ color: T.mute, border: `1px solid ${T.rule}` }}>Pular</button>
                    <button onClick={enviarComentario} disabled={enviando}
                      className="acad-btn flex-[2] h-11 rounded-[10px] text-[14.5px] font-semibold text-white">
                      {enviando ? 'Enviando…' : 'Enviar avaliação'}
                    </button>
                  </div>
                </div>
              )}
              {erro && <p className="mt-3 text-[13.5px]" style={{ color: '#B91C1C' }}>{erro}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
