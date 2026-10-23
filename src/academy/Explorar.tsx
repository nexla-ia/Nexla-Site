import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock, Layers, Lock, PlayCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando, TituloPagina } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, type CursoAluno, type CursoVitrine } from './dados';
import { MediaEstrelas } from './Avaliacao';
import { reais } from './Compra';

/* Fundo de quem ainda não tem foto: gradiente da marca com uma grade bem leve e o símbolo da Nexla */
const SEM_FOTO = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(135deg, ${T.dark}, #1E1B4B 60%, ${T.accent})`,
  backgroundSize: '28px 28px, 28px 28px, cover',
};
const VIDRO = { background: 'rgba(15,23,42,0.55)', color: '#FFFFFF', backdropFilter: 'blur(6px)' };

/* Capa do card: a foto aproxima um pouco ao passar o mouse no card */
function Capa({ url, children }: { url: string | null; children: React.ReactNode }) {
  return (
    <div className="relative h-40 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        style={url ? { backgroundImage: `url("${url}")` } : SEM_FOTO} />
      {url
        ? <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.5), transparent 55%)' }} />
        : <img src={LOGO} alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 object-contain opacity-80" />}
      {children}
    </div>
  );
}

const cardCls = 'group rounded-2xl overflow-hidden flex flex-col shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(79,70,229,0.45)]';

/* Categoria, título, nota e subtítulo: igual nos dois cards */
function Cabecalho({ c }: { c: CursoVitrine | CursoAluno }) {
  return (
    <>
      {c.categoria && <p className="text-[12.5px] font-semibold mb-1.5" style={{ color: T.accent }}>{c.categoria}</p>}
      <h3 className="font-bold text-[18px] leading-snug" style={display}>{c.titulo}</h3>
      {c.media !== null && <div className="mt-1.5"><MediaEstrelas media={c.media} total={c.avaliacoes} /></div>}
      {c.subtitulo && <p className="text-[14px] mt-1.5 leading-relaxed line-clamp-2" style={{ color: T.mute }}>{c.subtitulo}</p>}
    </>
  );
}

/* Card de um curso que o aluno ainda não tem (cadeado: só a aula de amostra está liberada) */
export function CardVitrine({ c }: { c: CursoVitrine }) {
  return (
    <Link para={`/curso/${c.slug}`} className={cardCls} style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <Capa url={c.capa}>
        <span className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" title="Curso bloqueado" style={VIDRO}>
          <Lock size={16} strokeWidth={2} aria-label="Curso bloqueado" />
        </span>
        {c.totalAulas > 0 && (
          <span className="absolute left-4 bottom-3 inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={VIDRO}>
            <PlayCircle size={13} strokeWidth={2} /> Aula de amostra grátis
          </span>
        )}
      </Capa>
      <div className="p-5 flex-1 flex flex-col">
        <Cabecalho c={c} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] mt-4" style={{ color: T.mute }}>
          <span className="inline-flex items-center gap-1.5"><Layers size={14} strokeWidth={1.75} /> {c.modulos} módulos</span>
          <span className="inline-flex items-center gap-1.5"><PlayCircle size={14} strokeWidth={1.75} /> {c.totalAulas} aulas</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={14} strokeWidth={1.75} /> {c.horas}h</span>
        </div>
        <div className="mt-auto pt-5">
          <div className="pt-4 flex items-end justify-between gap-3" style={{ borderTop: `1px solid ${T.rule}` }}>
            {c.preco ? (
              <div>
                {c.preco.de != null && <p className="text-[12.5px] line-through" style={{ color: T.mute }}>{reais(c.preco.de)}</p>}
                <p className="font-bold text-[20px] leading-none" style={display}>{reais(c.preco.valor)}</p>
              </div>
            ) : <p className="font-bold text-[20px] leading-none" style={{ ...display, color: T.mute }}>Em breve</p>}
            <span className="acad-btn inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[14px] font-semibold text-white">
              Ver curso <ArrowRight size={15} strokeWidth={2} className="acad-arrow" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* Card de um curso que o aluno já tem (na vitrine, para ele saber que já é dele) */
function CardMeu({ c }: { c: CursoAluno }) {
  return (
    <Link para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`} className={cardCls} style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <Capa url={c.capa}>
        <span className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" title="Você já tem este curso"
          style={{ background: '#16A34A', color: '#FFFFFF' }}>
          <Check size={17} strokeWidth={2.5} aria-label="Você já tem este curso" />
        </span>
      </Capa>
      <div className="p-5 flex-1 flex flex-col">
        <Cabecalho c={c} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] mt-4" style={{ color: T.mute }}>
          <span className="inline-flex items-center gap-1.5"><Layers size={14} strokeWidth={1.75} /> {c.academy_modules.length} módulos</span>
          <span className="inline-flex items-center gap-1.5"><PlayCircle size={14} strokeWidth={1.75} /> {c.aulas.length} aulas</span>
        </div>
        <div className="mt-auto pt-5">
          <div className="pt-4" style={{ borderTop: `1px solid ${T.rule}` }}>
            <div className="flex items-center justify-between text-[13px] mb-2">
              <span style={{ color: T.mute }}>Você já tem · {c.feitas.size} de {c.aulas.length} aulas</span>
              <span className="font-semibold" style={{ color: c.percentual >= 100 ? 'var(--a-green)' : T.ink }}>{c.percentual}%</span>
            </div>
            <BarraProgresso valor={c.percentual} />
            <p className="inline-flex items-center gap-1.5 mt-4 text-[14px] font-semibold" style={{ color: T.accent }}>
              {c.percentual >= 100 ? 'Rever curso' : c.feitas.size ? 'Continuar' : 'Começar'}
              <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

type Item = { meu: true; c: CursoAluno } | { meu: false; c: CursoVitrine };

/* Agrupa por categoria (na ordem dos cursos); os sem categoria ficam por último */
function porCategoria(itens: Item[]) {
  const grupos = new Map<string, { nome: string; itens: Item[] }>();
  for (const i of [...itens].sort((a, b) => a.c.ordem - b.c.ordem)) {
    const nome = i.c.categoria?.trim() ?? '';
    const chave = nome.toLowerCase();
    if (!grupos.has(chave)) grupos.set(chave, { nome, itens: [] });
    grupos.get(chave)!.itens.push(i);
  }
  return [...grupos.values()].sort((a, b) => Number(!a.nome) - Number(!b.nome));
}

/* Grade de cursos separada por categoria (usada no Explorar e no painel de quem ainda não tem cursos) */
export function GradeCategorias({ outros, cursos = [], colunas = 3 }: { outros: CursoVitrine[]; cursos?: CursoAluno[]; colunas?: 2 | 3 }) {
  const grupos = porCategoria([...outros.map(c => ({ meu: false as const, c })), ...cursos.map(c => ({ meu: true as const, c }))]);
  const temCategorias = grupos.some(g => g.nome);
  const grade = colunas === 3 ? 'grid sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'grid md:grid-cols-2 gap-5';
  return (
    <div className="space-y-12">
      {grupos.map(g => (
        <section key={g.nome || '-'}>
          {temCategorias && (
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="font-bold text-[21px]" style={display}>{g.nome || 'Outros cursos'}</h2>
              <span className="text-[13.5px]" style={{ color: T.mute }}>{g.itens.length} curso{g.itens.length === 1 ? '' : 's'}</span>
            </div>
          )}
          <div className={grade}>
            {g.itens.map(i => i.meu ? <CardMeu key={i.c.id} c={i.c} /> : <CardVitrine key={i.c.id} c={i.c} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* Explorar cursos: tudo que está publicado na Academy, separado por categoria */
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

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        <GradeCategorias outros={outros} cursos={cursos} />
      </motion.div>
    </AppLayout>
  );
}
