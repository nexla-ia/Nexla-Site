import { motion } from 'framer-motion';
import { ArrowRight, Award, Download, Lock } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando, TituloPagina } from './AppLayout';
import { Link } from './router';
import { CERTIFICADO_MIN } from './supabase';
import { useCursosAluno, certificadoLiberado } from './dados';
import { codigoValidacao, dataPorExtenso } from './certificadoCanvas';

/* Meus certificados: um card por curso — liberado (ver e baixar) ou ainda bloqueado (quanto falta) */
export default function Certificados({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;

  const { nome, cursos, erro } = dados;
  const liberados = cursos.filter(certificadoLiberado);
  const pendentes = cursos.filter(c => !certificadoLiberado(c));

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Meus certificados"
          sub={`O certificado de cada curso libera quando você conclui ${CERTIFICADO_MIN}% das aulas.`} />

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: '#B91C1C' }}>{erro}</p>}

        {cursos.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
            <Award size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: T.mute }} />
            <p className="font-semibold">Você ainda não tem cursos</p>
            <p className="text-[14px] mt-1" style={{ color: T.mute }}>Seus certificados aparecem aqui quando você concluir um curso.</p>
          </div>
        )}

        {liberados.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Prontos para baixar</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {liberados.map(c => (
                <article key={c.id} className="rounded-2xl p-6 flex flex-col" style={{ background: T.card, border: '1px solid rgba(34,197,94,0.3)' }}>
                  <div className="flex items-start gap-4">
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.1)', color: '#15803D' }}>
                      <Award size={22} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[18px] leading-snug" style={display}>{c.titulo}</h3>
                      <p className="text-[13.5px] mt-1" style={{ color: T.mute }}>
                        Concluído em {dataPorExtenso(new Date(c.ultima))} · {c.percentual}% das aulas
                      </p>
                      <p className="text-[12.5px] mt-1" style={{ color: T.mute }}>
                        Código <strong style={{ color: T.ink2 }}>{codigoValidacao(sessao.user.id, c.id)}</strong>
                      </p>
                    </div>
                  </div>
                  <Link para={`/certificado/${c.slug}`}
                    className="acad-btn mt-6 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white self-start">
                    <Download size={16} strokeWidth={2} /> Ver e baixar certificado
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {pendentes.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Em andamento</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {pendentes.map(c => (
                <article key={c.id} className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <div className="flex items-start gap-4">
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(15,23,42,0.05)', color: T.mute }}>
                      <Lock size={20} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[18px] leading-snug" style={display}>{c.titulo}</h3>
                      <p className="text-[13.5px] mt-1" style={{ color: T.mute }}>
                        Falta{c.faltamCertificado > 1 ? 'm' : ''} {c.faltamCertificado} aula{c.faltamCertificado > 1 ? 's' : ''} para liberar o certificado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-5">
                    <div className="flex-1"><BarraProgresso valor={c.percentual} /></div>
                    <span className="text-[13px] font-semibold">{c.percentual}%</span>
                  </div>
                  <Link para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`}
                    className="inline-flex items-center gap-1.5 mt-5 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
                    Continuar o curso <ArrowRight size={15} strokeWidth={2} />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </motion.div>
    </AppLayout>
  );
}
