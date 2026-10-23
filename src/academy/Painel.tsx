import { motion } from 'framer-motion';
import { ArrowRight, Award, BookOpen, CheckCircle2, Lock, PlayCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando } from './AppLayout';
import { Link } from './router';
import { CERTIFICADO_MIN } from './supabase';
import { useCursosAluno, primeiroNome, certificadoLiberado, type CursoAluno } from './dados';
import { CardVitrine, GradeCategorias, GRADE_CURSOS } from './Explorar';
import { MediaEstrelas, MinhaNota } from './Avaliacao';

function Certificado({ c }: { c: CursoAluno }) {
  const liberado = certificadoLiberado(c);
  const faltam = c.faltamCertificado;
  return liberado ? (
    <Link para={`/certificado/${c.slug}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-2.5 py-1 rounded-full transition-colors hover:bg-green-100"
      style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--a-green)' }}>
      <Award size={14} strokeWidth={2} /> Ver certificado
    </Link>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-2.5 py-1 rounded-full"
      style={{ background: 'var(--a-soft)', color: T.mute }}>
      <Lock size={13} strokeWidth={2} /> Certificado a partir de {CERTIFICADO_MIN}% · falta{faltam > 1 ? 'm' : ''} {faltam} aula{faltam > 1 ? 's' : ''}
    </span>
  );
}

export default function Painel({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;

  const { nome, cursos, outros, erro } = dados;
  const emAndamento = cursos.filter(c => c.percentual < 100).sort((a, b) => b.ultima - a.ultima)[0];
  const totalFeitas = cursos.reduce((s, c) => s + c.feitas.size, 0);
  const certificados = cursos.filter(certificadoLiberado).length;

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        {/* Boas-vindas */}
        <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(28px,3.4vw,40px)' }}>
          Olá, {primeiroNome(nome)}! <span style={{ color: T.accent }}>Bem-vindo à Nexla Academy</span>.
        </h1>
        <p className="text-[16px] mt-2 mb-8" style={{ color: T.mute }}>
          {cursos.length ? 'Continue de onde parou. Cada aula concluída fica salva aqui.' : 'Assim que você tiver um curso, ele aparece aqui.'}
        </p>

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {/* Resumo */}
        {cursos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: BookOpen,     v: cursos.length, l: cursos.length === 1 ? 'curso' : 'cursos' },
              { icon: CheckCircle2, v: totalFeitas,   l: totalFeitas === 1 ? 'aula concluída' : 'aulas concluídas' },
              { icon: Award,        v: certificados,  l: certificados === 1 ? 'certificado' : 'certificados' },
            ].map(s => (
              <div key={s.l} className="rounded-2xl p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <s.icon size={18} strokeWidth={1.75} style={{ color: T.accent }} />
                <div className="font-bold text-[26px] md:text-[30px] leading-none mt-3" style={display}>{s.v}</div>
                <div className="text-[12.5px] md:text-[13.5px] mt-1" style={{ color: T.mute }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Continue de onde parou */}
        {emAndamento?.proxima && (
          <section className="mb-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Continue de onde parou</h2>
            <div className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5"
              style={{ background: T.card, border: '1px solid rgba(79,70,229,0.25)', boxShadow: '0 20px 44px -28px rgba(79,70,229,0.45)' }}>
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-white"
                style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.violet})` }}>
                <PlayCircle size={26} strokeWidth={1.75} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: T.accent }}>{emAndamento.titulo}</p>
                <p className="font-bold text-[19px] md:text-[21px] leading-snug mt-0.5" style={display}>Próxima aula: {emAndamento.proxima.titulo}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 max-w-sm"><BarraProgresso valor={emAndamento.percentual} /></div>
                  <span className="text-[13px] font-semibold" style={{ color: T.ink2 }}>{emAndamento.percentual}%</span>
                </div>
              </div>
              <Link para={`/curso/${emAndamento.slug}?aula=${emAndamento.proxima.id}`}
                className="acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] text-[15px] font-semibold text-white shrink-0">
                Continuar aula <ArrowRight size={17} strokeWidth={2} className="acad-arrow" />
              </Link>
            </div>
          </section>
        )}

        {/* Sem cursos ainda: mostra direto os cursos disponíveis */}
        {cursos.length === 0 && outros.length > 0 ? (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: T.mute }}>Cursos disponíveis</h2>
            <p className="text-[14px] mb-4" style={{ color: T.mute }}>Escolha um curso para ver a apresentação. Depois da compra, ele aparece aqui com o seu progresso.</p>
            <GradeCategorias outros={outros} />
          </section>
        ) : (
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Meus cursos</h2>
          {cursos.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
              <BookOpen size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: T.mute }} />
              <p className="font-semibold">Você ainda não tem cursos</p>
              <p className="text-[14px] mt-1" style={{ color: T.mute }}>Quando a compra for confirmada, o curso aparece aqui automaticamente.</p>
              <Link para="/cursos" className="inline-flex items-center gap-1.5 mt-4 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
                Explorar cursos <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {cursos.map(c => {
                const concluido = c.percentual >= 100;
                return (
                  <article key={c.id} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                    <div className="h-28 px-6 flex items-end pb-4 relative bg-cover bg-center"
                      style={{ backgroundImage: c.capa ? `linear-gradient(to top, rgba(15,23,42,0.55), transparent 60%), url("${c.capa}")` : `linear-gradient(135deg, ${T.dark}, #1E1B4B 60%, ${T.accent})` }}>
                      <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.14)', color: '#E0E7FF' }}>
                        {c.academy_modules.length} módulos · {c.aulas.length} aulas
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-[20px] leading-snug" style={display}>{c.titulo}</h3>
                      {(c.media !== null || c.minhaNota) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          {c.media !== null && <MediaEstrelas media={c.media} total={c.avaliacoes} />}
                          {c.minhaNota && <MinhaNota nota={c.minhaNota} />}
                        </div>
                      )}
                      {c.subtitulo && <p className="text-[14px] mt-1.5" style={{ color: T.mute }}>{c.subtitulo}</p>}

                      <div className="mt-5 mb-2 flex items-center justify-between text-[13px]">
                        <span style={{ color: T.mute }}>{c.feitas.size} de {c.aulas.length} aulas concluídas</span>
                        <span className="font-bold text-[15px]" style={{ color: concluido ? 'var(--a-green)' : T.ink }}>{c.percentual}%</span>
                      </div>
                      <div className="mb-5"><BarraProgresso valor={c.percentual} grossa /></div>

                      <div className="pt-5 flex flex-wrap items-center justify-between gap-3 mt-auto" style={{ borderTop: `1px solid ${T.rule}` }}>
                        <Certificado c={c} />
                        <Link para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`}
                          className="inline-flex items-center gap-1.5 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
                          {concluido ? 'Rever curso' : c.feitas.size ? 'Continuar' : 'Começar'} <ArrowRight size={15} strokeWidth={2} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}

        {/* Outros cursos publicados que o aluno ainda não tem */}
        {cursos.length > 0 && outros.length > 0 && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: T.mute }}>Você também pode gostar</h2>
              <Link para="/cursos" className="inline-flex items-center gap-1 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
                Explorar cursos <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
            <div className={GRADE_CURSOS}>
              {outros.slice(0, 3).map(c => <CardVitrine key={c.id} c={c} />)}
            </div>
          </section>
        )}
      </motion.div>
    </AppLayout>
  );
}
