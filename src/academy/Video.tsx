import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, PlayCircle, RotateCcw, VideoOff } from 'lucide-react';
import { T } from './ui';
import { supabase } from './supabase';

type Estado = { tipo: 'carregando' } | { tipo: 'ok'; url: string } | { tipo: 'sem_video' } | { tipo: 'erro'; msg: string };

const MENSAGENS: Record<string, string> = {
  sem_acesso: 'Você não tem acesso a esta aula.',
  sem_biblioteca: 'O player de vídeo ainda não foi configurado.',
};

// Lugares por onde a marca d'água passeia (longe da barra de controles, embaixo)
const POSICOES = [
  { top: '10%', left: '6%' }, { top: '42%', left: '50%' }, { top: '14%', left: '62%' },
  { top: '62%', left: '10%' }, { top: '34%', left: '22%' }, { top: '58%', left: '58%' },
];
const tempo = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* Player da aula (Bunny Stream). O link vem da função academy-video, que só responde para quem
   pode assistir a aula; com a proteção por token ligada no Bunny, o link expira e não serve para compartilhar.
   • marca: texto da marca d'água (o e-mail do aluno), para desestimular gravação de tela.
   • userId: liga a retomada — salva o segundo em que parou e continua dali na próxima vez.
   • onFim: chamado quando o vídeo termina.
   O player do Bunny conversa com a página pelo protocolo player.js (postMessage). */
export default function VideoAula({ aulaId, onFim, marca, userId, children }: {
  aulaId: string; onFim?: () => void; marca?: string; userId?: string; children?: React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [lugar, setLugar] = useState(0);
  const [retomado, setRetomado] = useState<number | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const fim = useRef(onFim);
  fim.current = onFim;
  const salvo = useRef<number | null>(null);       // posição guardada no banco (para retomar)
  const atual = useRef({ seg: 0, dur: 0 });        // onde o vídeo está agora
  const ultimoSalvo = useRef(0);
  const pronto = useRef(false);                    // o player já avisou "ready"
  const retomou = useRef(false);

  // Mensagens para o player do Bunny (protocolo player.js). Pedidos de evento precisam de um "listener",
  // senão o player não responde.
  const mandar = (dados: object) =>
    iframe.current?.contentWindow?.postMessage(JSON.stringify({ context: 'player.js', version: '0.0.11', ...dados }), '*');
  // Continua de onde parou (a partir de 3 s; quando o player está pronto e a posição já chegou)
  const retomar = () => {
    const pos = salvo.current ?? 0;
    if (retomou.current || !pronto.current || salvo.current === null) return;
    retomou.current = true;
    if (pos >= 3) { mandar({ method: 'setCurrentTime', value: pos }); setRetomado(pos); }
  };
  const retomarRef = useRef(retomar);
  retomarRef.current = retomar;

  useEffect(() => {
    let vivo = true;
    setEstado({ tipo: 'carregando' });
    setRetomado(null);
    salvo.current = userId ? null : 0;
    atual.current = { seg: 0, dur: 0 };
    ultimoSalvo.current = 0;
    pronto.current = false;
    retomou.current = false;
    supabase.functions.invoke('academy-video', { body: { aula: aulaId } }).then(async ({ data, error }) => {
      if (!vivo) return;
      if (data?.url) return setEstado({ tipo: 'ok', url: data.url as string });
      let erro = '';
      try { erro = ((await (error as { context?: Response })?.context?.json()) ?? {}).erro ?? ''; } catch { /* sem corpo */ }
      if (!vivo) return;
      setEstado(erro === 'sem_video' ? { tipo: 'sem_video' } : { tipo: 'erro', msg: MENSAGENS[erro] ?? 'Não foi possível carregar o vídeo. Recarregue a página.' });
    });
    if (userId) {
      supabase.from('academy_lesson_progress').select('posicao_seg').eq('user_id', userId).eq('lesson_id', aulaId).maybeSingle()
        .then(({ data }) => {
          if (!vivo) return;
          salvo.current = Number(data?.posicao_seg ?? 0);
          ultimoSalvo.current = salvo.current;
          retomarRef.current(); // se o player ficou pronto antes, pula agora
        });
    }
    return () => { vivo = false; };
  }, [aulaId, userId]);

  // Grava a posição (no fim do vídeo volta para 0, para a próxima vez começar do início)
  const gravar = (seg: number) => {
    if (!userId) return;
    const { dur } = atual.current;
    const pertoDoFim = dur ? Math.min(15, Math.max(1, dur * 0.05)) : 0;
    const pos = dur && dur - seg < pertoDoFim ? 0 : Math.floor(seg);
    if (Math.abs(pos - ultimoSalvo.current) < 3) return;
    ultimoSalvo.current = pos;
    supabase.from('academy_lesson_progress').upsert({ user_id: userId, lesson_id: aulaId, posicao_seg: pos }, { onConflict: 'user_id,lesson_id' })
      .then(() => undefined, () => undefined);
  };
  const gravarRef = useRef(gravar);
  gravarRef.current = gravar;

  // Conversa com o player: retomar, acompanhar o tempo e saber quando terminou
  useEffect(() => {
    if (estado.tipo !== 'ok') return;
    const aoReceber = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      let m: { context?: string; event?: string; value?: { seconds?: number; duration?: number } } = {};
      try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (m?.context !== 'player.js') return;
      if (m.event === 'ready') {
        ['ended', 'timeupdate', 'pause'].forEach(ev => mandar({ method: 'addEventListener', value: ev, listener: `nx-${ev}` }));
        pronto.current = true;
        retomarRef.current();
      }
      if (m.event === 'timeupdate' && m.value) {
        atual.current = { seg: Number(m.value.seconds ?? 0), dur: Number(m.value.duration ?? 0) };
        if (Math.abs(atual.current.seg - ultimoSalvo.current) >= 10) gravarRef.current(atual.current.seg);
      }
      if (m.event === 'pause') gravarRef.current(atual.current.seg);
      if (m.event === 'ended') { gravarRef.current(atual.current.dur); fim.current?.(); }
    };
    const aoSair = () => { if (document.visibilityState === 'hidden') gravarRef.current(atual.current.seg); };
    window.addEventListener('message', aoReceber);
    document.addEventListener('visibilitychange', aoSair);
    return () => {
      window.removeEventListener('message', aoReceber);
      document.removeEventListener('visibilitychange', aoSair);
      gravarRef.current(atual.current.seg); // trocou de aula ou saiu da página
    };
  }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps

  // A marca d'água muda de lugar de tempos em tempos
  useEffect(() => {
    if (!marca || estado.tipo !== 'ok') return;
    const t = window.setInterval(() => setLugar(l => (l + 1) % POSICOES.length), 20000);
    return () => window.clearInterval(t);
  }, [marca, estado.tipo]);

  // Aviso "Continuando de 3:42" some sozinho
  useEffect(() => {
    if (retomado === null) return;
    const t = window.setTimeout(() => setRetomado(null), 6000);
    return () => window.clearTimeout(t);
  }, [retomado]);

  const doInicio = () => {
    mandar({ method: 'setCurrentTime', value: 0 });
    setRetomado(null);
  };

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
      style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText, border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -32px rgba(15,23,42,0.7)' }}>
      {estado.tipo === 'ok' ? (
        <>
          <iframe ref={iframe} src={estado.url} title="Vídeo da aula" loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
            className="absolute inset-0 w-full h-full border-0" />
          {marca && (
            <span aria-hidden className="absolute z-10 pointer-events-none select-none text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition-[top,left] duration-[2000ms] ease-in-out"
              style={{ ...POSICOES[lugar], color: 'rgba(255,255,255,0.32)', textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
              {marca}
            </span>
          )}
          <AnimatePresence>
            {retomado !== null && (
              <motion.div className="absolute z-20 top-3 left-3 inline-flex items-center gap-2 rounded-lg pl-3 pr-1.5 py-1.5 text-[12.5px]"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ background: 'rgba(15,23,42,0.78)', color: '#F1F5F9', backdropFilter: 'blur(6px)' }}>
                Continuando de {tempo(retomado)}
                <button onClick={doInicio} className="inline-flex items-center gap-1 h-7 px-2 rounded-md font-semibold hover:bg-white/10">
                  <RotateCcw size={13} strokeWidth={2} /> Começar do início
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
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
