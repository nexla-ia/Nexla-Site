import { useEffect, useState } from 'react';

/* Roteador mínimo da Academy, com base /academy.
 * Em produção, o vercel.json reescreve /academy/* para academy/index.html;
 * no servidor local, o plugin em vite.config.ts faz o mesmo. */
export const BASE = '/academy';

const rotaAtual = () => {
  const p = window.location.pathname.replace(/\/+$/, '');
  return p.startsWith(BASE) ? p.slice(BASE.length) || '/' : '/';
};

export function navegar(para: string, { substituir = false } = {}) {
  window.history[substituir ? 'replaceState' : 'pushState'](null, '', BASE + para);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (!substituir) window.scrollTo(0, 0);
}

export function useRota() {
  const [rota, setRota] = useState(rotaAtual);
  useEffect(() => {
    const fn = () => setRota(rotaAtual());
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  return rota;
}

/* Lê um parâmetro da query string (?aula=...) */
export const parametro = (nome: string) => new URLSearchParams(window.location.search).get(nome);

/* Link interno: navega sem recarregar a página (Ctrl/⌘+clique continua abrindo em nova aba) */
export function Link({ para, children, className, style }: {
  para: string; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <a href={BASE + para} className={className} style={style}
      onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navegar(para);
      }}>
      {children}
    </a>
  );
}
