import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, PlayCircle, RotateCcw, VideoOff } from 'lucide-react';
import { T } from './ui';
import { supabase } from './supabase';
import { lerPreferencia } from './preferencias';
import { idYoutube, criarPlayerYoutube, ESTADO_YT, type PlayerYT } from './youtube';

// ok = player do Bunny (link assinado); youtube = vídeo do YouTube (pelo ID)
type Estado = { tipo: 'carregando' } | { tipo: 'ok'; url: string } | { tipo: 'youtube'; id: string } | { tipo: 'sem_video' } | { tipo: 'erro'; msg: string };

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

/* Player da aula: YouTube ou Bunny Stream.
   • YouTube: o ID do vídeo é lido da aula com as regras do banco (só quem pode assistir recebe).
   • Bunny: o link vem da função academy-video, que só responde para quem pode assistir a aula;
     com a proteção por token ligada no Bunny, o link expira e não serve para compartilhar.
   • marca: texto da marca d'água (o e-mail do aluno), para desestimular gravação de tela.
   • userId: liga a retomada — salva o segundo em que parou e continua dali na próxima vez.
   • onFim: chamado quando o vídeo termina.
   O player do Bunny conversa com a página pelo protocolo player.js (postMessage); o do YouTube, pela API dele. */
export default function VideoAula({ aulaId, onFim, marca, userId, children }: {
  aulaId: string; onFim?: () => void; marca?: string; userId?: string; children?: React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [lugar, setLugar] = useState(0);
  const [retomado, setRetomado] = useState<number | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const alvoYoutube = useRef<HTMLDivElement>(null); // o YouTube troca este elemento pelo player
  const irPara = useRef<(seg: number) => void>(() => undefined);
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
    if (pos >= 3 && lerPreferencia('retomar')) { irPara.current(pos); setRetomado(pos); }
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
    // Vídeo do YouTube: basta o ID (a aula só aparece para quem pode assistir). Senão, Bunny pela função.
    supabase.from('academy_lessons').select('video_id').eq('id', aulaId).maybeSingle().then(({ data: linha }) => {
      if (!vivo) return;
      const yt = idYoutube(String(linha?.video_id ?? ''));
      if (yt) return setEstado({ tipo: 'youtube', id: yt });
      supabase.functions.invoke('academy-video', { body: { aula: aulaId } }).then(async ({ data, error }) => {
        if (!vivo) return;
        if (data?.url) return setEstado({ tipo: 'ok', url: data.url as string });
        let erro = '';
        try { erro = ((await (error as { context?: Response })?.context?.json()) ?? {}).erro ?? ''; } catch { /* sem corpo */ }
        if (!vivo) return;
        setEstado(erro === 'sem_video' ? { tipo: 'sem_video' } : { tipo: 'erro', msg: MENSAGENS[erro] ?? 'Não foi possível carregar o vídeo. Recarregue a página.' });
      });
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

  // Grava a posição. O banco soma o tempo assistido a partir dessas gravações (SQL 029), então:
  //   • ao dar play, grava o ponto de partida (forcar), senão o primeiro trecho não contaria;
  //   • vídeo curto grava com mais frequência (a cada 10% dele, entre 2 e 10 s).
  const gravar = (seg: number, forcar = false): Promise<void> => {
    if (!userId) return Promise.resolve();
    const pos = Math.floor(seg);
    if (!forcar && Math.abs(pos - ultimoSalvo.current) < 2) return Promise.resolve();
    ultimoSalvo.current = pos;
    return Promise.resolve(supabase.from('academy_lesson_progress').upsert({ user_id: userId, lesson_id: aulaId, posicao_seg: pos }, { onConflict: 'user_id,lesson_id' }))
      .then(() => undefined, () => undefined);
  };
  const gravarRef = useRef(gravar);
  gravarRef.current = gravar;

  // Conversa com o player: retomar, acompanhar o tempo e saber quando terminou
  useEffect(() => {
    if (estado.tipo !== 'ok' && estado.tipo !== 'youtube') return;
    let partida = false;  // deu play: grava o ponto de partida na próxima atualização de tempo
    let terminou = false; // acabou: a posição já voltou para 0 (próxima vez começa do início)
    const aoPronto = () => { pronto.current = true; retomarRef.current(); };
    const aoPlay = () => { partida = true; terminou = false; };
    const aoTempo = (seg: number, dur: number) => {
      atual.current = { seg, dur };
      const intervalo = dur ? Math.min(10, Math.max(2, dur / 10)) : 10;
      if (partida) { partida = false; gravarRef.current(seg, true); }
      else if (Math.abs(seg - ultimoSalvo.current) >= intervalo) gravarRef.current(seg);
    };
    const aoPausar = () => { if (!terminou) gravarRef.current(atual.current.seg); };
    const aoTerminar = () => {
      if (terminou) return;
      terminou = true;
      // Primeiro grava o fim (conta o último trecho), depois conclui a aula e volta a posição para 0
      const dur = atual.current.dur || atual.current.seg;
      gravarRef.current(dur, true).then(() => { fim.current?.(); gravarRef.current(0, true); });
    };

    let desligar: () => void;
    if (estado.tipo === 'ok') {
      // Bunny: protocolo player.js
      irPara.current = seg => mandar({ method: 'setCurrentTime', value: seg });
      const aoReceber = (e: MessageEvent) => {
        if (e.source !== iframe.current?.contentWindow) return;
        let m: { context?: string; event?: string; value?: { seconds?: number; duration?: number } } = {};
        try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
        if (m?.context !== 'player.js') return;
        if (m.event === 'ready') {
          ['ended', 'timeupdate', 'pause', 'play'].forEach(ev => mandar({ method: 'addEventListener', value: ev, listener: `nx-${ev}` }));
          aoPronto();
        }
        if (m.event === 'play') aoPlay();
        if (m.event === 'timeupdate' && m.value) aoTempo(Number(m.value.seconds ?? 0), Number(m.value.duration ?? 0));
        if (m.event === 'pause') aoPausar();
        if (m.event === 'ended') aoTerminar();
      };
      window.addEventListener('message', aoReceber);
      desligar = () => window.removeEventListener('message', aoReceber);
    } else {
      // YouTube: a API não tem "timeupdate", então mede o tempo a cada segundo enquanto toca
      let vivo = true;
      let player: PlayerYT | null = null;
      let relogio = 0;
      const medir = () => { if (player) aoTempo(player.getCurrentTime(), player.getDuration()); };
      criarPlayerYoutube(alvoYoutube.current!, estado.id, {
        onReady: e => { player = e.target; irPara.current = seg => player?.seekTo(seg, true); aoPronto(); },
        onStateChange: e => {
          window.clearInterval(relogio);
          if (e.data === ESTADO_YT.tocando) { aoPlay(); medir(); relogio = window.setInterval(medir, 1000); return; }
          medir();
          if (e.data === ESTADO_YT.pausado) aoPausar();
          if (e.data === ESTADO_YT.terminou) aoTerminar();
        },
        onError: () => { if (vivo) setEstado({ tipo: 'erro', msg: 'Este vídeo do YouTube não pode ser exibido aqui. Confira se ele é "Não listado" e permite incorporação.' }); },
      }).then(p => { if (vivo) player ??= p; else p.destroy(); },
        () => { if (vivo) setEstado({ tipo: 'erro', msg: 'Não foi possível carregar o player do YouTube. Recarregue a página.' }); });
      desligar = () => { vivo = false; window.clearInterval(relogio); try { player?.destroy(); } catch { /* já foi */ } };
    }

    const aoSair = () => { if (document.visibilityState === 'hidden' && !terminou) gravarRef.current(atual.current.seg); };
    document.addEventListener('visibilitychange', aoSair);
    return () => {
      desligar();
      document.removeEventListener('visibilitychange', aoSair);
      irPara.current = () => undefined;
      if (!terminou) gravarRef.current(atual.current.seg); // trocou de aula ou saiu da página
    };
  }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps

  // A marca d'água muda de lugar de tempos em tempos
  useEffect(() => {
    if (!marca || (estado.tipo !== 'ok' && estado.tipo !== 'youtube')) return;
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
    irPara.current(0);
    setRetomado(null);
  };

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center text-center px-6"
      style={{ background: `linear-gradient(135deg, ${T.dark}, #1E1B4B)`, color: T.darkText, border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -32px rgba(15,23,42,0.7)' }}>
      {estado.tipo === 'ok' || estado.tipo === 'youtube' ? (
        <>
          {estado.tipo === 'ok' ? (
            <iframe ref={iframe} src={estado.url} title="Vídeo da aula" loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
              className="absolute inset-0 w-full h-full border-0" />
          ) : (
            <div key={estado.id} className="absolute inset-0"><div ref={alvoYoutube} /></div>
          )}
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
