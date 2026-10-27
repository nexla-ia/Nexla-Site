import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, BookOpen, Compass, LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react';
import { T, LOGO, display, ease, Avatar, fotoDaConta } from './ui';
import { Link, navegar, useRota } from './router';
import { supabase, useSessao, useEhAdmin } from './supabase';

/* Itens do menu lateral do aluno */
const NAV = [
  { para: '/painel',       texto: 'Meus cursos',       icone: BookOpen,  ativo: (r: string) => r === '/painel' || r.startsWith('/curso/') || r.startsWith('/comprar/') },
  { para: '/cursos',       texto: 'Explorar cursos',   icone: Compass,   ativo: (r: string) => r === '/cursos' },
  { para: '/certificados', texto: 'Meus certificados', icone: Award,     ativo: (r: string) => r.startsWith('/certificado') },
  { para: '/perfil',       texto: 'Meu perfil',        icone: UserRound, ativo: (r: string) => r === '/perfil' },
];
// admin vendo um curso como aluno
const NAV_ADMIN = [{ para: '/admin', texto: 'Voltar ao painel admin', icone: LayoutDashboard, ativo: () => false }];

/* Nome da conta guardado entre as telas: enquanto a página ainda carrega (nome = ""),
   o menu usa o nome já conhecido ou busca no perfil, em vez de mostrar "Aluno" */
const nomesConta = new Map<string, string>();
function useNomeConta(nome: string) {
  const sessao = useSessao();
  const uid = sessao?.user.id;
  const [buscado, setBuscado] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    if (nome) { nomesConta.set(uid, nome); return; }
    if (nomesConta.has(uid)) { setBuscado(nomesConta.get(uid)); return; }
    let vivo = true;
    supabase.from('academy_profiles').select('nome').eq('id', uid).maybeSingle().then(({ data }) => {
      const n = (data?.nome as string | undefined)?.trim();
      if (n) nomesConta.set(uid, n);
      if (vivo && n) setBuscado(n);
    });
    return () => { vivo = false; };
  }, [uid, nome]);
  return nome || buscado || (uid ? nomesConta.get(uid) : undefined) || (sessao?.user.user_metadata?.nome as string | undefined) || '';
}

/* Conteúdo do menu lateral: marca, links e, no rodapé, a conta com o botão de sair */
function MenuLateral({ foto, nome, email, admin }: { foto: string; nome: string; email: string; admin: boolean }) {
  const rota = useRota();
  const sair = async () => { await supabase.auth.signOut(); navegar('/'); };
  return (
    <div className="h-full flex flex-col">
      <Link para={admin ? '/admin' : '/painel'} className="h-16 px-5 shrink-0 inline-flex items-center gap-2.5">
        <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
        <span className="text-[17px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
      </Link>

      <nav className="flex-1 px-3 pt-3 space-y-0.5 overflow-y-auto">
        {(admin ? NAV_ADMIN : NAV).map(n => {
          const ativo = n.ativo(rota);
          return (
            <Link key={n.para} para={n.para} className="flex items-center gap-3 px-3 h-10 rounded-lg text-[14.5px] font-medium transition-colors hover:bg-slate-100"
              style={{ color: ativo ? T.accent : T.ink2, background: ativo ? 'rgba(79,70,229,0.08)' : undefined }}>
              <n.icone size={18} strokeWidth={1.75} style={{ color: ativo ? T.accent : T.mute }} /> {n.texto}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 shrink-0" style={{ borderTop: `1px solid ${T.rule}` }}>
        {/* Conta (abre o perfil, onde ficam as configurações, inclusive o tema) */}
        <Link para={admin ? '/admin' : '/perfil'} className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors hover:bg-slate-100">
          <Avatar foto={foto} nome={nome} email={email} fundo={`linear-gradient(135deg, ${T.accent}, ${T.violet})`} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate" style={{ color: T.ink }}>{nome || email.split('@')[0]}</p>
            <p className="text-[12.5px] truncate" style={{ color: T.mute }}>{email}</p>
          </div>
        </Link>
        <button onClick={sair} className="w-full mt-1 flex items-center gap-3 px-3 h-10 rounded-lg text-[14px] font-medium text-left transition-colors hover:bg-red-50" style={{ color: 'var(--a-red)' }}>
          <LogOut size={18} strokeWidth={1.75} /> Sair da conta
        </button>
      </div>
    </div>
  );
}

/* Layout das telas do aluno (painel, curso, perfil...): menu lateral fixo no computador,
   e no celular um topo com botão que abre o mesmo menu como gaveta.
   (a tela de assistir o curso tem layout próprio, no Curso.tsx) */
export function AppLayout({ nome: nomePagina, children }: { nome: string; children: React.ReactNode }) {
  const rota = useRota();
  const sessao = useSessao();
  const nome = useNomeConta(nomePagina);
  const admin = !!useEhAdmin(sessao);
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
        <MenuLateral foto={fotoDaConta(sessao)} nome={nome} email={email} admin={admin} />
      </aside>

      {/* Celular e tablet */}
      <header className="lg:hidden sticky top-0 z-30" style={{ background: 'var(--a-vidro)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.rule}` }}>
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link para={admin ? '/admin' : '/painel'} className="inline-flex items-center gap-2">
            <img src={LOGO} alt="" className="w-7 h-7 object-contain" />
            <span className="text-[16px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
          </Link>
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
              <MenuLateral foto={fotoDaConta(sessao)} nome={nome} email={email} admin={admin} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-60">
        <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 md:py-12">{children}</main>
      </div>
    </div>
  );
}

/* Barra de progresso do curso */
export function BarraProgresso({ valor, grossa = false }: { valor: number; grossa?: boolean }) {
  return (
    <div className={`${grossa ? 'h-2.5' : 'h-2'} rounded-full overflow-hidden`} style={{ background: 'var(--a-track)' }}>
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

/* Cabeçalho padrão das páginas internas: título + subtítulo (voltar fica no menu lateral) */
export function TituloPagina({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(26px,3.2vw,36px)' }}>{titulo}</h1>
      {sub && <p className="text-[15px] mt-1.5" style={{ color: T.mute }}>{sub}</p>}
    </div>
  );
}
