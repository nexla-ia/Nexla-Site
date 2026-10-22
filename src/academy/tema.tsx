import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/* Tema da Academy: claro (padrão), escuro ou automático (segue o celular/computador).
   Fica salvo no navegador da pessoa; o academy/index.html aplica antes de abrir para não piscar. */
export type Tema = 'claro' | 'escuro' | 'sistema';
const CHAVE = 'academy-tema';
const ouvintes = new Set<() => void>();

export function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === 'escuro' || t === 'sistema' ? t : 'claro';
  } catch { return 'claro'; }
}

const sistemaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
export const temaEscuro = (t: Tema = lerTema()) => t === 'escuro' || (t === 'sistema' && sistemaEscuro());

export function aplicarTema() {
  document.documentElement.dataset.tema = temaEscuro() ? 'escuro' : 'claro';
  ouvintes.forEach(f => f());
}

export function salvarTema(t: Tema) {
  try { localStorage.setItem(CHAVE, t); } catch { /* sem armazenamento: vale só até recarregar */ }
  document.documentElement.dataset.tema = temaEscuro(t) ? 'escuro' : 'claro';
  ouvintes.forEach(f => f());
}

/* Liga uma vez na abertura: no automático, acompanha quando o sistema troca de tema */
export function iniciarTema() {
  aplicarTema();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (lerTema() === 'sistema') aplicarTema(); });
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(lerTema);
  const [escuro, setEscuro] = useState(() => temaEscuro());
  useEffect(() => {
    const f = () => { setTema(lerTema()); setEscuro(temaEscuro()); };
    ouvintes.add(f);
    return () => { ouvintes.delete(f); };
  }, []);
  return { tema, escuro, salvar: salvarTema, alternar: () => salvarTema(escuro ? 'claro' : 'escuro') };
}

/* Botão de sol/lua para trocar o tema na hora (topo do curso e do admin) */
export function BotaoTema({ className = '' }: { className?: string }) {
  const { escuro, alternar } = useTema();
  return (
    <button onClick={alternar} title={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'} aria-label={escuro ? 'Modo claro' : 'Modo escuro'}
      className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100 ${className}`} style={{ color: 'var(--a-mute)' }}>
      {escuro ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
