import { Fragment, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, CheckCheck, ChevronDown, Loader2, Plus, UserPlus, ScanSearch, Sunrise,
  MessageCircle, Instagram, Globe, Video, Phone, MoreVertical, Smile, Paperclip, Camera, Mic,
} from 'lucide-react';

/* ─── Configuração ───────────────────────────────────────────────
 * WEBHOOK_URL   → Webhook (POST) do n8n que cadastra o assinante.
 * META_PIXEL_ID → mesmo Pixel da /5x2.                              */
const WEBHOOK_URL   = 'https://n8n.nexladesenvolvimento.com.br/webhook/tasabendo';
const META_PIXEL_ID: string = '1410172823723220';
const WHATSAPP      = '556999300101';

/* ─── Paleta (a mesma do site e da /5x2) ───────────────────────── */
const T = {
  paper: '#F1F5F9', paper2: '#E7ECF4', card: '#FFFFFF',
  ink: '#0F172A', ink2: '#1E293B', mute: '#475569', rule: 'rgba(15,23,42,0.10)',
  accent: '#4F46E5', violet: '#7C3AED',
  dark: '#0F172A', dark2: '#1E293B', darkText: '#F1F5F9',
  darkMute: 'rgba(241,245,249,0.68)', darkRule: 'rgba(241,245,249,0.12)',
  wa: '#25D366',
} as const;
const GRAD = `linear-gradient(135deg, ${T.accent}, ${T.violet})`;

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const vp = { once: true, margin: '-60px' } as const;
const WRAP = 'max-w-[1180px] mx-auto px-5 md:px-10';

/* ─── Dados ────────────────────────────────────────────────────── */
const SEGMENTOS = [
  { v: 'comercio',       l: 'Comércio e varejo' },
  { v: 'alimentacao',    l: 'Alimentação (restaurante, lanchonete, padaria)' },
  { v: 'servicos_saude', l: 'Serviços e saúde (clínica, consultório, salão)' },
];

/* Mensagem de exemplo do mockup. *negrito*, _itálico_; `fonte` vira um link fictício em azul. */
type Linha = { t: string; fonte?: boolean; espaco?: boolean };
const MENSAGEM: Linha[] = [
  { t: '☀️ *Tá Sabendo AI* · Terça-feira, 27/10' },
  { t: '_Comércio e varejo · Vilhena/RO_' },
  { t: 'Bom dia, Carlos! Hoje tem 3 coisas que mexem com a sua empresa:', espaco: true },
  { t: '🏛️ *Notas do Simples passam pelo Emissor Nacional em novembro*', espaco: true },
  { t: 'Lojas no Simples vão emitir nota no sistema novo. Vale testar antes.', fonte: true },
  { t: '📍 *Prefeitura de Vilhena muda horário do comércio no fim de ano*', espaco: true },
  { t: 'Confira se a sua escala de dezembro bate com o novo horário.', fonte: true },
  { t: '📰 *75% dos consumidores apontam ofertas enganosas na Black Friday*', espaco: true },
  { t: 'Promoção clara evita reclamação e ganha cliente.', fonte: true },
  { t: '✅ *Pra fazer hoje:* revise as etiquetas das ofertas da Black Friday.', espaco: true },
];

const PASSOS = [
  { icon: UserPlus,   t: 'Você se cadastra em 30 segundos', d: 'Nome, WhatsApp e o segmento da sua empresa. Sem cartão.' },
  { icon: ScanSearch, t: 'A IA lê dezenas de fontes por você toda madrugada', d: 'Governo, portais de notícia e fontes do seu setor. Fica só o que mexe com o seu negócio.' },
  { icon: Sunrise,    t: 'Às 7h chega só o que importa pro seu negócio', d: 'Um resumo curto no WhatsApp, com o link da fonte em cada notícia.' },
];

const RECEBE = [
  { e: '🏛️', t: 'Governo',              d: 'Leis, impostos e prazos que valem para a sua empresa.' },
  { e: '📍', t: 'Vilhena e Rondônia',   d: 'O que a prefeitura e o estado decidem e muda o seu dia a dia.' },
  { e: '📰', t: 'Seu setor',            d: 'Notícias do comércio, da alimentação ou de serviços e saúde.' },
  { e: '✅', t: 'Pra fazer hoje',       d: 'Uma ação prática por dia, pra transformar a notícia em atitude.' },
];

const FAQ = [
  { q: 'Vai lotar meu WhatsApp?',        a: 'Não. É 1 mensagem por dia útil, às 7h, que se lê em 1 minuto.' },
  { q: 'De onde vêm as notícias?',       a: 'De portais de notícia, órgãos do governo e fontes do seu setor. Toda notícia tem o link da fonte.' },
  { q: 'Tem política?',                  a: 'Não. A gente ignora política partidária, crime e fofoca. Só entra o que muda algo prático no seu negócio.' },
  { q: 'Como cancelo?',                  a: 'Responde SAIR a qualquer momento.' },
  { q: 'Preciso cadastrar cartão?',      a: 'Não, o 1º mês é grátis e sem cartão.' },
];

/* ─── Utilidades (mesma lógica da /5x2) ─────────────────────────── */
const onlyDigits = (s: string) => s.replace(/\D/g, '');
function maskPhone(v: string) {
  // Ignora o 55 (Brasil) quando vier junto: "+55 69 99999-1454" → "(69) 99999-1454"
  let d = onlyDigits(v);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function getTracking() {
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => p.get(k) || '';
  return {
    origem: get('utm_source') || 'site',
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_content: get('utm_content'),
    referrer: document.referrer || '',
  };
}

declare global { interface Window { fbq?: (...args: unknown[]) => void } }
const fbqCall = (...args: unknown[]) => window.fbq?.(...args);
function loadPixel() {
  if (!META_PIXEL_ID || window.fbq) return;
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return; const n: any = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = b.createElement(e); t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  fbqCall('init', META_PIXEL_ID);
  fbqCall('track', 'PageView');
}

/* Evento personalizado disparado uma vez por visita (chave própria para não colidir com a /5x2) */
const eventosEnviados = new Set<string>();
function trackOnce(evento: string) {
  if (eventosEnviados.has(evento)) return;
  eventosEnviados.add(evento);
  try {
    const chave = `px_tasabendo_${evento}`;
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, '1');
  } catch { /* storage bloqueado */ }
  fbqCall('trackCustom', evento);
}

const scrollToForm = () =>
  document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ─── Componentes base ─────────────────────────────────────────── */
function SectionLabel({ n, children, dark = false }: { n: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="ts-mono text-[11px] uppercase tracking-[0.16em] whitespace-nowrap" style={{ color: dark ? T.darkMute : T.mute }}>
        {n} <span className="mx-1.5 opacity-50">/</span> {children}
      </span>
      <span className="flex-1 h-px" style={{ background: dark ? T.darkRule : T.rule }} />
    </div>
  );
}

const Arrow = ({ size = 17 }: { size?: number }) => <ArrowRight size={size} strokeWidth={1.75} className="ts-arrow" />;

function PrimaryBtn({ children, onClick, type = 'button', disabled = false, full = false }: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; full?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-tone="accent"
      className={`ts-btn inline-flex items-center justify-center gap-2.5 px-6 h-[54px] rounded-xl font-semibold text-[15.5px] disabled:opacity-60 disabled:cursor-not-allowed ${full ? 'w-full' : ''}`}>
      {children}
    </button>
  );
}

/* *negrito* e _itálico_ no estilo do WhatsApp */
function FormatoWA({ t }: { t: string }) {
  const partes = t.split(/(\*[^*]+\*|_[^_]+_)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <strong key={i} className="font-semibold">{p.slice(1, -1)}</strong>;
        if (p.length > 2 && p.startsWith('_') && p.endsWith('_')) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/* ─── Mockup do celular ────────────────────────────────────────── */
function Celular() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute -inset-6 rounded-[56px] blur-3xl opacity-30 pointer-events-none" style={{ background: GRAD }} />
      <div className="relative rounded-[44px] p-[10px]" style={{ background: '#111827', boxShadow: '0 40px 80px -30px rgba(15,23,42,0.55)' }}>
        <div className="relative rounded-[36px] overflow-hidden flex flex-col h-[640px]" style={{ background: '#EFEAE2' }}>
          {/* Barra de status */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[12px] font-semibold text-white" style={{ background: T.wa }}>
            <span>07:00</span>
            <span className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-6 rounded-full" style={{ background: '#111827' }} />
            <span className="flex items-center gap-1 text-[10px]">● ● ●</span>
          </div>
          {/* Cabeçalho da conversa */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 text-white" style={{ background: T.wa }}>
            <ArrowLeft size={18} />
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>☀️</span>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-[14.5px] font-semibold truncate">Tá Sabendo AI</div>
              <div className="text-[11.5px] opacity-90">online</div>
            </div>
            <Video size={18} /><Phone size={17} className="ml-2" /><MoreVertical size={18} className="ml-1" />
          </div>

          {/* Conversa */}
          <div className="ts-wa-chat flex-1 overflow-hidden px-3 py-3">
            <div className="mx-auto mb-3 w-fit rounded-md px-2.5 py-1 text-[11px] font-medium" style={{ background: '#FFFFFF', color: '#54656F' }}>
              HOJE
            </div>
            <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6, ease }}
              className="ts-wa-bubble max-w-[92%] rounded-lg rounded-tl-none px-2.5 pt-2 pb-1.5 text-[12.5px] leading-[1.42] shadow-sm"
              style={{ background: '#FFFFFF', color: '#111B21' }}>
              {MENSAGEM.map((l, i) => (
                <Fragment key={i}>
                  <p className={l.espaco ? 'mt-2' : ''}><FormatoWA t={l.t} /></p>
                  {l.fonte && <p><span className="underline" style={{ color: '#027EB5' }}>🔗 ler na fonte</span></p>}
                </Fragment>
              ))}
              <div className="flex items-center justify-end gap-1 mt-1 text-[10.5px]" style={{ color: '#667781' }}>
                07:00 <CheckCheck size={14} color="#53BDEB" />
              </div>
            </motion.div>
          </div>

          {/* Campo de digitação */}
          <div className="flex items-center gap-2 px-2 py-2" style={{ background: '#EFEAE2' }}>
            <div className="flex-1 flex items-center gap-2 rounded-full px-3 h-10 text-[13px]" style={{ background: '#FFFFFF', color: '#8696A0' }}>
              <Smile size={18} /> <span className="flex-1">Mensagem</span> <Paperclip size={17} /> <Camera size={17} />
            </div>
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: T.wa }}>
              <Mic size={18} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Formulário ───────────────────────────────────────────────── */
type CampoErro = 'nome' | 'whatsapp' | 'segmento' | 'aceite' | 'geral';
type Status = 'idle' | 'sending' | 'ok';

const MSG_ERRO: Record<Exclude<CampoErro, 'geral'>, string> = {
  nome: 'Informe seu nome.',
  whatsapp: 'Informe um WhatsApp válido com DDD.',
  segmento: 'Escolha o segmento da sua empresa.',
  aceite: 'Marque para receber o Tá Sabendo AI no WhatsApp.',
};

function Campo({ label, erro, children, className = '' }: { label: string; erro?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block ts-mono text-[10.5px] uppercase tracking-[0.14em] mb-2" style={{ color: T.darkMute }}>{label}</span>
      {children}
      {erro && <span className="block text-[13px] mt-1.5" style={{ color: '#FDBA74' }} role="alert">{erro}</span>}
    </label>
  );
}

function Formulario() {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [segmento, setSegmento] = useState('');
  const [cidade, setCidade] = useState('Vilhena');
  const [aceite, setAceite] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [erros, setErros] = useState<Partial<Record<CampoErro, string>>>({});

  const limpa = (c: CampoErro) => setErros(e => (e[c] || e.geral ? { ...e, [c]: undefined, geral: undefined } : e));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    const digits = onlyDigits(whats);

    const novos: Partial<Record<CampoErro, string>> = {};
    if (nome.trim().length < 2) novos.nome = MSG_ERRO.nome;
    if (digits.length < 10 || digits.length > 11) novos.whatsapp = MSG_ERRO.whatsapp;
    if (!segmento) novos.segmento = MSG_ERRO.segmento;
    if (!aceite) novos.aceite = MSG_ERRO.aceite;
    setErros(novos);
    if (Object.keys(novos).length) return;

    setStatus('sending');
    const payload = {
      nome: nome.trim(),
      whatsapp: digits,
      segmento,
      cidade: cidade.trim() || 'Vilhena',
      pagina: 'tasabendo',
      ...getTracking(),
      enviado_em: new Date().toISOString(),
    };

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let data: { ok?: boolean; erros?: unknown } | null = null;
      try { data = await res.json(); } catch { /* resposta sem corpo */ }

      if (res.ok && data?.ok !== false) {
        fbqCall('track', 'Lead', { content_name: 'tasabendo' });
        setStatus('ok');
        return;
      }
      if (Array.isArray(data?.erros) && data.erros.length) {
        const doServidor: Partial<Record<CampoErro, string>> = {};
        for (const c of data.erros as unknown[]) {
          if (c === 'nome' || c === 'whatsapp' || c === 'segmento') doServidor[c] = MSG_ERRO[c];
        }
        if (Object.keys(doServidor).length) { setErros(doServidor); setStatus('idle'); return; }
      }
      throw new Error(String(res.status));
    } catch {
      setErros({ geral: 'Não conseguimos concluir o cadastro agora. Tenta de novo em instantes.' });
      setStatus('idle');
    }
  };

  if (status === 'ok') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="py-4" role="status">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
          <Check size={22} strokeWidth={2.5} color="#4ADE80" />
        </div>
        <h3 className="ts-display text-[28px] md:text-[32px] leading-[1.12] mb-4" style={{ color: T.darkText }}>
          Pronto, {nome.trim().split(/\s+/)[0]}! Olha seu WhatsApp: a primeira edição já está chegando.
        </h3>
        <p className="text-[16px] leading-relaxed" style={{ color: T.darkMute }}>
          Salva o número nos contatos pra não perder nenhuma.
        </p>
      </motion.div>
    );
  }

  const field = 'ts-field w-full h-12 px-3.5 text-[16px]';

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Campo label="Nome" erro={erros.nome}>
        <input className={field} placeholder="Seu nome" value={nome} aria-invalid={!!erros.nome}
          onChange={e => { setNome(e.target.value); limpa('nome'); }} autoComplete="name" />
      </Campo>
      <Campo label="WhatsApp" erro={erros.whatsapp}>
        <input className={field} placeholder="(69) 99999-9999" value={whats} inputMode="tel" aria-invalid={!!erros.whatsapp}
          onChange={e => { setWhats(maskPhone(e.target.value)); limpa('whatsapp'); }} autoComplete="tel" />
      </Campo>
      <Campo label="Segmento" erro={erros.segmento}>
        <div className="relative">
          <select className={`${field} appearance-none pr-10`} aria-invalid={!!erros.segmento}
            style={{ color: segmento ? T.darkText : 'rgba(241,245,249,0.38)' }}
            value={segmento} onChange={e => { setSegmento(e.target.value); limpa('segmento'); }}>
            <option value="" disabled>Selecione</option>
            {SEGMENTOS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <ChevronDown size={16} strokeWidth={1.75} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" color={T.darkMute} />
        </div>
      </Campo>
      <Campo label="Cidade">
        <input className={field} value={cidade} onChange={e => setCidade(e.target.value)} autoComplete="address-level2" />
      </Campo>

      <div>
        <label className="flex items-start gap-3 text-[14px] leading-relaxed cursor-pointer select-none pt-1" style={{ color: T.darkText }}>
          <input type="checkbox" checked={aceite} onChange={e => { setAceite(e.target.checked); limpa('aceite'); }}
            className="mt-0.5 w-[18px] h-[18px] shrink-0 accent-indigo-500" aria-invalid={!!erros.aceite} />
          Aceito receber o Tá Sabendo AI no meu WhatsApp
        </label>
        {erros.aceite && <span className="block text-[13px] mt-1.5" style={{ color: '#FDBA74' }} role="alert">{erros.aceite}</span>}
      </div>

      <AnimatePresence>
        {erros.geral && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-[14px] leading-relaxed" style={{ color: '#FDBA74' }} role="alert">
            {erros.geral}{' '}
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Quero assinar o Tá Sabendo AI.')}`}
              target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: T.darkText }}>
              Ou chama a gente no WhatsApp
            </a>.
          </motion.p>
        )}
      </AnimatePresence>

      <PrimaryBtn type="submit" disabled={status === 'sending'} full>
        {status === 'sending'
          ? <><Loader2 size={17} className="animate-spin" /> Enviando...</>
          : <>Quero meu 1º mês grátis <Arrow /></>}
      </PrimaryBtn>
      <p className="text-center text-[12.5px]" style={{ color: T.darkMute }}>
        Sem cartão. Pra cancelar, é só responder SAIR.
      </p>
    </form>
  );
}

/* ─── Página ───────────────────────────────────────────────────── */
export default function TaSabendo() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const heroVisible = useInView(heroRef, { margin: '-40% 0px 0px 0px' });
  const formVisible = useInView(formRef, { margin: '0px 0px -20% 0px' });
  const showSticky = !heroVisible && !formVisible;

  useEffect(() => { loadPixel(); }, []);

  // ViuFormulario: quando 30% da seção do formulário aparece na tela
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { trackOnce('ViuFormulario'); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const load = (delay: number) => ({
    initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease },
  });

  return (
    <div className="ts min-h-screen overflow-x-clip" style={{ background: T.paper, color: T.ink }}>
      {/* Topo */}
      <header style={{ borderBottom: `1px solid ${T.rule}` }}>
        <div className={`${WRAP} h-16 flex items-center justify-between`}>
          <a href="/" className="flex items-center gap-2.5">
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-[17px] tracking-tight">Nexla</span>
          </a>
          <a href="/" className="ts-link inline-flex items-center gap-1.5 text-sm" style={{ color: T.mute }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> <span className="hidden sm:inline">Voltar ao site</span><span className="sm:hidden">Site</span>
          </a>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="pt-10 pb-20 md:pt-20 md:pb-28">
        <div className={`${WRAP} grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-16 items-center`}>
          <div>
            <motion.span {...load(0)} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', color: T.accent }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: GRAD }} />
              Tá Sabendo AI · by Nexla
            </motion.span>

            <motion.h1 {...load(0.06)} className="ts-display leading-[1.04] mb-6"
              style={{ fontSize: 'clamp(38px,5.6vw,68px)' }}>
              O que muda na sua empresa, <span className="text-gradient">todo dia às 7h</span> no seu WhatsApp.
            </motion.h1>

            <motion.p {...load(0.14)} className="text-[17px] md:text-[18px] leading-[1.6] max-w-[34rem] mb-9" style={{ color: T.ink2 }}>
              Leis, impostos, prazos e notícias do seu setor, resumidos por IA em{' '}
              <strong className="font-semibold" style={{ color: T.ink }}>menos de 1 minuto</strong>. Sem precisar assistir noticiário.
            </motion.p>

            <motion.div {...load(0.22)}>
              <PrimaryBtn onClick={scrollToForm}>Quero meu 1º mês grátis <Arrow /></PrimaryBtn>
              <p className="text-[13.5px] mt-3.5" style={{ color: T.mute }}>Sem cartão. Pra cancelar, é só responder SAIR.</p>
            </motion.div>
          </div>

          <motion.div {...load(0.3)}>
            <Celular />
          </motion.div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section id="cadastro" ref={formRef} className="ts-dark py-20 md:py-28 scroll-mt-4" style={{ background: T.dark, color: T.darkText }}>
        <div className={WRAP}>
          <SectionLabel n="01" dark>Cadastro</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-20 items-start">
            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}>
              <h2 className="ts-display leading-[1.06] mb-5" style={{ fontSize: 'clamp(32px,4.4vw,52px)' }}>
                Cadastre seu WhatsApp. <span className="ts-grad-light">O 1º mês é grátis.</span>
              </h2>
              <p className="text-[17px] leading-[1.65] mb-8" style={{ color: T.darkMute }}>
                Leva 30 segundos. A primeira edição chega no seu WhatsApp.
              </p>
              <ul className="space-y-3.5">
                {['1 mensagem por dia útil, às 7h', 'Toda notícia com o link da fonte', 'Sem cartão. Pra cancelar, responde SAIR'].map(t => (
                  <li key={t} className="flex items-center gap-3 text-[15px]" style={{ color: T.darkText }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      <Check size={13} strokeWidth={2.5} color="#4ADE80" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
              className="relative rounded-2xl p-5 sm:p-7 md:p-8 overflow-hidden" style={{ background: T.dark2, border: `1px solid ${T.darkRule}` }}>
              <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: GRAD }} />
              <Formulario />
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 md:py-28">
        <div className={WRAP}>
          <SectionLabel n="02">Como funciona</SectionLabel>
          <motion.h2 initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="ts-display leading-[1.08] max-w-[40rem] mb-12" style={{ fontSize: 'clamp(30px,4vw,48px)' }}>
            Você dorme. A IA lê. <span className="text-gradient">Às 7h, você já sabe.</span>
          </motion.h2>
          <motion.ol initial="hidden" whileInView="show" viewport={vp}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="grid md:grid-cols-3 gap-4 md:gap-5">
            {PASSOS.map((p, i) => (
              <motion.li key={p.t} variants={fadeUp} className="relative rounded-2xl p-6 md:p-7"
                style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 20px 44px -34px rgba(15,23,42,0.35)' }}>
                <div className="flex items-center justify-between mb-6">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: GRAD }}>
                    <p.icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="ts-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: T.mute }}>Passo {i + 1}</span>
                </div>
                <h3 className="ts-display text-[22px] leading-tight mb-2.5">{p.t}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: T.ink2 }}>{p.d}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* O QUE VOCÊ RECEBE */}
      <section className="py-20 md:py-28" style={{ background: T.paper2 }}>
        <div className={WRAP}>
          <SectionLabel n="03">O que você recebe</SectionLabel>
          <motion.h2 initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="ts-display leading-[1.08] max-w-[40rem] mb-12" style={{ fontSize: 'clamp(30px,4vw,48px)' }}>
            Só o que mexe com a sua empresa.
          </motion.h2>
          <motion.div initial="hidden" whileInView="show" viewport={vp}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RECEBE.map(r => (
              <motion.div key={r.t} variants={fadeUp} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <span className="block text-[30px] leading-none mb-5" aria-hidden>{r.e}</span>
                <h3 className="ts-display text-[21px] leading-tight mb-2">{r.t}</h3>
                <p className="text-[14.5px] leading-relaxed" style={{ color: T.ink2 }}>{r.d}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PREÇO */}
      <section className="py-20 md:py-28">
        <div className={WRAP}>
          <SectionLabel n="04">Preço</SectionLabel>
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="relative rounded-3xl overflow-hidden p-7 sm:p-10 md:p-14 grid lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 items-center"
            style={{ background: T.dark, color: T.darkText }}>
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: GRAD }} />
            <div className="relative">
              <h2 className="ts-display leading-[1.06] mb-5" style={{ fontSize: 'clamp(32px,4.6vw,56px)' }}>
                1º mês grátis. <span className="ts-grad-light">Depois, R$ 9,99 por mês.</span>
              </h2>
              <p className="text-[17px] leading-[1.65] max-w-[34rem]" style={{ color: T.darkMute }}>
                Antes de acabar o mês grátis, a gente te avisa. Você só continua se quiser.
              </p>
            </div>
            <div className="relative ts-dark">
              <PrimaryBtn onClick={scrollToForm} full>Quero meu 1º mês grátis <Arrow /></PrimaryBtn>
              <p className="text-center text-[13px] mt-3" style={{ color: T.darkMute }}>Sem cartão. Pra cancelar, é só responder SAIR.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 md:pb-32">
        <div className={WRAP}>
          <SectionLabel n="05">Dúvidas</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-20 items-start">
            <div>
              <h2 className="ts-display leading-[1.08] mb-5" style={{ fontSize: 'clamp(30px,3.8vw,46px)' }}>
                Perguntas frequentes
              </h2>
              <p className="text-[15px] leading-relaxed mb-5" style={{ color: T.ink2 }}>
                Não achou sua resposta? Chama a gente.
              </p>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
                className="ts-link inline-flex items-center gap-3 rounded-xl pl-2 pr-4 py-2 transition-colors hover:bg-white"
                style={{ border: `1px solid ${T.rule}` }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>
                  <MessageCircle size={18} strokeWidth={1.75} />
                </span>
                <span className="text-[15px] font-semibold" style={{ color: T.ink }}>Falar no WhatsApp</span>
                <Arrow size={15} />
              </a>
            </div>

            <div className="space-y-3">
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="rounded-2xl overflow-hidden"
                    style={{
                      background: open ? T.card : 'transparent',
                      border: `1px solid ${open ? 'rgba(79,70,229,0.25)' : T.rule}`,
                      boxShadow: open ? '0 20px 44px -26px rgba(79,70,229,0.45)' : 'none',
                      transition: 'background-color 250ms ease, border-color 250ms ease, box-shadow 250ms ease',
                    }}>
                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}
                      className="w-full flex items-center justify-between gap-6 text-left px-5 md:px-6 py-5">
                      <span className="ts-display text-[18px] md:text-[20px] leading-snug" style={{ color: T.ink }}>{f.q}</span>
                      <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
                        style={{
                          background: open ? T.accent : 'transparent', color: open ? '#FFFFFF' : T.ink,
                          border: `1px solid ${open ? T.accent : T.rule}`, transition: 'background-color 200ms ease, color 200ms ease',
                        }}>
                        <Plus size={15} strokeWidth={2} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease }} className="overflow-hidden">
                          <p className="px-5 md:px-6 pb-6 pr-14 text-[16px] leading-relaxed" style={{ color: T.ink2 }}>{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="pt-10 pb-28 md:pb-10 px-6" style={{ background: '#1E1B4B', borderTop: '1px solid rgba(237,233,254,0.1)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3">
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="Nexla" className="w-12 h-12 object-contain opacity-90" />
            <span className="ts-display text-2xl" style={{ color: '#EDE9FE', letterSpacing: 'normal' }}>Nexla</span>
          </a>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm font-medium" style={{ color: 'rgba(237,233,254,0.7)' }}>
            <a href="/" className="inline-flex items-center gap-2 hover:text-white transition-colors"><Globe size={16} /> nexla.com.br</a>
            <a href="https://www.instagram.com/nexla_ia/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"><Instagram size={16} /> @nexla_ia</a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"><MessageCircle size={16} /> (69) 99930-0101</a>
          </div>
          <p className="text-xs" style={{ color: 'rgba(167,139,250,0.45)' }}>
            Tá Sabendo AI é um produto da Nexla · Vilhena, RO
          </p>
        </div>
      </footer>

      {/* CTA fixo no celular */}
      <AnimatePresence>
        {showSticky && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ duration: 0.35, ease }}
            className="fixed bottom-0 inset-x-0 z-40 p-3 md:hidden"
            style={{ background: 'rgba(241,245,249,0.94)', borderTop: `1px solid ${T.rule}`, backdropFilter: 'blur(8px)' }}>
            <PrimaryBtn onClick={scrollToForm} full>Quero meu 1º mês grátis <Arrow /></PrimaryBtn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
