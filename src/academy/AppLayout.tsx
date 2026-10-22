import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, BookOpen, ChevronDown, Compass, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { T, LOGO, display, ease } from './ui';
import { Link, navegar } from './router';
import { supabase, useSessao, useEhAdmin } from './supabase';

/* Menu do perfil (avatar + nome): Meus cursos, Meu perfil, Meus certificados e Sair */
function MenuPerfil({ nome, admin, email }: { nome: string; admin: boolean; email: string }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inicial = (nome.trim()[0] || email[0] || '?').toUpperCase();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const ir = (para: string) => { setAberto(false); navegar(para); };
  const sair = async () => { setAberto(false); await supabase.auth.signOut(); navegar('/'); };

  const itens = admin ? [
    { icon: LayoutDashboard, texto: 'Voltar ao painel admin', acao: () => ir('/admin') },
  ] : [
    { icon: BookOpen,   texto: 'Meus cursos',       acao: () => ir('/painel') },
    { icon: Compass,    texto: 'Explorar cursos',   acao: () => ir('/cursos') },
    { icon: UserRound,  texto: 'Meu perfil',        acao: () => ir('/perfil') },
    { icon: Award,      texto: 'Meus certificados', acao: () => ir('/certificados') },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAberto(a => !a)} aria-haspopup="menu" aria-expanded={aberto}
        className="flex items-center gap-2.5 pl-1.5 pr-2.5 h-11 rounded-full transition-colors hover:bg-slate-100">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13.5px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.violet})` }} aria-hidden>{inicial}</span>
        <span className="hidden sm:block text-[14px] font-medium max-w-[11rem] truncate" style={{ color: T.ink2 }}>{nome || email}</span>
        <ChevronDown size={16} strokeWidth={1.75} className="transition-transform" style={{ color: T.mute, transform: aberto ? 'rotate(180deg)' : 'none' }} />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease }}
            className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 20px 50px -20px rgba(15,23,42,0.35)', transformOrigin: 'top right' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${T.rule}` }}>
              <p className="text-[14px] font-semibold truncate" style={{ color: T.ink }}>{nome || 'Aluno'}</p>
              <p className="text-[12.5px] truncate" style={{ color: T.mute }}>{email}</p>
            </div>
            <div className="py-1.5">
              {itens.map(i => (
                <button key={i.texto} role="menuitem" onClick={i.acao}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-left transition-colors hover:bg-slate-50" style={{ color: T.ink2 }}>
                  <i.icon size={17} strokeWidth={1.75} style={{ color: T.mute }} /> {i.texto}
                </button>
              ))}
            </div>
            <div className="py-1.5" style={{ borderTop: `1px solid ${T.rule}` }}>
              <button role="menuitem" onClick={sair}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-left transition-colors hover:bg-red-50" style={{ color: '#B91C1C' }}>
                <LogOut size={17} strokeWidth={1.75} /> Sair da conta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Layout das telas do aluno (painel, curso, perfil...): topo com a marca e o menu do perfil
   (a navegação fica no menu do perfil; o admin vendo como aluno tem o link de volta) */
export function AppLayout({ nome, children }: { nome: string; children: React.ReactNode }) {
  const sessao = useSessao();
  const admin = !!useEhAdmin(sessao);
  return (
    <div className="min-h-screen" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link para="/painel" className="inline-flex items-center gap-2.5">
            <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
            <span className="text-[17px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
          </Link>
          {admin && (
            <Link para="/admin/cursos" className="hidden md:inline-flex mr-auto ml-6 text-[14px] font-medium hover:underline underline-offset-4" style={{ color: T.mute }}>
              ← Voltar ao admin
            </Link>
          )}
          <MenuPerfil nome={nome} admin={admin} email={sessao?.user.email ?? ''} />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 md:py-12">{children}</main>
    </div>
  );
}

/* Barra de progresso do curso */
export function BarraProgresso({ valor, grossa = false }: { valor: number; grossa?: boolean }) {
  return (
    <div className={`${grossa ? 'h-2.5' : 'h-2'} rounded-full overflow-hidden`} style={{ background: 'rgba(15,23,42,0.08)' }}>
      <div className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${valor}%`, background: valor >= 100 ? '#22C55E' : `linear-gradient(90deg, ${T.accent}, ${T.violet})` }} />
    </div>
  );
}

export function Carregando() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <span className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" aria-label="Carregando" />
    </div>
  );
}

/* Cabeçalho padrão das páginas internas: link de voltar + título + subtítulo */
export function TituloPagina({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div className="mb-8">
      <Link para="/painel" className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-4 hover:underline underline-offset-4" style={{ color: T.mute }}>
        ← Meus cursos
      </Link>
      <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(26px,3.2vw,36px)' }}>{titulo}</h1>
      {sub && <p className="text-[15px] mt-1.5" style={{ color: T.mute }}>{sub}</p>}
    </div>
  );
}
