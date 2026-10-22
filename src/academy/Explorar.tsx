import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Compass, Lock, PlayCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando, TituloPagina } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, type CursoAluno, type CursoVitrine } from './dados';
import { MediaEstrelas } from './Avaliacao';

/* Fundo da capa: foto do curso (com leve escurecido para o selo ler bem) ou o gradiente da marca */
const capa = (url: string | null) => url
  ? { backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.55), transparent 60%), url("${url}")` }
  : { background: `linear-gradient(135deg, ${T.dark}, #1E1B4B 60%, ${T.accent})` };

/* Card de um curso que o aluno ainda não tem (cadeado: só a aula de amostra está liberada) */
export function CardVitrine({ c }: { c: CursoVitrine }) {
  return (
    <article className="rounded-2xl overflow-hidden flex flex-col" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div className="relative h-28 px-6 flex items-end pb-4 bg-cover bg-center" style={capa(c.capa)}>
        <span className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" title="Curso bloqueado"
          style={{ background: 'rgba(15,23,42,0.55)', color: '#FFFFFF', backdropFilter: 'blur(6px)' }}>
          <Lock size={16} strokeWidth={2} aria-label="Curso bloqueado" />
        </span>
        {c.totalAulas > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.14)', color: '#E0E7FF' }}>
            <PlayCircle size={13} strokeWidth={2} /> Aula de amostra
          </span>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-bold text-[19px] leading-snug" style={display}>{c.titulo}</h3>
        {c.media !== null && <div className="mt-1.5"><MediaEstrelas media={c.media} total={c.avaliacoes} /></div>}
        {c.subtitulo && <p className="text-[14px] mt-1.5" style={{ color: T.mute }}>{c.subtitulo}</p>}
        <p className="flex items-center gap-1.5 text-[13px] mt-4" style={{ color: T.mute }}>
          <Clock size={14} strokeWidth={1.75} /> {c.modulos} módulos · {c.totalAulas} aulas · {c.horas}h de conteúdo
        </p>
        <div className="pt-5 mt-auto">
          <Link para={`/curso/${c.slug}`}
            className="acad-btn w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[14.5px] font-semibold text-white">
            Ver curso <ArrowRight size={16} strokeWidth={2} className="acad-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* Card de um curso que o aluno já tem (na vitrine, para ele saber que já é dele) */
function CardMeu({ c }: { c: CursoAluno }) {
  return (
    <article className="rounded-2xl overflow-hidden flex flex-col" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div className="h-28 px-6 flex items-end pb-4 bg-cover bg-center" style={capa(c.capa)}>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.9)', color: '#FFFFFF' }}>
          <CheckCircle2 size={13} strokeWidth={2.25} /> Você já tem
        </span>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-bold text-[19px] leading-snug" style={display}>{c.titulo}</h3>
        {c.media !== null && <div className="mt-1.5"><MediaEstrelas media={c.media} total={c.avaliacoes} /></div>}
        {c.subtitulo && <p className="text-[14px] mt-1.5" style={{ color: T.mute }}>{c.subtitulo}</p>}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1"><BarraProgresso valor={c.percentual} /></div>
          <span className="text-[13px] font-semibold">{c.percentual}%</span>
        </div>
        <div className="pt-5 mt-auto">
          <Link para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[14.5px] font-semibold transition-colors hover:bg-slate-50"
            style={{ color: T.ink, border: `1px solid ${T.rule}` }}>
            {c.percentual >= 100 ? 'Rever curso' : 'Continuar'} <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* Explorar cursos: tudo que está publicado na Academy, primeiro o que o aluno ainda não tem */
export default function Explorar({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;
  const { nome, cursos, outros, erro } = dados;
  const total = cursos.length + outros.length;

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Explorar cursos"
          sub={`${total} curso${total === 1 ? '' : 's'} na Nexla Academy. Assista à aula de amostra de cada um antes de decidir.`} />

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: '#B91C1C' }}>{erro}</p>}

        {outros.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Para você conhecer</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {outros.map(c => <CardVitrine key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {outros.length === 0 && (
          <div className="rounded-2xl p-6 mb-10 flex items-center gap-4" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
            <Compass size={24} strokeWidth={1.5} style={{ color: T.accent }} />
            <p className="text-[14.5px]" style={{ color: T.ink2 }}>
              Você já tem todos os cursos da Academy. <span style={{ color: T.mute }}>Novos cursos aparecem aqui assim que forem lançados.</span>
            </p>
          </div>
        )}

        {cursos.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Já são seus</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cursos.map(c => <CardMeu key={c.id} c={c} />)}
            </div>
          </section>
        )}
      </motion.div>
    </AppLayout>
  );
}
