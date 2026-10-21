import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BarChart3, BookOpen, Check, ChevronDown, Clock, Lock, PlayCircle, ShieldCheck, Star, UserRound } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout } from './AppLayout';
import { Link } from './router';
import { supabase, minutos, type organizar } from './supabase';

type CursoOrg = ReturnType<typeof organizar>;
type Detalhes = {
  descricao: string | null; aprendizados: string[]; nivel: string | null; instrutor: string | null;
  categoria: string | null; certificado: boolean; carga_horaria_h: number | null;
};
const NIVEL: Record<string, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };
const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* Página do curso para quem ainda NÃO comprou: apresentação + só o 1º vídeo (amostra) + compra.
 * Quem comprou vê o curso completo (Curso.tsx). */
export default function PaginaCurso({ curso, nome }: { sessao: Session; curso: CursoOrg; nome: string }) {
  const [det, setDet] = useState<Detalhes | null>(null);
  const [preco, setPreco] = useState<{ valor: number; de: number | null } | null | undefined>(undefined);
  const [nota, setNota] = useState<{ media: number; total: number } | null>(null);
  const [aberto, setAberto] = useState<string | null>(curso.academy_modules[0]?.id ?? null);

  useEffect(() => {
    // Detalhes (010), preço (014) e nota (006): cada um é opcional — se a tabela não existir, a página segue sem ele
    supabase.from('academy_courses').select('descricao, aprendizados, nivel, instrutor, categoria, certificado, carga_horaria_h').eq('id', curso.id).maybeSingle()
      .then(({ data }) => setDet((data as Detalhes | null) ?? null));
    supabase.from('academy_products').select('preco, preco_promocional').eq('course_id', curso.id).eq('tipo', 'curso').eq('ativo', true).maybeSingle()
      .then(({ data }) => setPreco(data ? { valor: Number(data.preco_promocional ?? data.preco), de: data.preco_promocional != null ? Number(data.preco) : null } : null));
    supabase.rpc('academy_media_cursos').then(({ data }) => {
      const n = ((data ?? []) as { course_id: string; media: number; total: number }[]).find(x => x.course_id === curso.id);
      if (n) setNota({ media: Number(n.media), total: n.total });
    });
  }, [curso.id]);

  const amostra = curso.aulas[0];
  const segundos = curso.aulas.reduce((s, a) => s + a.duracao_seg, 0);
  const horas = det?.carga_horaria_h ?? Math.max(1, Math.round(segundos / 3600));
  const emitirCertificado = det?.certificado ?? true;

  const BotaoComprar = ({ cheio = false }: { cheio?: boolean }) => preco ? (
    <Link para={`/comprar/${curso.slug}`}
      className={`acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] text-[15px] font-semibold text-white ${cheio ? 'w-full' : ''}`}>
      Comprar agora
    </Link>
  ) : (
    <span className={`inline-flex items-center justify-center h-12 px-6 rounded-[10px] text-[14.5px] font-semibold ${cheio ? 'w-full' : ''}`}
      style={{ background: 'rgba(15,23,42,0.06)', color: T.mute }}>
      {preco === undefined ? 'Carregando…' : 'Vendas em breve'}
    </span>
  );

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        {/* ── Topo: nome, promessa, números e compra ── */}
        <section className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start mb-10">
          <div>
            {det?.categoria && <p className="text-[13px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.accent }}>{det.categoria}</p>}
            <h1 className="font-bold leading-[1.1]" style={{ ...display, fontSize: 'clamp(30px,4vw,44px)' }}>{curso.titulo}</h1>
            {curso.subtitulo && <p className="text-[17px] leading-relaxed mt-3" style={{ color: T.ink2 }}>{curso.subtitulo}</p>}

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-[14px]" style={{ color: T.mute }}>
              {nota && (
                <span className="inline-flex items-center gap-1.5">
                  <Star size={15} strokeWidth={0} fill="#F59E0B" />
                  <strong style={{ color: T.ink }}>{nota.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong> ({nota.total})
                </span>
              )}
              <span className="inline-flex items-center gap-1.5"><BookOpen size={15} /> {curso.academy_modules.length} módulos · {curso.aulas.length} aulas</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {horas}h de conteúdo</span>
              {det?.nivel && <span className="inline-flex items-center gap-1.5"><BarChart3 size={15} /> {NIVEL[det.nivel] ?? det.nivel}</span>}
              {emitirCertificado && <span className="inline-flex items-center gap-1.5"><Award size={15} /> Certificado</span>}
              {det?.instrutor && <span className="inline-flex items-center gap-1.5"><UserRound size={15} /> {det.instrutor}</span>}
            </div>

            {/* Vídeo de amostra */}
            {amostra && (
              <div className="mt-7">
                <div className="aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
                  style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText }}>
                  <PlayCircle size={56} strokeWidth={1.25} style={{ color: '#A5B4FC' }} />
                  <p className="mt-3 text-[14px]" style={{ color: 'rgba(241,245,249,0.7)' }}>O vídeo de amostra entra aqui (Bunny Stream)</p>
                </div>
                <p className="mt-3 text-[14px]" style={{ color: T.mute }}>
                  <strong style={{ color: T.ink }}>Aula de amostra:</strong> {amostra.titulo} · {minutos(amostra.duracao_seg)}
                </p>
              </div>
            )}
          </div>

          {/* Caixa de compra */}
          <aside className="rounded-2xl p-6 lg:sticky lg:top-24" style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -30px rgba(79,70,229,0.45)' }}>
            {preco ? (
              <>
                {preco.de != null && <p className="text-[14px]" style={{ color: T.mute }}>De <s>{reais(preco.de)}</s> por</p>}
                <p className="font-bold text-[34px] leading-none mt-1" style={display}>{reais(preco.valor)}</p>
                <p className="text-[13px] mt-2" style={{ color: T.mute }}>Pix, boleto ou cartão em até 12x</p>
              </>
            ) : (
              <p className="font-semibold text-[16px]">{preco === undefined ? '' : 'Este curso abre para compra em breve.'}</p>
            )}
            <div className="mt-5"><BotaoComprar cheio /></div>
            <ul className="mt-5 space-y-2.5 text-[14px]" style={{ color: T.ink2 }}>
              {[
                `Acesso às ${curso.aulas.length} aulas, no celular e no computador`,
                'Materiais para baixar',
                ...(emitirCertificado ? ['Certificado de conclusão'] : []),
                'Comunidade com outros alunos',
              ].map(t => <li key={t} className="flex items-start gap-2"><Check size={16} className="shrink-0 mt-0.5" color="#22C55E" /> {t}</li>)}
            </ul>
            <p className="flex items-start gap-2 text-[13px] mt-5 pt-4" style={{ color: T.mute, borderTop: `1px solid ${T.rule}` }}>
              <ShieldCheck size={16} className="shrink-0 mt-px" style={{ color: '#15803D' }} />
              Garantia de 7 dias: se não gostar, devolvemos o valor.
            </p>
          </aside>
        </section>

        <div className="grid lg:grid-cols-[1fr_22rem] gap-8">
          <div className="space-y-8 min-w-0">
            {/* Sobre */}
            {det?.descricao && (
              <section>
                <h2 className="font-bold text-[22px] mb-3" style={display}>Sobre o curso</h2>
                <p className="text-[15.5px] leading-relaxed whitespace-pre-line" style={{ color: T.ink2 }}>{det.descricao}</p>
              </section>
            )}

            {/* O que vai aprender */}
            {det?.aprendizados && det.aprendizados.length > 0 && (
              <section className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <h2 className="font-bold text-[20px] mb-4" style={display}>O que você vai aprender</h2>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  {det.aprendizados.map(a => (
                    <li key={a} className="flex items-start gap-2.5 text-[14.5px]" style={{ color: T.ink2 }}>
                      <Check size={17} className="shrink-0 mt-0.5" style={{ color: T.accent }} /> {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Conteúdo */}
            <section>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="font-bold text-[22px]" style={display}>Conteúdo do curso</h2>
                <span className="text-[13.5px]" style={{ color: T.mute }}>{curso.academy_modules.length} módulos · {curso.aulas.length} aulas · {horas}h</span>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                {curso.academy_modules.map((m, i) => {
                  const ab = aberto === m.id;
                  return (
                    <div key={m.id} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                      <button onClick={() => setAberto(ab ? null : m.id)} aria-expanded={ab}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50">
                        <span>
                          <span className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: T.accent }}>Módulo {i + 1}</span>
                          <span className="block font-semibold text-[15.5px]">{m.titulo}</span>
                        </span>
                        <span className="flex items-center gap-3 shrink-0 text-[13px]" style={{ color: T.mute }}>
                          {m.academy_lessons.length} aulas
                          <ChevronDown size={18} className="transition-transform" style={{ transform: ab ? 'rotate(180deg)' : 'none' }} />
                        </span>
                      </button>
                      {ab && (
                        <ul className="pb-2">
                          {m.academy_lessons.map(a => {
                            const eAmostra = a.id === amostra?.id;
                            return (
                              <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-[14px]">
                                {eAmostra ? <PlayCircle size={16} style={{ color: T.accent }} /> : <Lock size={15} style={{ color: '#94A3B8' }} />}
                                <span className="flex-1" style={{ color: eAmostra ? T.ink : T.ink2 }}>{a.titulo}</span>
                                {eAmostra && <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,70,229,0.08)', color: T.accent }}>Amostra</span>}
                                <span className="text-[12.5px] w-14 text-right" style={{ color: T.mute }}>{minutos(a.duracao_seg)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Celular: botão de compra fixo embaixo */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.95)', borderTop: `1px solid ${T.rule}`, backdropFilter: 'blur(8px)' }}>
          {preco && <span className="font-bold text-[18px] shrink-0" style={display}>{reais(preco.valor)}</span>}
          <div className="flex-1"><BotaoComprar cheio /></div>
        </div>
        <div className="lg:hidden h-20" />
      </motion.div>
    </AppLayout>
  );
}
