import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BarChart3, BookOpen, Check, ChevronDown, Clock, Gift, PlayCircle, ShieldCheck, Star, Wrench } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, Carregando } from './AppLayout';
import { Link, BASE } from './router';
import { supabase, minutos, buscarResumos, type ResumoCurso } from './supabase';
import { useCursosAluno } from './dados';
import { CardVitrine, GRADE_CURSOS } from './Explorar';
import { checkout } from './Compra';
import VideoAula from './Video';
import { evento } from './pixel';

type Basico = { id: string; slug: string; titulo: string; subtitulo: string | null; capa: string | null };
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

/* Página do curso para quem está logado e ainda NÃO comprou: apresentação + só o 1º vídeo + preço.
 * NÃO mostra módulos nem títulos das aulas (a grade só aparece para quem comprou; o banco também esconde).
 * Quem comprou vê o curso completo (Curso.tsx). */
export default function PaginaCurso({ sessao, slug, nome }: { sessao: Session | null; slug: string; nome: string }) {
  const [curso, setCurso] = useState<Basico | null | 'nao'>(null);
  const [resumo, setResumo] = useState<ResumoCurso | null>(null);
  useEffect(() => {
    supabase.from('academy_courses').select('id, slug, titulo, subtitulo, capa').eq('slug', slug).maybeSingle()
      .then(({ data }) => setCurso((data as Basico | null) ?? 'nao'));
  }, [slug]);
  useEffect(() => {
    if (curso && curso !== 'nao') buscarResumos().then(m => setResumo(m.get(curso.id) ?? null));
  }, [curso]);

  // Função (e não componente) para não recriar a página inteira a cada atualização
  const envolver = (children: React.ReactNode) => <AppLayout nome={nome}>{children}</AppLayout>;
  if (curso === null) return envolver(<Carregando />);
  if (curso === 'nao') {
    return envolver(
        <div className="text-center py-20">
          <p className="font-bold text-[22px]" style={display}>Curso não encontrado</p>
          <Link para={sessao ? '/cursos' : '/'} className="inline-block mt-4 font-semibold" style={{ color: T.accent }}>Ver todos os cursos</Link>
        </div>
    );
  }
  return envolver(<Pagina sessao={sessao} curso={curso} resumo={resumo} />);
}

function Pagina({ sessao, curso, resumo }: { sessao: Session | null; curso: Basico; resumo: ResumoCurso | null }) {
  const [det, setDet] = useState<Detalhes | null>(null);
  const [extras, setExtras] = useState<{ bonus: Bonus[]; faq: Pergunta[] }>({ bonus: [], faq: [] });
  const [sobreInstrutor, setSobreInstrutor] = useState<{ ferramentas: string[]; bio: string | null }>({ ferramentas: [], bio: null });
  const [preco, setPreco] = useState<{ valor: number; de: number | null } | null | undefined>(undefined);
  const [nota, setNota] = useState<{ media: number; total: number } | null>(null);
  const [faqAberta, setFaqAberta] = useState<number | null>(0);
  const [liberando, setLiberando] = useState(false);
  const [erroLiberar, setErroLiberar] = useState('');

  useEffect(() => {
    // Cada parte é opcional: se a coluna/tabela ainda não existir no banco, a página segue sem ela
    supabase.from('academy_courses').select('descricao, aprendizados, nivel, instrutor, categoria, certificado, carga_horaria_h').eq('id', curso.id).maybeSingle()
      .then(({ data }) => setDet((data as Detalhes | null) ?? null));
    supabase.from('academy_courses').select('bonus, faq').eq('id', curso.id).maybeSingle()
      .then(({ data }) => setExtras({ bonus: ((data?.bonus ?? []) as Bonus[]).filter(b => b?.titulo), faq: ((data?.faq ?? []) as Pergunta[]).filter(f => f?.pergunta) }));
    supabase.from('academy_courses').select('ferramentas, instrutor_bio').eq('id', curso.id).maybeSingle()
      .then(({ data }) => setSobreInstrutor({ ferramentas: ((data?.ferramentas ?? []) as string[]).filter(Boolean), bio: (data?.instrutor_bio as string | null) ?? null }));
    supabase.from('academy_products').select('preco, preco_promocional').eq('course_id', curso.id).eq('tipo', 'curso').eq('ativo', true).maybeSingle()
      .then(({ data }) => setPreco(data ? { valor: Number(data.preco_promocional ?? data.preco), de: data.preco_promocional != null ? Number(data.preco) : null } : null));
    supabase.rpc('academy_media_cursos').then(({ data }) => {
      const n = ((data ?? []) as { course_id: string; media: number; total: number }[]).find(x => x.course_id === curso.id);
      if (n) setNota({ media: Number(n.media), total: n.total });
    });
  }, [curso.id]);

  // Meta Pixel: viu a página de vendas (uma vez por curso, quando o preço já carregou)
  useEffect(() => {
    if (preco === undefined) return;
    evento('ViewContent', { content_ids: [curso.slug], content_name: curso.titulo, content_type: 'product', value: preco?.valor ?? 0, currency: 'BRL' });
  }, [preco === undefined, curso.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const amostra = resumo?.amostra ?? null;
  const horas = det?.carga_horaria_h ?? resumo?.horas ?? 1;
  const totalAulas = resumo?.aulas ?? 0;
  const emitirCertificado = det?.certificado ?? true;
  const faq = [...extras.faq, ...FAQ_PADRAO];
  const compra = `/comprar/${curso.slug}`;
  // Visitante: cria a conta grátis e cai direto na compra
  const destinoComprar = sessao ? compra : `/criar-conta?voltar=${encodeURIComponent(compra)}`;

  const gratis = preco?.valor === 0;
  // Curso gratuito: o servidor cria o pedido de R$ 0 e libera na hora; depois abre o curso já liberado
  const liberar = async () => {
    setLiberando(true); setErroLiberar('');
    const r = await checkout({ slug: curso.slug, acao: 'pagar' });
    if (r.url || r.erro === 'ja_matriculado') { window.location.href = `${BASE}/curso/${curso.slug}`; return; }
    setLiberando(false);
    setErroLiberar('Não foi possível liberar o curso agora. Tente de novo.');
  };

  const BotaoComprar = ({ cheio = false }: { cheio?: boolean }) => gratis && sessao ? (
    <button onClick={liberar} disabled={liberando}
      className={`acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] text-[15px] font-semibold text-white ${cheio ? 'w-full' : ''}`}>
      {liberando ? 'Liberando…' : 'Começar grátis'}
    </button>
  ) : preco ? (
    <Link para={destinoComprar}
      className={`acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] text-[15px] font-semibold text-white ${cheio ? 'w-full' : ''}`}>
      Comprar agora
    </Link>
  ) : (
    <span className={`inline-flex items-center justify-center h-12 px-6 rounded-[10px] text-[14.5px] font-semibold ${cheio ? 'w-full' : ''}`}
      style={{ background: 'var(--a-soft)', color: T.mute }}>
      {preco === undefined ? 'Carregando…' : 'Em breve'}
    </span>
  );

  const titulo2 = 'font-bold text-[21px] mb-4';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
      <div className="grid lg:grid-cols-[1fr_21rem] gap-8 xl:gap-10 items-start">
        <div className="min-w-0 space-y-12">
          {/* ── Nome, descrição e números ── */}
          <section>
            {det?.categoria && <p className="text-[13px] font-semibold mb-2" style={{ color: T.accent }}>{det.categoria}</p>}
            <h1 className="font-bold leading-[1.1]" style={{ ...display, fontSize: 'clamp(28px,3.6vw,42px)' }}>{curso.titulo}</h1>
            {curso.subtitulo && <p className="text-[17px] leading-relaxed mt-3" style={{ color: T.ink2 }}>{curso.subtitulo}</p>}
            {det?.instrutor && (
              <p className="text-[14.5px] mt-3" style={{ color: T.mute }}>Com <strong style={{ color: T.ink }}>{det.instrutor}</strong></p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[14px]" style={{ color: T.mute }}>
              {nota && (
                <span className="inline-flex items-center gap-1.5">
                  <Star size={15} strokeWidth={0} fill="#F59E0B" />
                  <strong style={{ color: T.ink }}>{nota.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong> ({nota.total})
                </span>
              )}
              {resumo && <span className="inline-flex items-center gap-1.5"><BookOpen size={15} /> {resumo.modulos} módulos · {totalAulas} aulas</span>}
              <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {horas}h de conteúdo</span>
              {det?.nivel && <span className="inline-flex items-center gap-1.5"><BarChart3 size={15} /> {NIVEL[det.nivel] ?? det.nivel}</span>}
              {emitirCertificado && <span className="inline-flex items-center gap-1.5"><Award size={15} /> Certificado</span>}
            </div>

            {/* Vídeo de amostra */}
            <div className="mt-7">
              {sessao && amostra ? <VideoAula aulaId={amostra.id} marca={sessao.user.email} userId={sessao.user.id} /> : (
              <div className="relative aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
                style={{ background: curso.capa ? `linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.72)), url("${curso.capa}") center/cover` : `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText, border: `1px solid ${T.rule}` }}>
                <PlayCircle size={56} strokeWidth={1.25} style={{ color: '#A5B4FC' }} />
                {sessao ? (
                  <p className="mt-3 text-[14px]" style={{ color: 'rgba(241,245,249,0.75)' }}>Este curso ainda não tem aula de amostra.</p>
                ) : (
                  <>
                    <p className="mt-3 font-semibold text-[16px]">Assista à aula de amostra grátis</p>
                    <p className="mt-1 text-[14px]" style={{ color: 'rgba(241,245,249,0.75)' }}>Crie sua conta em menos de um minuto.</p>
                    <Link para={`/criar-conta?voltar=${encodeURIComponent(`/curso/${curso.slug}`)}`}
                      className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold"
                      style={{ background: '#FFFFFF', color: '#0F172A' }}>
                      Criar conta grátis e assistir
                    </Link>
                  </>
                )}
              </div>
              )}
              {amostra && (
                <p className="mt-3 text-[14px]" style={{ color: T.mute }}>
                  <strong style={{ color: T.ink }}>Aula de amostra grátis:</strong> {amostra.titulo} · {minutos(amostra.duracao_seg)}
                </p>
              )}
            </div>
          </section>

          {/* O que vai aprender */}
          {det?.aprendizados && det.aprendizados.length > 0 && (
            <section className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
              <h2 className={titulo2} style={display}>O que você vai aprender</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {det.aprendizados.map(a => (
                  <li key={a} className="flex items-start gap-2.5 text-[14.5px]" style={{ color: T.ink2 }}>
                    <Check size={17} className="shrink-0 mt-0.5" style={{ color: T.accent }} /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sobre */}
          {det?.descricao && (
            <section>
              <h2 className={titulo2} style={display}>Sobre o curso</h2>
              <p className="text-[15.5px] leading-relaxed whitespace-pre-line" style={{ color: T.ink2 }}>{det.descricao}</p>
            </section>
          )}

          {/* Ferramentas */}
          {sobreInstrutor.ferramentas.length > 0 && (
            <section>
              <h2 className={titulo2} style={display}>Ferramentas que você vai usar</h2>
              <div className="flex flex-wrap gap-2.5">
                {sobreInstrutor.ferramentas.map(f => (
                  <span key={f} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[14px] font-medium"
                    style={{ background: T.card, border: `1px solid ${T.rule}`, color: T.ink2 }}>
                    <Wrench size={15} strokeWidth={1.75} style={{ color: T.accent }} /> {f}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Bônus */}
          {extras.bonus.length > 0 && (
            <section>
              <h2 className={titulo2} style={display}>Bônus inclusos</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {extras.bonus.map(b => (
                  <div key={b.titulo} className="rounded-2xl p-5 flex gap-4" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--a-orange)' }}>
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
            <h2 className={titulo2} style={display}>Perguntas frequentes</h2>
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
                <p className="text-[14.5px] mt-1" style={{ color: T.mute }}>{gratis ? 'Grátis · acesso na hora' : `${reais(preco.valor)} · acesso imediato no Pix · 7 dias de garantia`}</p>
              </div>
              <BotaoComprar />
            </section>
          )}
        </div>

        {/* ── Lateral: caixa de compra + instrutor (acompanham a rolagem) ── */}
        <div className="space-y-4 lg:sticky lg:top-6">
        <aside className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -30px rgba(79,70,229,0.45)' }}>
          {gratis ? (
            <>
              <p className="font-bold text-[34px] leading-none" style={{ ...display, color: 'var(--a-green)' }}>Grátis</p>
              <p className="text-[13px] mt-2" style={{ color: T.mute }}>Acesso completo, sem pagar nada.</p>
            </>
          ) : preco ? (
            <>
              {preco.de != null && <p className="text-[14px]" style={{ color: T.mute }}>De <s>{reais(preco.de)}</s> por</p>}
              <p className="font-bold text-[34px] leading-none mt-1" style={display}>{reais(preco.valor)}</p>
              <p className="text-[13px] mt-2" style={{ color: T.mute }}>Pix, boleto ou cartão em até 12x</p>
            </>
          ) : preco === null ? (
            <>
              <p className="font-bold text-[34px] leading-none" style={display}>Em breve</p>
              <p className="text-[13px] mt-2" style={{ color: T.mute }}>As vendas deste curso ainda não abriram.</p>
            </>
          ) : null}
          {preco !== null && <div className="mt-5"><BotaoComprar cheio /></div>}
          {erroLiberar && <p className="text-[13px] mt-2" style={{ color: 'var(--a-red)' }}>{erroLiberar}</p>}
          {!sessao && preco && !gratis && (
            <p className="text-[13px] text-center mt-2.5" style={{ color: T.mute }}>
              Já tem conta? <Link para={`/entrar?voltar=${encodeURIComponent(compra)}`} className="font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>Entrar</Link>
            </p>
          )}
          <p className="text-[13px] font-semibold mt-6 mb-2.5" style={{ color: T.ink }}>Este curso inclui</p>
          <ul className="space-y-2.5 text-[14px]" style={{ color: T.ink2 }}>
            {[
              totalAulas ? `${totalAulas} aulas · ${horas}h de conteúdo` : `${horas}h de conteúdo`,
              'Acesso no celular e no computador',
              'Materiais para baixar',
              ...(emitirCertificado ? ['Certificado de conclusão'] : []),
              ...(extras.bonus.length ? [`${extras.bonus.length} bônus inclusos`] : []),
              'Comunidade com outros alunos',
            ].map(t => <li key={t} className="flex items-start gap-2"><Check size={16} className="shrink-0 mt-0.5" color="#22C55E" /> {t}</li>)}
          </ul>
          {!gratis && (
            <p className="flex items-start gap-2 text-[13px] mt-5 pt-4" style={{ color: T.mute, borderTop: `1px solid ${T.rule}` }}>
              <ShieldCheck size={16} className="shrink-0 mt-px" style={{ color: 'var(--a-green)' }} />
              Garantia de 7 dias: se não gostar, devolvemos o valor.
            </p>
          )}
        </aside>

        {/* Instrutor */}
        {det?.instrutor && (
          <section className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
            <p className="text-[13px] font-semibold mb-3" style={{ color: T.mute }}>Seu instrutor</p>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-[19px] font-bold text-white"
                style={{ ...display, background: `linear-gradient(135deg, #4F46E5, ${T.violet})` }} aria-hidden>
                {det.instrutor.trim()[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[16px] leading-tight" style={display}>{det.instrutor}</p>
                <p className="text-[12.5px] mt-0.5" style={{ color: T.mute }}>Instrutor da Nexla Academy</p>
              </div>
            </div>
            {sobreInstrutor.bio && <p className="text-[13.5px] leading-relaxed mt-3 whitespace-pre-line" style={{ color: T.ink2 }}>{sobreInstrutor.bio}</p>}
          </section>
        )}
        </div>
      </div>

      {/* Os mais comprados (sem os cursos que a pessoa já tem) */}
      {sessao && <MaisComprados sessao={sessao} atual={curso.id} />}

      {/* Celular: botão de compra fixo embaixo */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 flex items-center gap-3"
        style={{ background: 'var(--a-vidro)', borderTop: `1px solid ${T.rule}`, backdropFilter: 'blur(8px)' }}>
        {preco && <span className="font-bold text-[18px] shrink-0" style={gratis ? { ...display, color: 'var(--a-green)' } : display}>{gratis ? 'Grátis' : reais(preco.valor)}</span>}
        <div className="flex-1"><BotaoComprar cheio /></div>
      </div>
      <div className="lg:hidden h-20" />
    </motion.div>
  );
}

/* Recomendação no fim da página: os cursos mais comprados da Academy que a pessoa ainda não tem */
function MaisComprados({ sessao, atual }: { sessao: Session; atual: string }) {
  const dados = useCursosAluno(sessao);
  const [vendas, setVendas] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    // Sem o 021 a função não existe: segue na ordem da vitrine
    supabase.rpc('academy_mais_vendidos').then(({ data }) =>
      setVendas(new Map(((data ?? []) as { course_id: string; total: number }[]).map(v => [v.course_id, v.total]))));
  }, []);
  if (!dados) return null;
  const lista = dados.outros
    .filter(c => c.id !== atual)
    .sort((a, b) => (vendas.get(b.id) ?? 0) - (vendas.get(a.id) ?? 0) || a.ordem - b.ordem)
    .slice(0, 3);
  if (!lista.length) return null;
  return (
    <section className="mt-16 pt-10" style={{ borderTop: `1px solid ${T.rule}` }}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-bold text-[22px]" style={display}>Os mais comprados da Academy</h2>
          <p className="text-[14px] mt-1" style={{ color: T.mute }}>Os cursos que mais alunos estão fazendo agora.</p>
        </div>
        <Link para="/cursos" className="inline-flex items-center gap-1 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
          Ver todos os cursos <ArrowRight size={15} strokeWidth={2} />
        </Link>
      </div>
      <div className={GRADE_CURSOS}>
        {lista.map(c => <CardVitrine key={c.id} c={c} />)}
      </div>
    </section>
  );
}
