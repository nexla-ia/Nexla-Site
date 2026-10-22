import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Clock, PlayCircle, ShieldCheck, Smartphone, Star } from 'lucide-react';
import { T, display, ease } from './ui';
import { Carregando, PublicLayout } from './AppLayout';
import { Link } from './router';
import { supabase, organizar, SELECT_CURSO, type Curso } from './supabase';

type Bloco = ReturnType<typeof organizar> & { preco: number | null; de: number | null; media: number | null; avaliacoes: number; horas: number };
const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* Vitrine aberta a visitantes (nexla.com.br/academy): todos os cursos publicados */
export default function Vitrine() {
  const [cursos, setCursos] = useState<Bloco[] | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('academy_courses').select(SELECT_CURSO).eq('publicado', true).order('ordem'),
      supabase.from('academy_products').select('course_id, preco, preco_promocional').eq('tipo', 'curso').eq('ativo', true),
      supabase.rpc('academy_media_cursos'),
    ]).then(([cs, ps, ns]) => {
      const precos = new Map((ps.data ?? []).map(p => [p.course_id as string, p]));
      const notas = new Map(((ns.data ?? []) as { course_id: string; media: number; total: number }[]).map(n => [n.course_id, n]));
      setCursos(((cs.data ?? []) as unknown as Curso[]).map(c => {
        const o = organizar(c);
        const p = precos.get(o.id);
        const n = notas.get(o.id);
        return {
          ...o,
          preco: p ? Number(p.preco_promocional ?? p.preco) : null,
          de: p && p.preco_promocional != null ? Number(p.preco) : null,
          media: n ? Number(n.media) : null, avaliacoes: n?.total ?? 0,
          horas: Math.max(1, Math.round(o.aulas.reduce((s, a) => s + a.duracao_seg, 0) / 3600)),
        };
      }));
    });
  }, []);

  return (
    <PublicLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        {/* Topo */}
        <section className="max-w-3xl mb-10 md:mb-12">
          <h1 className="font-bold leading-[1.08]" style={{ ...display, fontSize: 'clamp(32px,4.6vw,52px)' }}>
            Aprenda a usar IA no seu negócio, <span style={{ color: T.accent }}>na prática</span>.
          </h1>
          <p className="text-[17px] leading-relaxed mt-4" style={{ color: T.ink2 }}>
            Cursos gravados e direto ao ponto, feitos por quem implanta automação todos os dias em empresas reais.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-[14px]" style={{ color: T.mute }}>
            <span className="inline-flex items-center gap-1.5"><PlayCircle size={16} style={{ color: T.accent }} /> Aula de amostra grátis</span>
            <span className="inline-flex items-center gap-1.5"><Smartphone size={16} style={{ color: T.accent }} /> No celular e no computador</span>
            <span className="inline-flex items-center gap-1.5"><Award size={16} style={{ color: T.accent }} /> Certificado de conclusão</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} style={{ color: T.accent }} /> 7 dias de garantia</span>
          </div>
        </section>

        {/* Cursos */}
        {!cursos ? <Carregando /> : cursos.length === 0 ? (
          <p className="text-center py-16 text-[15px]" style={{ color: T.mute }}>Os cursos da Nexla Academy abrem em breve.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cursos.map(c => (
              <Link key={c.id} para={`/curso/${c.slug}`}
                className="group rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-lg"
                style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <div className="aspect-[16/9] overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B 60%, ${T.accent})` }}>
                  {c.capa && <img src={c.capa} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h2 className="font-bold text-[18px] leading-snug" style={{ ...display, color: T.ink }}>{c.titulo}</h2>
                  {c.media !== null && (
                    <span className="inline-flex items-center gap-1 text-[13px] mt-1.5" style={{ color: T.mute }}>
                      <Star size={13} strokeWidth={0} fill="#F59E0B" />
                      <strong style={{ color: T.ink }}>{c.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong> ({c.avaliacoes})
                    </span>
                  )}
                  {c.subtitulo && <p className="text-[14px] mt-1.5" style={{ color: T.mute }}>{c.subtitulo}</p>}
                  <p className="flex items-center gap-1.5 text-[13px] mt-3" style={{ color: T.mute }}>
                    <Clock size={14} /> {c.academy_modules.length} módulos · {c.aulas.length} aulas · {c.horas}h
                  </p>
                  <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                    <div>
                      {c.de != null && <span className="block text-[12.5px]" style={{ color: T.mute }}><s>{reais(c.de)}</s></span>}
                      <span className="font-bold text-[20px]" style={display}>{c.preco != null ? reais(c.preco) : 'Em breve'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold" style={{ color: T.accent }}>
                      Ver curso <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </PublicLayout>
  );
}
