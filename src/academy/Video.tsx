import { useEffect, useRef, useState } from 'react';
import { Loader2, PlayCircle, VideoOff } from 'lucide-react';
import { T } from './ui';
import { supabase } from './supabase';

type Estado = { tipo: 'carregando' } | { tipo: 'ok'; url: string } | { tipo: 'sem_video' } | { tipo: 'erro'; msg: string };

const MENSAGENS: Record<string, string> = {
  sem_acesso: 'Você não tem acesso a esta aula.',
  sem_biblioteca: 'O player de vídeo ainda não foi configurado.',
};

/* Player da aula (Bunny Stream). O link vem da função academy-video, que só responde para quem
   pode assistir a aula; com a proteção por token ligada no Bunny, o link expira e não serve para compartilhar.
   onFim: chamado quando o vídeo termina (o player do Bunny avisa pelo protocolo player.js). */
export default function VideoAula({ aulaId, onFim, children }: { aulaId: string; onFim?: () => void; children?: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const iframe = useRef<HTMLIFrameElement>(null);
  const fim = useRef(onFim);
  fim.current = onFim;

  useEffect(() => {
    let vivo = true;
    setEstado({ tipo: 'carregando' });
    supabase.functions.invoke('academy-video', { body: { aula: aulaId } }).then(async ({ data, error }) => {
      if (!vivo) return;
      if (data?.url) return setEstado({ tipo: 'ok', url: data.url as string });
      let erro = '';
      try { erro = ((await (error as { context?: Response })?.context?.json()) ?? {}).erro ?? ''; } catch { /* sem corpo */ }
      if (!vivo) return;
      setEstado(erro === 'sem_video' ? { tipo: 'sem_video' } : { tipo: 'erro', msg: MENSAGENS[erro] ?? 'Não foi possível carregar o vídeo. Recarregue a página.' });
    });
    return () => { vivo = false; };
  }, [aulaId]);

  // Fim do vídeo: o player do Bunny fala o protocolo player.js por postMessage
  useEffect(() => {
    if (estado.tipo !== 'ok') return;
    const mandar = (dados: object) => iframe.current?.contentWindow?.postMessage(JSON.stringify({ context: 'player.js', version: '0.0.11', ...dados }), '*');
    const aoReceber = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      let m: { context?: string; event?: string } = {};
      try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (m?.context !== 'player.js') return;
      if (m.event === 'ready') mandar({ method: 'addEventListener', value: 'ended' });
      if (m.event === 'ended') fim.current?.();
    };
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [estado]);

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
      style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText, border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -32px rgba(15,23,42,0.7)' }}>
      {estado.tipo === 'ok' ? (
        <iframe ref={iframe} src={estado.url} title="Vídeo da aula" loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
          className="absolute inset-0 w-full h-full border-0" />
      ) : estado.tipo === 'carregando' ? (
        <Loader2 size={34} strokeWidth={1.75} className="animate-spin" style={{ color: '#A5B4FC' }} />
      ) : estado.tipo === 'sem_video' ? (
        <>
          <PlayCircle size={52} strokeWidth={1.25} style={{ color: '#A5B4FC' }} />
          <p className="mt-3 text-[14px]" style={{ color: T.darkMute }}>O vídeo desta aula ainda não foi publicado.</p>
        </>
      ) : (
        <>
          <VideoOff size={44} strokeWidth={1.5} style={{ color: '#A5B4FC' }} />
          <p className="mt-3 text-[14px]" style={{ color: T.darkMute }}>{estado.msg}</p>
        </>
      )}
      {children}
    </div>
  );
}
