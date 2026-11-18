/* YouTube: o vídeo da aula pode ser um link do YouTube (de preferência "Não listado").
   Guardamos só o ID (11 caracteres); um ID do Bunny (36 caracteres) continua funcionando. */

/* "https://youtu.be/CD3yc173Nm4", "youtube.com/watch?v=...", "/shorts/...", "/embed/..." ou o próprio ID → ID */
export function idYoutube(texto: string): string | null {
  const t = texto.trim();
  const m = t.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(t) ? t : null;
}

/* Só o que usamos da API de player do YouTube (https://developers.google.com/youtube/iframe_api_reference) */
export type PlayerYT = {
  getCurrentTime(): number; getDuration(): number; seekTo(seg: number, permitirBuscar: boolean): void; destroy(): void;
};
type Evento = { target: PlayerYT; data: number };
type ConstrutorYT = new (alvo: HTMLElement, opcoes: {
  videoId: string; host?: string; width?: string; height?: string;
  playerVars?: Record<string, string | number>;
  events?: { onReady?: (e: Evento) => void; onStateChange?: (e: Evento) => void; onError?: (e: Evento) => void };
}) => PlayerYT;
declare global { interface Window { YT?: { Player: ConstrutorYT }; onYouTubeIframeAPIReady?: () => void } }

export const ESTADO_YT = { terminou: 0, tocando: 1, pausado: 2 } as const;

let api: Promise<ConstrutorYT> | null = null;
/* Carrega o script do YouTube uma vez só */
export function carregarYoutube(): Promise<ConstrutorYT> {
  if (window.YT?.Player) return Promise.resolve(window.YT.Player);
  return (api ??= new Promise((ok, falha) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { anterior?.(); ok(window.YT!.Player); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { api = null; falha(new Error('youtube')); };
    document.head.appendChild(s);
  }));
}

/* Cria o player dentro de "alvo" (o YouTube troca esse elemento pelo iframe) */
export async function criarPlayerYoutube(alvo: HTMLElement, videoId: string, events: {
  onReady?: (e: Evento) => void; onStateChange?: (e: Evento) => void; onError?: (e: Evento) => void;
}) {
  const Player = await carregarYoutube();
  return new Player(alvo, {
    videoId, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, origin: window.location.origin },
    events,
  });
}

/* Duração do vídeo (segundos), lida por um player escondido. null = não deu (vídeo privado, sem permissão de incorporar...) */
export function duracaoYoutube(videoId: string): Promise<number | null> {
  return new Promise(resolve => {
    const caixa = document.createElement('div');
    caixa.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px;opacity:0;pointer-events:none';
    const alvo = document.createElement('div');
    caixa.appendChild(alvo);
    document.body.appendChild(caixa);
    let player: PlayerYT | null = null;
    let tentativas = 0;
    const fim = (seg: number | null) => { window.clearTimeout(limite); try { player?.destroy(); } catch { /* já foi */ } caixa.remove(); resolve(seg); };
    const limite = window.setTimeout(() => fim(null), 15000);
    const ler = () => {
      const d = Math.round(player?.getDuration() ?? 0);
      if (d > 0) return fim(d);
      if (++tentativas > 20) return fim(null);
      window.setTimeout(ler, 300);
    };
    criarPlayerYoutube(alvo, videoId, { onReady: e => { player = e.target; ler(); }, onError: () => fim(null) })
      .then(p => { player = p; }, () => fim(null));
  });
}
