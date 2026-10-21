import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, LogOut, MessagesSquare, ShieldAlert } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display } from '../ui';
import { AppLayout, Carregando } from '../AppLayout';
import { Link, navegar, useRota } from '../router';
import { supabase } from '../supabase';

/* Seções da área admin */
const SECOES = [
  { para: '/admin',            texto: 'Visão geral', icone: BarChart3,      ativo: (r: string) => r === '/admin' },
  { para: '/admin/cursos',     texto: 'Cursos',      icone: BookOpen,       ativo: (r: string) => r.startsWith('/admin/curso') },
  { para: '/admin/comunidade', texto: 'Comunidade',  icone: MessagesSquare, ativo: (r: string) => r === '/admin/comunidade' },
];

/* Layout da área admin: topo próprio (sem as telas de aluno) com as 3 seções */
export function AdminLayout({ nome, children }: { nome: string; children: React.ReactNode }) {
  const rota = useRota();
  const sair = async () => { await supabase.auth.signOut(); navegar('/'); };
  return (
    <div className="min-h-screen" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-4">
          <Link para="/admin" className="inline-flex items-center gap-2.5 shrink-0">
            <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
            <span className="text-[17px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
            <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md" style={{ background: T.dark, color: '#FFFFFF' }}>Admin</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {SECOES.map(s => {
              const ativo = s.ativo(rota);
              return (
                <Link key={s.para} para={s.para} className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg text-[14px] font-medium transition-colors hover:bg-slate-100"
                  style={{ color: ativo ? T.ink : T.mute, background: ativo ? 'rgba(79,70,229,0.08)' : undefined }}>
                  <s.icone size={16} strokeWidth={1.75} /> {s.texto}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-[14px] font-medium max-w-[12rem] truncate" style={{ color: T.ink2 }}>{nome}</span>
            <button onClick={sair} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13.5px] font-medium transition-colors hover:bg-red-50" style={{ color: '#B91C1C' }}>
              <LogOut size={15} strokeWidth={1.75} /> Sair
            </button>
          </div>
        </div>
        {/* Celular: seções numa faixa logo abaixo do topo */}
        <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {SECOES.map(s => (
            <Link key={s.para} para={s.para} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13.5px] font-medium whitespace-nowrap"
              style={{ color: s.ativo(rota) ? T.ink : T.mute, background: s.ativo(rota) ? 'rgba(79,70,229,0.08)' : undefined }}>
              <s.icone size={15} strokeWidth={1.75} /> {s.texto}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 md:py-10">{children}</main>
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
