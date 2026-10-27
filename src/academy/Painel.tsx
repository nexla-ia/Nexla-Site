import { motion } from 'framer-motion';
import { ArrowRight, Award } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, primeiroNome, certificadoLiberado, type CursoAluno } from './dados';
import { CardVitrine, GradeCategorias, GRADE_CURSOS } from './Explorar';
import { MediaEstrelas, MinhaNota } from './Avaliacao';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/* Título de seção (o mesmo das categorias no Explorar), com um link opcional à direita */
function Secao({ titulo, link, children }: { titulo: string; link?: { para: string; texto: string }; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="font-bold text-[18px]" style={display}>{titulo}</h2>
        {link && (
          <Link para={link.para} className="group inline-flex items-center gap-1 text-[13.5px] font-medium" style={{ color: T.accent }}>
            {link.texto} <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/* Tempo total do curso: "45 min" ou "2h 10min" */
const duracao = (seg: number) => {
  const min = Math.max(1, Math.round(seg / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ''}`;
};

/* Curso do aluno: capa à esquerda e, ao lado, o que importa — nome, avaliação, progresso, certificado e o próximo passo */
function CursoLinha({ c }: { c: CursoAluno }) {
  const concluido = c.percentual >= 100;
  const liberado = certificadoLiberado(c);
  const faltam = c.faltamCertificado;
  const total = c.aulas.reduce((s, a) => s + (a.duracao_seg || 0), 0);
  const detalhes = [c.categoria?.trim(), plural(c.academy_modules.length, 'módulo', 'módulos'), plural(c.aulas.length, 'aula', 'aulas'), total ? duracao(total) : '']
    .filter(Boolean).join(' · ');
  const curso = `/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`;
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, ease }}
      className="rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 border border-[color:var(--a-rule)]" style={{ background: T.card }}>
      <Link para={curso} className="group relative block sm:w-72 shrink-0 aspect-video rounded-lg overflow-hidden" aria-label={c.titulo}>
        <div className="absolute inset-0 bg-cover bg-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
          style={c.capa ? { backgroundImage: `url("${c.capa}")` } : { background: 'var(--a-soft)' }} />
        {!c.capa && <img src={LOGO} alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain opacity-90" />}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col sm:py-1">
        <p className="text-[12.5px]" style={{ color: T.mute }}>{detalhes}</p>
        <Link para={curso} className="mt-1 font-bold text-[18px] leading-snug hover:underline underline-offset-4" style={display}>{c.titulo}</Link>
        {c.subtitulo && <p className="text-[13.5px] mt-1 line-clamp-1" style={{ color: T.mute }}>{c.subtitulo}</p>}
        {(c.media !== null || c.minhaNota) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {c.media !== null && <MediaEstrelas media={c.media} total={c.avaliacoes} />}
            {c.minhaNota && <MinhaNota nota={c.minhaNota} />}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1"><BarraProgresso valor={c.percentual} /></div>
          <span className="text-[12.5px] whitespace-nowrap" style={{ color: T.mute }}>
            {c.feitas.size} de {plural(c.aulas.length, 'aula', 'aulas')} · <strong style={{ color: concluido ? 'var(--a-green)' : T.ink }}>{c.percentual}%</strong>
          </span>
        </div>

        <div className="mt-4 sm:mt-auto pt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {liberado ? (
            <Link para={`/certificado/${c.slug}`} className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: 'var(--a-green)' }}>
              <Award size={15} strokeWidth={2} /> Ver certificado
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: T.mute }}>
              <Award size={15} strokeWidth={1.75} /> Certificado: falta{faltam > 1 ? 'm' : ''} {plural(faltam, 'aula', 'aulas')}
            </span>
          )}
          <Link para={curso} className="group inline-flex items-center gap-1 text-[14px] font-semibold" style={{ color: T.accent }}>
            {concluido ? 'Rever curso' : c.feitas.size ? 'Continuar' : 'Começar'}
            <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.article>
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
        {/* Boas-vindas e um resumo numa linha só */}
        <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(28px,3.4vw,40px)' }}>
          Olá, {primeiroNome(nome)}! <span style={{ color: T.accent }}>Bem-vindo à Nexla Academy</span>.
        </h1>
        <p className="text-[15px] mt-2" style={{ color: T.mute }}>
          {cursos.length ? 'Continue de onde parou. Cada aula concluída fica salva aqui.' : 'Assim que você tiver um curso, ele aparece aqui.'}
        </p>

        {/* Números: uma faixa só, dividida em três */}
        {cursos.length > 0 && (
          <div className="mt-8 grid grid-cols-3 rounded-xl border border-[color:var(--a-rule)] divide-x divide-[color:var(--a-rule)]" style={{ background: T.card }}>
            {[
              { v: cursos.length, l: cursos.length === 1 ? 'curso' : 'cursos' },
              { v: totalFeitas, l: totalFeitas === 1 ? 'aula concluída' : 'aulas concluídas' },
              { v: certificados, l: certificados === 1 ? 'certificado' : 'certificados' },
            ].map(n => (
              <div key={n.l} className="px-4 py-4 md:px-6">
                <div className="font-bold text-[24px] md:text-[28px] leading-none" style={display}>{n.v}</div>
                <div className="text-[12.5px] md:text-[13px] mt-1.5" style={{ color: T.mute }}>{n.l}</div>
              </div>
            ))}
          </div>
        )}

        {erro && <p className="mt-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {/* Continue de onde parou: a próxima aula do curso mexido por último */}
        {emAndamento?.proxima && (
          <Secao titulo="Continue de onde parou">
            <Link para={`/curso/${emAndamento.slug}?aula=${emAndamento.proxima.id}`}
              className="group flex items-center gap-4 sm:gap-5 rounded-xl p-3 pr-4 sm:pr-5 border border-[color:var(--a-rule)] transition-colors hover:border-[color:var(--a-accent)]"
              style={{ background: T.card }}>
              <div className="relative hidden sm:block w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-cover bg-center"
                style={emAndamento.capa ? { backgroundImage: `url("${emAndamento.capa}")` } : { background: 'var(--a-soft)' }}>
                {!emAndamento.capa && <img src={LOGO} alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 object-contain opacity-90" />}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <p className="text-[13px] truncate" style={{ color: T.mute }}>{emAndamento.titulo}</p>
                <p className="text-[16px] font-semibold leading-snug mt-0.5 line-clamp-2" style={{ color: T.ink }}>{emAndamento.proxima.titulo}</p>
                <div className="flex items-center gap-3 mt-2.5 max-w-xs">
                  <div className="flex-1"><BarraProgresso valor={emAndamento.percentual} /></div>
                  <span className="text-[12.5px]" style={{ color: T.mute }}>{emAndamento.percentual}%</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[14px] font-medium shrink-0" style={{ color: T.accent }}>
                Continuar <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Secao>
        )}

        {/* Sem cursos ainda: mostra direto os cursos disponíveis */}
        {cursos.length === 0 && outros.length > 0 ? (
          <div className="mt-10"><GradeCategorias outros={outros} /></div>
        ) : cursos.length === 0 ? (
          <p className="mt-8 text-[14.5px]" style={{ color: T.mute }}>
            Quando a compra for confirmada, o curso aparece aqui automaticamente.{' '}
            <Link para="/cursos" className="font-medium hover:underline underline-offset-4" style={{ color: T.accent }}>Explorar cursos</Link>
          </p>
        ) : (
          <Secao titulo="Meus cursos">
            <div className="space-y-4">
              {cursos.map(c => <CursoLinha key={c.id} c={c} />)}
            </div>
          </Secao>
        )}

        {/* Outros cursos publicados que o aluno ainda não tem */}
        {cursos.length > 0 && outros.length > 0 && (
          <Secao titulo="Você também pode gostar" link={{ para: '/cursos', texto: 'Explorar cursos' }}>
            <div className={GRADE_CURSOS}>
              {outros.slice(0, 3).map(c => <CardVitrine key={c.id} c={c} />)}
            </div>
          </Secao>
        )}
      </motion.div>
    </AppLayout>
  );
}
