import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Clock, Lock, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando, TituloPagina } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, type CursoAluno, type CursoVitrine } from './dados';
import { reais } from './Compra';

/* Fundo de quem ainda não tem foto: gradiente da marca com uma grade bem leve e o símbolo da Nexla */
const SEM_FOTO = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(135deg, ${T.dark}, #1E1B4B 60%, ${T.accent})`,
  backgroundSize: '24px 24px, 24px 24px, cover',
};
const VIDRO = { background: 'rgba(15,23,42,0.55)', color: '#FFFFFF', backdropFilter: 'blur(6px)' };

/* Capa do card: a foto aproxima um pouco ao passar o mouse no card */
function Capa({ url, children }: { url: string | null; children: React.ReactNode }) {
  return (
    <div className="relative h-28 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        style={url ? { backgroundImage: `url("${url}")` } : SEM_FOTO} />
      {!url && <img src={LOGO} alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 object-contain opacity-80" />}
      {children}
    </div>
  );
}

const cardCls = 'group rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(79,70,229,0.45)]';

/* Selo redondo no canto da foto: cadeado (não comprou) ou check (já é seu) */
const selo = 'absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center';

/* Categoria e título: igual nos dois cards */
function Cabecalho({ c }: { c: CursoVitrine | CursoAluno }) {
  return (
    <>
      {c.categoria && <p className="text-[12px] font-semibold mb-1 truncate" style={{ color: T.accent }}>{c.categoria}</p>}
      <h3 className="font-bold text-[15.5px] leading-snug line-clamp-2" style={display}>{c.titulo}</h3>
    </>
  );
}

/* Card de um curso que o aluno ainda não tem (cadeado: só a aula de amostra está liberada) */
export function CardVitrine({ c }: { c: CursoVitrine }) {
  return (
    <Link para={`/curso/${c.slug}`} className={cardCls} style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <Capa url={c.capa}>
        {!c.preco && (
          <span className="absolute top-2.5 left-3 inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#4F46E5', color: '#FFFFFF' }}>
            <Clock size={12} strokeWidth={2} /> Em breve
          </span>
        )}
        <span className={selo} title="Curso bloqueado" style={VIDRO}>
          <Lock size={14} strokeWidth={2} aria-label="Curso bloqueado" />
        </span>
      </Capa>
      <div className="p-4 flex-1 flex flex-col">
        <Cabecalho c={c} />
        <p className="text-[12.5px] mt-1.5" style={{ color: T.mute }}>{c.totalAulas} aulas · {c.horas}h de conteúdo</p>
        <div className="mt-auto pt-4">
          <div className="pt-3 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${T.rule}` }}>
            {c.preco ? (
              <p className="leading-tight whitespace-nowrap">
                {c.preco.de != null && <span className="text-[12px] line-through mr-1.5" style={{ color: T.mute }}>{reais(c.preco.de)}</span>}
                <span className="font-bold text-[16px]" style={display}>{reais(c.preco.valor)}</span>
              </p>
            ) : <p className="font-semibold text-[14px] whitespace-nowrap" style={{ color: T.mute }}>Em breve</p>}
            <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold whitespace-nowrap" style={{ color: T.accent }}>
              Ver curso <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
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
        <span className={selo} title="Você já tem este curso" style={{ background: '#16A34A', color: '#FFFFFF' }}>
          <Check size={15} strokeWidth={2.5} aria-label="Você já tem este curso" />
        </span>
      </Capa>
      <div className="p-4 flex-1 flex flex-col">
        <Cabecalho c={c} />
        <p className="text-[12.5px] mt-1.5" style={{ color: T.mute }}>Você já tem · {c.aulas.length} aulas</p>
        <div className="mt-auto pt-4">
          <div className="pt-3" style={{ borderTop: `1px solid ${T.rule}` }}>
            <div className="flex items-center gap-2.5">
              <div className="flex-1"><BarraProgresso valor={c.percentual} /></div>
              <span className="text-[12.5px] font-semibold" style={{ color: c.percentual >= 100 ? 'var(--a-green)' : T.ink }}>{c.percentual}%</span>
            </div>
            <p className="inline-flex items-center gap-1 mt-2.5 text-[13.5px] font-semibold" style={{ color: T.accent }}>
              {c.percentual >= 100 ? 'Rever curso' : c.feitas.size ? 'Continuar' : 'Começar'}
              <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
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

/* Grade dos cards (a mesma no Explorar, no painel e nos resultados da busca) */
export const GRADE_CURSOS = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4';

/* Grade de cursos separada por categoria (usada no Explorar e no painel de quem ainda não tem cursos) */
export function GradeCategorias({ outros, cursos = [] }: { outros: CursoVitrine[]; cursos?: CursoAluno[] }) {
  const grupos = porCategoria([...outros.map(c => ({ meu: false as const, c })), ...cursos.map(c => ({ meu: true as const, c }))]);
  const temCategorias = grupos.some(g => g.nome);
  return (
    <div className="space-y-10">
      {grupos.map(g => (
        <section key={g.nome || '-'}>
          {temCategorias && (
            <div className="flex items-baseline gap-2.5 mb-3">
              <h2 className="font-bold text-[18px]" style={display}>{g.nome || 'Outros cursos'}</h2>
              <span className="text-[13px]" style={{ color: T.mute }}>{g.itens.length} curso{g.itens.length === 1 ? '' : 's'}</span>
            </div>
          )}
          <div className={GRADE_CURSOS}>
            {g.itens.map(i => i.meu ? <CardMeu key={i.c.id} c={i.c} /> : <CardVitrine key={i.c.id} c={i.c} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ─── Busca e filtros (no modelo do catálogo da Alura) ─────────── */
const NIVEIS: Record<string, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };
const ORDENS = { recomendados: 'Recomendados', avaliados: 'Mais bem avaliados', menor: 'Menor preço', maior: 'Maior preço' } as const;
type Ordem = keyof typeof ORDENS;
type Aba = 'todos' | 'meus' | 'nao-tenho' | 'em-breve';
const ABAS: { id: Aba; texto: string; curto?: string; filtro: (i: Item) => boolean }[] = [
  { id: 'todos',     texto: 'Todos os cursos', curto: 'Todos', filtro: () => true },
  { id: 'meus',      texto: 'Meus cursos',     filtro: i => i.meu },
  { id: 'nao-tenho', texto: 'Ainda não tenho', filtro: i => !i.meu },
  { id: 'em-breve',  texto: 'Em breve',        filtro: i => !i.meu && !i.c.preco },
];

// "Automação" e "automacao" acham o mesmo curso
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const alterna = (s: Set<string>, v: string) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };

/* Caixinha de marcar do painel de filtros, com quantos cursos tem */
function Marcar({ marcado, onChange, texto, qtd }: { marcado: boolean; onChange: () => void; texto: string; qtd: number }) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
      <input type="checkbox" checked={marcado} onChange={onChange} className="sr-only peer" />
      <span className="w-[18px] h-[18px] shrink-0 rounded-[5px] flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400"
        style={marcado ? { background: '#4F46E5', border: '1.5px solid #4F46E5' } : { border: `1.5px solid ${T.rule}`, background: T.card }}>
        {marcado && <Check size={12} strokeWidth={3} color="#FFFFFF" />}
      </span>
      <span className="flex-1 text-[14px] leading-snug transition-colors" style={{ color: marcado ? T.ink : T.ink2, fontWeight: marcado ? 600 : 400 }}>{texto}</span>
      <span className="text-[12.5px]" style={{ color: T.mute }}>{qtd}</span>
    </label>
  );
}

function GrupoFiltro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 first:pt-0">
      <p className="font-semibold text-[15px] mb-2" style={{ ...display, color: T.ink }}>{titulo}</p>
      {children}
    </div>
  );
}

/* Explorar cursos: catálogo com abas, filtros na lateral, busca e ordem (sem filtro, separado por categoria) */
export default function Explorar({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<Aba>('todos');
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [niveis, setNiveis] = useState<Set<string>>(new Set());
  const [ordem, setOrdem] = useState<Ordem>('recomendados');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false); // celular
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;
  const { nome, cursos, outros, erro } = dados;
  const total = cursos.length + outros.length;

  const todos: Item[] = [...outros.map(c => ({ meu: false as const, c })), ...cursos.map(c => ({ meu: true as const, c }))];
  const daAba = todos.filter(ABAS.find(a => a.id === aba)!.filtro);
  const categorias = [...new Map(todos.filter(i => i.c.categoria?.trim()).map(i => [normal(i.c.categoria!), i.c.categoria!.trim()])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  const listaNiveis = Object.keys(NIVEIS).filter(n => todos.some(i => i.c.nivel === n));
  const qtdFiltros = cats.size + niveis.size;
  const limpar = () => { setBusca(''); setCats(new Set()); setNiveis(new Set()); setOrdem('recomendados'); };
  const filtrando = !!busca.trim() || qtdFiltros > 0 || ordem !== 'recomendados' || aba !== 'todos';

  const termo = normal(busca);
  const precoDe = (i: Item) => (i.meu ? null : i.c.preco?.valor ?? null);
  const achados = daAba
    .filter(i => !termo || normal(`${i.c.titulo} ${i.c.subtitulo ?? ''} ${i.c.categoria ?? ''}`).includes(termo))
    .filter(i => !cats.size || cats.has(normal(i.c.categoria ?? '')))
    .filter(i => !niveis.size || (!!i.c.nivel && niveis.has(i.c.nivel)))
    .sort((a, b) => {
      if (ordem === 'avaliados') return (b.c.media ?? 0) - (a.c.media ?? 0) || b.c.avaliacoes - a.c.avaliacoes || a.c.ordem - b.c.ordem;
      if (ordem === 'menor' || ordem === 'maior') {
        const pa = precoDe(a), pb = precoDe(b);
        if (pa === null || pb === null) return pa === null ? (pb === null ? a.c.ordem - b.c.ordem : 1) : -1; // sem preço vai por último
        return ordem === 'menor' ? pa - pb : pb - pa;
      }
      return a.c.ordem - b.c.ordem;
    });

  const painel = (
    <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      {categorias.length > 0 && (
        <GrupoFiltro titulo="Categorias">
          {categorias.map(([chave, texto]) => (
            <Marcar key={chave} texto={texto} marcado={cats.has(chave)} onChange={() => setCats(s => alterna(s, chave))}
              qtd={daAba.filter(i => normal(i.c.categoria ?? '') === chave).length} />
          ))}
        </GrupoFiltro>
      )}
      <GrupoFiltro titulo="Nível">
        {listaNiveis.length ? listaNiveis.map(n => (
          <Marcar key={n} texto={NIVEIS[n]} marcado={niveis.has(n)} onChange={() => setNiveis(s => alterna(s, n))}
            qtd={daAba.filter(i => i.c.nivel === n).length} />
        )) : <p className="text-[13px]" style={{ color: T.mute }}>Os cursos ainda não têm nível definido.</p>}
      </GrupoFiltro>
      {qtdFiltros > 0 && (
        <button onClick={() => { setCats(new Set()); setNiveis(new Set()); }}
          className="mt-5 w-full h-10 rounded-[10px] text-[13.5px] font-semibold transition-colors hover:bg-slate-50"
          style={{ color: T.accent, border: `1px solid ${T.rule}` }}>
          Limpar filtros ({qtdFiltros})
        </button>
      )}
    </div>
  );

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Explorar cursos"
          sub={`${total} curso${total === 1 ? '' : 's'} na Nexla Academy. Assista à aula de amostra de cada um antes de decidir.`} />

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {/* Busca */}
        <label className="relative block mb-5">
          <span className="sr-only">Buscar curso</span>
          <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.mute }} />
          <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="O que você quer aprender? Busque pelo nome ou assunto"
            className="acad-field w-full h-[52px] rounded-xl pl-12 pr-12 text-[15px]" />
          {busca && (
            <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </label>

        {/* Abas: tipo de lista (como o "filtre por tipo de conteúdo" da Alura) */}
        <div role="tablist" aria-label="Quais cursos mostrar" className="grid grid-cols-2 lg:grid-cols-4 rounded-xl overflow-hidden mb-8"
          style={{ border: `1px solid ${T.rule}`, background: T.card }}>
          {ABAS.map((a, k) => {
            const ativa = aba === a.id;
            return (
              <button key={a.id} role="tab" aria-selected={ativa} onClick={() => setAba(a.id)}
                className={`relative flex items-center justify-between gap-3 h-14 px-5 text-left transition-colors hover:bg-slate-50
                  ${k % 2 ? 'border-l' : ''} ${k === 2 ? 'lg:border-l' : ''} ${k >= 2 ? 'border-t lg:border-t-0' : ''}`}
                style={{ borderColor: T.rule, background: ativa ? 'rgba(79,70,229,0.07)' : undefined }}>
                {ativa && <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: '#4F46E5' }} />}
                <span className="text-[14.5px] font-semibold truncate" style={{ color: ativa ? T.accent : T.ink2 }}>
                  {a.curto ? <><span className="sm:hidden">{a.curto}</span><span className="hidden sm:inline">{a.texto}</span></> : a.texto}
                </span>
                <span className="text-[13px] shrink-0" style={{ color: T.mute }}>{todos.filter(a.filtro).length}</span>
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[15.5rem_1fr] gap-6 lg:gap-8 items-start">
          {/* Filtros: fixos na lateral no computador; no celular abrem por um botão */}
          <aside className="lg:sticky lg:top-6">
            <button onClick={() => setFiltrosAbertos(v => !v)} aria-expanded={filtrosAbertos}
              className="lg:hidden w-full flex items-center justify-between h-12 px-4 rounded-xl text-[14.5px] font-semibold mb-3"
              style={{ background: T.card, border: `1px solid ${T.rule}`, color: T.ink }}>
              <span className="inline-flex items-center gap-2"><SlidersHorizontal size={17} strokeWidth={1.75} /> Filtros{qtdFiltros ? ` (${qtdFiltros})` : ''}</span>
              <ChevronDown size={17} strokeWidth={1.75} className="transition-transform" style={{ transform: filtrosAbertos ? 'rotate(180deg)' : 'none', color: T.mute }} />
            </button>
            <div className={filtrosAbertos ? 'block' : 'hidden lg:block'}>{painel}</div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <h2 className="font-bold text-[22px] leading-tight" style={display}>{ABAS.find(a => a.id === aba)!.texto}</h2>
                <p className="text-[13.5px] mt-0.5" style={{ color: T.mute }}>
                  {achados.length} curso{achados.length === 1 ? '' : 's'}
                </p>
              </div>
              <label className="relative inline-flex items-center gap-1.5 text-[13.5px]" style={{ color: T.mute }}>
                Ordenar por:
                <select value={ordem} onChange={e => setOrdem(e.target.value as Ordem)}
                  className="appearance-none bg-transparent font-semibold pr-5 cursor-pointer underline underline-offset-4 decoration-1 focus:outline-none" style={{ color: T.ink }}>
                  {(Object.keys(ORDENS) as Ordem[]).map(k => <option key={k} value={k}>{ORDENS[k]}</option>)}
                </select>
                <ChevronDown size={14} strokeWidth={2} className="absolute right-0 pointer-events-none" style={{ color: T.mute }} />
              </label>
            </div>

            {!filtrando ? <GradeCategorias outros={outros} cursos={cursos} /> : achados.length ? (
              <div className={GRADE_CURSOS}>
                {achados.map(i => i.meu ? <CardMeu key={i.c.id} c={i.c} /> : <CardVitrine key={i.c.id} c={i.c} />)}
              </div>
            ) : (
              <div className="rounded-2xl p-10 text-center" style={{ background: T.card, border: `1px dashed ${T.rule}` }}>
                <SearchX size={30} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
                <p className="font-semibold mt-3">Nenhum curso encontrado</p>
                <p className="text-[14px] mt-1" style={{ color: T.mute }}>Tente outro nome ou tire algum filtro.</p>
                <button onClick={() => { limpar(); setAba('todos'); }} className="mt-4 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
                  Ver todos os cursos
                </button>
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </AppLayout>
  );
}
