import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, BookOpen, LineChart, LogOut, Menu, MessagesSquare, Moon, Receipt, ShieldAlert, Users, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display, ease, Avatar, fotoDaConta } from '../ui';
import { AppLayout, Carregando } from '../AppLayout';
import { Link, navegar, useRota } from '../router';
import { supabase, useSessao } from '../supabase';
import { useTema } from '../tema';

/* Seções da área admin, em grupos no menu lateral */
const GRUPOS = [
  { titulo: 'Painel', itens: [
    { para: '/admin',            texto: 'Visão geral', icone: BarChart3,      ativo: (r: string) => r === '/admin' },
    { para: '/admin/metricas',   texto: 'Métricas',    icone: LineChart,      ativo: (r: string) => r === '/admin/metricas' },
  ] },
  { titulo: 'Conteúdo', itens: [
    { para: '/admin/cursos',     texto: 'Cursos',      icone: BookOpen,       ativo: (r: string) => r.startsWith('/admin/curso') },
    { para: '/admin/comunidade', texto: 'Comunidade',  icone: MessagesSquare, ativo: (r: string) => r === '/admin/comunidade' },
  ] },
  { titulo: 'Vendas', itens: [
    { para: '/admin/vendas',     texto: 'Vendas',      icone: Receipt,        ativo: (r: string) => r === '/admin/vendas' },
    { para: '/admin/leads',      texto: 'Leads',       icone: Users,          ativo: (r: string) => r === '/admin/leads' },
  ] },
];

function Marca() {
  return (
    <Link para="/admin" className="inline-flex items-center gap-2.5">
      <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
      <span className="leading-tight">
        <span className="block text-[16.5px] font-bold whitespace-nowrap" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
        <span className="block text-[11.5px] font-medium" style={{ color: T.mute }}>Painel admin</span>
      </span>
    </Link>
  );
}

/* Conteúdo do menu lateral do admin: marca, seções em grupos e, no rodapé, conta, tema e sair */
function MenuAdmin({ foto, nome, email }: { foto: string; nome: string; email: string }) {
  const rota = useRota();
  const { escuro, alternar } = useTema();
  const sair = async () => { await supabase.auth.signOut(); navegar('/'); };
  return (
    <div className="h-full flex flex-col">
      <div className="h-16 px-5 shrink-0 flex items-center"><Marca /></div>

      <nav className="flex-1 px-3 pt-2 overflow-y-auto space-y-5">
        {GRUPOS.map(g => (
          <div key={g.titulo}>
            <p className="px-3 mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: T.mute }}>{g.titulo}</p>
            <div className="space-y-0.5">
              {g.itens.map(s => {
                const ativo = s.ativo(rota);
                return (
                  <Link key={s.para} para={s.para} className="flex items-center gap-3 px-3 h-10 rounded-lg text-[14.5px] font-medium transition-colors hover:bg-slate-100"
                    style={{ color: ativo ? T.accent : T.ink2, background: ativo ? 'rgba(79,70,229,0.08)' : undefined }}>
                    <s.icone size={18} strokeWidth={1.75} style={{ color: ativo ? T.accent : T.mute }} /> {s.texto}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 shrink-0" style={{ borderTop: `1px solid ${T.rule}` }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar foto={foto} nome={nome} email={email} fundo={`linear-gradient(135deg, #4F46E5, ${T.violet})`} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate" style={{ color: T.ink }}>{nome || email.split('@')[0]}</p>
            <p className="text-[12.5px] truncate" style={{ color: T.mute }}>{email}</p>
          </div>
        </div>
        <button role="switch" aria-checked={escuro} onClick={alternar}
          className="w-full mt-1 flex items-center gap-3 px-3 h-10 rounded-lg text-[14px] font-medium text-left transition-colors hover:bg-slate-100" style={{ color: T.ink2 }}>
          <Moon size={18} strokeWidth={1.75} style={{ color: T.mute }} /> Modo escuro
          <span className="ml-auto relative w-9 h-5 rounded-full shrink-0 transition-colors" style={{ background: escuro ? '#4F46E5' : 'var(--a-track)' }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-[left]" style={{ left: escuro ? 18 : 2 }} />
          </span>
        </button>
        <button onClick={sair} className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-[14px] font-medium text-left transition-colors hover:bg-red-50" style={{ color: 'var(--a-red)' }}>
          <LogOut size={18} strokeWidth={1.75} /> Sair da conta
        </button>
      </div>
    </div>
  );
}

/* Layout da área admin: menu lateral fixo no computador; no celular, topo com botão que abre o menu como gaveta */
export function AdminLayout({ nome, children }: { nome: string; children: React.ReactNode }) {
  const rota = useRota();
  const sessao = useSessao();
  const email = sessao?.user.email ?? '';
  const [gaveta, setGaveta] = useState(false);

  useEffect(() => { setGaveta(false); }, [rota]);
  useEffect(() => {
    if (!gaveta) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setGaveta(false); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [gaveta]);

  return (
    <div className="min-h-screen" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 z-30" style={{ background: T.card, borderRight: `1px solid ${T.rule}` }}>
        <MenuAdmin foto={fotoDaConta(sessao)} nome={nome} email={email} />
      </aside>

      {/* Celular e tablet */}
      <header className="lg:hidden sticky top-0 z-30" style={{ background: 'var(--a-vidro)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.rule}` }}>
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <Marca />
          <button onClick={() => setGaveta(true)} aria-label="Abrir menu" aria-expanded={gaveta}
            className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.ink2 }}>
            <Menu size={22} strokeWidth={1.75} />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {gaveta && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.4)' }} onClick={() => setGaveta(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.aside role="dialog" aria-label="Menu" className="absolute inset-y-0 left-0 w-72 max-w-[85vw]" style={{ background: T.card }}
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease }}>
              <button onClick={() => setGaveta(false)} aria-label="Fechar menu"
                className="absolute top-3 right-3 w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
                <X size={20} strokeWidth={1.75} />
              </button>
              <MenuAdmin foto={fotoDaConta(sessao)} nome={nome} email={email} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-60">
        <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function TituloAdmin({ titulo, sub, acao }: { titulo: string; sub?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(26px,3.2vw,34px)' }}>{titulo}</h1>
        {sub && <p className="text-[15px] mt-1.5" style={{ color: T.mute }}>{sub}</p>}
      </div>
      {acao}
    </div>
  );
}

/* Papel do usuário logado: undefined = carregando */
export function usePapel(sessao: Session | null | undefined) {
  const [papel, setPapel] = useState<{ admin: boolean; nome: string } | undefined>(undefined);
  useEffect(() => {
    if (!sessao) return;
    supabase.from('academy_profiles').select('nome, role').eq('id', sessao.user.id).maybeSingle()
      .then(({ data }) => setPapel({ admin: data?.role === 'admin', nome: (data?.nome as string) || sessao.user.email || '' }));
  }, [sessao]);
  return papel;
}

/* Envolve as telas do admin: só abre para quem tem role = 'admin' (o banco também bloqueia via RLS) */
export function SoAdmin({ sessao, children }: { sessao: Session; children: (nome: string) => React.ReactNode }) {
  const papel = usePapel(sessao);
  if (!papel) return <AppLayout nome=""><Carregando /></AppLayout>;
  if (!papel.admin) {
    return (
      <AppLayout nome={papel.nome}>
        <div className="max-w-md mx-auto text-center py-16">
          <ShieldAlert size={36} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
          <h1 className="font-bold text-[24px] mt-4" style={display}>Área restrita</h1>
          <p className="text-[15px] mt-2" style={{ color: T.mute }}>O painel admin é só para a equipe da Nexla.</p>
          <Link para="/painel" className="inline-block mt-6 font-semibold" style={{ color: T.accent }}>Voltar para meus cursos</Link>
        </div>
      </AppLayout>
    );
  }
  return <>{children(papel.nome)}</>;
}

/* "Planilha no Automático" → "planilha-no-automatico" */
export const gerarSlug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/×/g, 'x').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/* Fundo usado quando o curso ainda não tem foto de capa */
export const CAPA_PADRAO = `linear-gradient(135deg, ${T.dark}, #1E1B4B 60%, ${T.accent})`;

export const inputCls ='acad-field w-full h-11 rounded-[10px] px-3.5 text-[14.5px]';

export function Rotulo({ texto, children, dica }: { texto: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold mb-1.5" style={{ color: T.ink2 }}>{texto}</span>
      {children}
      {dica && <span className="block text-[12px] mt-1" style={{ color: T.mute }}>{dica}</span>}
    </label>
  );
}

export function Chave({ ligado, onChange, texto }: { ligado: boolean; onChange: (v: boolean) => void; texto: string }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onChange(!ligado)} className="inline-flex items-center gap-3">
      <span className="relative w-11 h-6 rounded-full shrink-0 transition-colors" style={{ background: ligado ? T.accent : 'rgba(15,23,42,0.18)' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-[left]" style={{ left: ligado ? 22 : 2 }} />
      </span>
      <span className="text-[14px]" style={{ color: T.ink2 }}>{texto}</span>
    </button>
  );
}

export const botaoPrimario = 'acad-btn inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white';
export const botaoSecundario = 'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[10px] text-[14px] font-semibold transition-colors hover:bg-slate-50';
