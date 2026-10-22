import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BarChart3, BookOpen, Check, ChevronDown, Clock, Gift, Lock, PlayCircle, ShieldCheck, Star, UserRound } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, Carregando, PublicLayout } from './AppLayout';
import { Link } from './router';
import { supabase, minutos, organizar, SELECT_CURSO, type Curso } from './supabase';

type CursoOrg = ReturnType<typeof organizar>;
type Detalhes = {
  descricao: string | null; aprendizados: string[]; nivel: string | null; instrutor: string | null;
  categoria: string | null; certificado: boolean; carga_horaria_h: number | null;
};
type Bonus = { titulo: string; descricao?: string };
type Pergunta = { pergunta: string; resposta: string };

const NIVEL: Record<string, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };
const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* Perguntas que valem para todo curso (as do próprio curso aparecem antes) */
const FAQ_PADRAO: Pergunta[] = [
  { pergunta: 'Como eu acesso o curso depois de comprar?', resposta: 'Assim que o pagamento é aprovado, o curso aparece em "Meus cursos" na sua conta. No Pix é na hora; no boleto, quando o banco confirmar (até 3 dias úteis).' },
  { pergunta: 'Posso assistir pelo celular?', resposta: 'Sim. As aulas funcionam no celular e no computador, e o seu progresso fica salvo para continuar de onde parou. A conta fica conectada em um dispositivo por vez.' },
  { pergunta: 'E se eu não gostar?', resposta: 'Você tem 7 dias de garantia. Se pedir o reembolso nesse prazo, devolvemos o valor e o acesso ao curso é encerrado.' },
  { pergunta: 'Quais as formas de pagamento?', resposta: 'Pix, boleto ou cartão de crédito em até 12x, pelo Mercado Pago. Os dados do seu cartão não passam pela Nexla.' },
];

/* Página do curso para quem ainda NÃO comprou (logado ou visitante): apresentação + só o 1º vídeo + compra.
 * Quem comprou vê o curso completo (Curso.tsx). */
export default function PaginaCurso({ sessao, curso, nome }: { sessao: Session | null; curso: CursoOrg; nome: string }) {
  const [det, setDet] = useState<Detalhes | null>(null);
  const [extras, setExtras] = useState<{ bonus: Bonus[]; faq: Pergunta[] }>({ bonus: [], faq: [] });
  const [preco, setPreco] = useState<{ valor: number; de: number | null } | null | undefined>(undefined);
  const [nota, setNota] = useState<{ media: number; total: number } | null>(null);
  const [aberto, setAberto] = useState<string | null>(curso.academy_modules[0]?.id ?? null);
  const [faqAberta, setFaqAberta] = useState<number | null>(0);

  useEffect(() => {
    // Cada parte é opcional: se a coluna/tabela ainda não existir no banco, a página segue sem ela
    supabase.from('academy_courses').select('descricao, aprendizados, nivel, instrutor, categoria, certificado, carga_horaria_h').eq('id', curso.id).maybeSingle()
      .then(({ data }) => setDet((data as Detalhes | null) ?? null));
    supabase.from('academy_courses').select('bonus, faq').eq('id', curso.id).maybeSingle()
      .then(({ data }) => setExtras({ bonus: ((data?.bonus ?? []) as Bonus[]).filter(b => b?.titulo), faq: ((data?.faq ?? []) as Pergunta[]).filter(f => f?.pergunta) }));
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
  const faq = [...extras.faq, ...FAQ_PADRAO];
  const compra = `/comprar/${curso.slug}`;
  // Visitante: cria a conta grátis e cai direto na compra
  const destinoComprar = sessao ? compra : `/criar-conta?voltar=${encodeURIComponent(compra)}`;

  const BotaoComprar = ({ cheio = false }: { cheio?: boolean }) => preco ? (
    <Link para={destinoComprar}
      className={`acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] text-[15px] font-semibold text-white ${cheio ? 'w-full' : ''}`}>
      Comprar agora
    </Link>
  ) : (
    <span className={`inline-flex items-center justify-center h-12 px-6 rounded-[10px] text-[14.5px] font-semibold ${cheio ? 'w-full' : ''}`}
      style={{ background: 'rgba(15,23,42,0.06)', color: T.mute }}>
      {preco === undefined ? 'Carregando…' : 'Vendas em breve'}
    </span>
  );

  const conteudo = (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
      {/* ── Topo: nome, promessa, números e compra ── */}
      <section className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start mb-10">
        <div className="min-w-0">
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

          {/* Vídeo de amostra: visitante cria a conta grátis para assistir (vira lead) */}
          {amostra && (
            <div className="mt-7">
              <div className="relative aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
                style={{ background: curso.capa ? `linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.72)), url("${curso.capa}") center/cover` : `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText }}>
                <PlayCircle size={56} strokeWidth={1.25} style={{ color: '#A5B4FC' }} />
                {sessao ? (
                  <p className="mt-3 text-[14px]" style={{ color: 'rgba(241,245,249,0.75)' }}>O vídeo de amostra entra aqui (Bunny Stream)</p>
                ) : (
                  <>
                    <p className="mt-3 font-semibold text-[16px]">Assista à aula de amostra grátis</p>
                    <p className="mt-1 text-[14px]" style={{ color: 'rgba(241,245,249,0.75)' }}>Crie sua conta em menos de um minuto.</p>
                    <Link para={`/criar-conta?voltar=${encodeURIComponent(`/curso/${curso.slug}`)}`}
                      className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold"
                      style={{ background: '#FFFFFF', color: T.ink }}>
                      Criar conta grátis e assistir
                    </Link>
                  </>
                )}
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
          {!sessao && preco && (
            <p className="text-[13px] text-center mt-2.5" style={{ color: T.mute }}>
              Já tem conta? <Link para={`/entrar?voltar=${encodeURIComponent(compra)}`} className="font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>Entrar</Link>
            </p>
          )}
          <ul className="mt-5 space-y-2.5 text-[14px]" style={{ color: T.ink2 }}>
            {[
              `Acesso às ${curso.aulas.length} aulas, no celular e no computador`,
              'Materiais para baixar',
              ...(emitirCertificado ? ['Certificado de conclusão'] : []),
              ...(extras.bonus.length ? [`${extras.bonus.length} bônus inclusos`] : []),
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
        <div className="space-y-10 min-w-0">
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

          {/* Bônus */}
          {extras.bonus.length > 0 && (
            <section>
              <h2 className="font-bold text-[22px] mb-3" style={display}>Bônus inclusos</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {extras.bonus.map(b => (
                  <div key={b.titulo} className="rounded-2xl p-5 flex gap-4" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.1)', color: '#C2410C' }}>
                      <Gift size={19} strokeWidth={1.75} />
                    </span>
                    <span>
                      <span className="block font-semibold text-[15px]">{b.titulo}</span>
                      {b.descricao && <span className="block text-[13.5px] mt-0.5" style={{ color: T.mute }}>{b.descricao}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Perguntas frequentes */}
          <section>
            <h2 className="font-bold text-[22px] mb-3" style={display}>Perguntas frequentes</h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
              {faq.map((f, i) => {
                const ab = faqAberta === i;
                return (
                  <div key={f.pergunta} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                    <button onClick={() => setFaqAberta(ab ? null : i)} aria-expanded={ab}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50">
                      <span className="font-semibold text-[15px]">{f.pergunta}</span>
                      <ChevronDown size={18} className="shrink-0 transition-transform" style={{ color: T.mute, transform: ab ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {ab && <p className="px-5 pb-4 text-[14.5px] leading-relaxed whitespace-pre-line" style={{ color: T.ink2 }}>{f.resposta}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chamada final */}
          {preco && (
            <section className="rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5"
              style={{ background: T.card, border: '1px solid rgba(79,70,229,0.25)' }}>
              <div>
                <p className="font-bold text-[20px]" style={display}>Pronto para começar?</p>
                <p className="text-[14.5px] mt-1" style={{ color: T.mute }}>{reais(preco.valor)} · acesso imediato no Pix · 7 dias de garantia</p>
              </div>
              <BotaoComprar />
            </section>
          )}
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
  );

  return sessao
    ? <AppLayout nome={nome}>{conteudo}</AppLayout>
    : <PublicLayout voltar={`/curso/${curso.slug}`}>{conteudo}</PublicLayout>;
}

/* Página do curso aberta a visitantes (sem login): carrega o curso pelo endereço */
export function CursoPublico({ slug }: { slug: string }) {
  const [curso, setCurso] = useState<CursoOrg | null | 'nao'>(null);
  useEffect(() => {
    supabase.from('academy_courses').select(SELECT_CURSO).eq('slug', slug).maybeSingle()
      .then(({ data }) => setCurso(data ? organizar(data as unknown as Curso) : 'nao'));
  }, [slug]);
  if (curso === null) return <PublicLayout><Carregando /></PublicLayout>;
  if (curso === 'nao') {
    return (
      <PublicLayout>
        <div className="text-center py-20">
          <p className="font-bold text-[22px]" style={display}>Curso não encontrado</p>
          <Link para="/" className="inline-block mt-4 font-semibold" style={{ color: T.accent }}>Ver todos os cursos</Link>
        </div>
      </PublicLayout>
    );
  }
  return <PaginaCurso sessao={null} curso={curso} nome="" />;
}
