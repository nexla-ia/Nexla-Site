import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display } from '../ui';
import { AppLayout, Carregando } from '../AppLayout';
import { Link } from '../router';
import { supabase } from '../supabase';

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

export const inputCls = 'acad-field w-full h-11 rounded-[10px] px-3.5 text-[14.5px]';

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
