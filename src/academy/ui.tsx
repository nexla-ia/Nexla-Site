import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Info, Mail } from 'lucide-react';

/* ─── Paleta (a mesma do site nexla.com.br) ───────────────────── */
/* As cores que mudam no modo escuro são variáveis CSS (valores em academy.css);
   as "dark*" são dos painéis que já são escuros nos dois temas (login, player). */
export const T = {
  paper: 'var(--a-paper)', card: 'var(--a-card)',
  ink: 'var(--a-ink)', ink2: 'var(--a-ink2)', mute: 'var(--a-mute)', rule: 'var(--a-rule)',
  accent: 'var(--a-accent)', violet: '#7C3AED',
  dark: '#0F172A', darkText: '#F1F5F9', darkMute: 'rgba(241,245,249,0.68)', darkRule: 'rgba(241,245,249,0.12)',
} as const;

export const ease = [0.16, 1, 0.3, 1] as const;
export const LOGO = '/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png';
export const display = { fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.025em' } as const;
/* WhatsApp: só dígitos e máscara (00) 00000-0000 */
export const soDigitos = (s: string) => s.replace(/\D/g, '');
export function mascaraWhats(v: string) {
  // Ignora o 55 (Brasil) quando vier junto: "+55 69 99999-1454" → "(69) 99999-1454"
  let d = soDigitos(v);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const campoCls = 'acad-field w-full h-12 rounded-[10px] pl-11 pr-4 text-[15px]';

/* Layout das telas de acesso: painel da marca à esquerda (só no computador) e formulário à direita */
export function AuthLayout({ painel, children }: { painel: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr] lg:items-start" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Painel fixo: fica parado na tela enquanto só o formulário rola */}
      <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16 lg:sticky lg:top-0 lg:h-screen" style={{ background: T.dark, color: T.darkText }}>
        <a href="/" className="inline-flex items-center gap-3 w-fit">
          <img src={LOGO} alt="" className="w-10 h-10 object-contain" />
          <span className="text-[19px] font-bold" style={display}>Nexla <span style={{ color: '#A5B4FC' }}>Academy</span></span>
        </a>
        <div className="max-w-[30rem]">{painel}</div>
        <p className="text-[12.5px]" style={{ color: T.darkMute }}>Nexla Automação e IA · Vilhena, RO</p>
      </aside>

      <main className="flex flex-col min-h-screen px-5 sm:px-10 py-8">
        <div className="flex items-center justify-between">
          <a href="/" className="lg:hidden inline-flex items-center gap-2.5">
            <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
            <span className="text-[17px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
          </a>
          <a href="/" className="ml-auto inline-flex items-center gap-1.5 text-sm transition-colors hover:text-slate-900" style={{ color: T.mute }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> Voltar ao site
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
            className="w-full max-w-[25rem]">
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

/* Lista do painel escuro: ícone + título + subtítulo */
export function ListaPainel({ itens }: { itens: { icon: typeof Mail; titulo: string; sub: string }[] }) {
  return (
    <ul>
      {itens.map(c => (
        <li key={c.titulo} className="flex items-start gap-4 py-4" style={{ borderTop: `1px solid ${T.darkRule}` }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(129,140,248,0.14)', color: '#A5B4FC' }}>
            <c.icon size={19} strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">{c.titulo}</span>
            <span className="block text-[13.5px] mt-0.5" style={{ color: T.darkMute }}>{c.sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Campo({ label, icon: Icon, children, extra }: {
  label: string; icon: typeof Mail; children: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-2">
        <span className="text-[13.5px] font-semibold" style={{ color: T.ink2 }}>{label}</span>
        {extra}
      </span>
      <span className="relative block">
        <Icon size={17} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.mute }} />
        {children}
      </span>
    </label>
  );
}

/* Mensagem de erro (vermelha) ou aviso (roxo) abaixo do formulário */
export function Mensagem({ erro, aviso }: { erro: string; aviso: string }) {
  return (
    <AnimatePresence mode="wait">
      {(erro || aviso) && (
        <motion.p key={erro || aviso} role={erro ? 'alert' : 'status'}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-start gap-2.5 text-[13.5px] leading-relaxed rounded-[10px] px-3.5 py-3"
          style={erro
            ? { background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)', border: '1px solid rgba(239,68,68,0.2)' }
            : { background: 'rgba(99,102,241,0.1)', color: T.accent, border: '1px solid rgba(99,102,241,0.25)' }}>
          <Info size={16} strokeWidth={2} className="shrink-0 mt-0.5" /> {erro || aviso}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/* Botão do Google com o "G" oficial */
export function BotaoGoogle({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-3 text-[15px] font-semibold transition-colors hover:bg-slate-50"
      style={{ background: T.card, border: `1px solid ${T.rule}`, color: T.ink }}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {texto}
    </button>
  );
}

export function Divisor({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-4 my-6 text-[12.5px]" style={{ color: T.mute }}>
      <span className="flex-1 h-px" style={{ background: T.rule }} /> {texto} <span className="flex-1 h-px" style={{ background: T.rule }} />
    </div>
  );
}

/* Foto da conta: a do Google (quem entrou pelo Google); sem foto ou se ela não carregar, a inicial do nome */
export const fotoDaConta = (sessao: Session | null | undefined) => {
  const meta = sessao?.user.user_metadata ?? {};
  const url = String(meta.avatar_url ?? meta.picture ?? '');
  return /^https:\/\//.test(url) ? url : '';
};
export function Avatar({ foto, nome, email, fundo, grande }: { foto: string; nome: string; email: string; fundo: string; grande?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const tam = grande ? 'w-16 h-16' : 'w-9 h-9';
  if (foto && !falhou) {
    return <img src={foto} alt="" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className={`${tam} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${tam} shrink-0 rounded-full flex items-center justify-center ${grande ? 'text-[24px]' : 'text-[14px]'} font-bold text-white`}
      style={{ background: fundo }} aria-hidden>{(nome.trim()[0] || email[0] || '?').toUpperCase()}</span>
  );
}
