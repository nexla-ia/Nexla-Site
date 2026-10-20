import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, animate } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, ChevronDown, Loader2, MessageCircle, Plus, Trophy, Mic, Briefcase } from 'lucide-react';

/* ─── Configuração da campanha ───────────────────────────────────
 * WEBHOOK_URL  → crie no n8n um Webhook (POST) com esse caminho.
 * META_PIXEL_ID → cole o ID do Pixel do Meta para medir os leads
 *                 dos anúncios (deixe vazio para desligar).        */
const WEBHOOK_URL   = 'https://n8n.nexladesenvolvimento.com.br/webhook/5x2';
const META_PIXEL_ID: string = '';
const WHATSAPP      = '556999300101';

/* ─── Paleta (a mesma do site nexla.com.br) ─────────────────────────────────────────── */
const T = {
  paper: '#F1F5F9', paper2: '#E7ECF4', card: '#FFFFFF',
  ink: '#0F172A', ink2: '#1E293B', mute: '#475569', rule: 'rgba(15,23,42,0.10)',
  accent: '#4F46E5', violet: '#7C3AED', loss: '#F97316',
  dark: '#0F172A', dark2: '#1E293B', darkText: '#F1F5F9',
  darkMute: 'rgba(241,245,249,0.68)', darkRule: 'rgba(241,245,249,0.12)',
} as const;

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const vp = { once: true, margin: '-60px' } as const;
const WRAP = 'max-w-[1180px] mx-auto px-5 md:px-10';

/* ─── Dados ────────────────────────────────────────────────────── */
const SEGMENTOS = [
  'Comércio / varejo', 'Restaurante / alimentação', 'Saúde / clínica',
  'Serviços', 'Automotivo / autopeças', 'Construção', 'Indústria', 'Outro',
];

const PROBLEMAS = [
  { t: 'Sobrecarregar a equipe', d: 'Mesma demanda em menos horas. Aumenta o erro, o estresse e a rotatividade.' },
  { t: 'Contratar no desespero', d: 'Folha maior, encargos e tempo de treinamento, justo no período de adaptação.' },
  { t: 'Perder cliente no atendimento', d: 'Mensagem sem resposta no WhatsApp vira venda para o concorrente.' },
];

const AUTOMATIZAVEL = [
  { title: 'Atendimento no WhatsApp', pessoa: 'Carla, atendente', avatar: '/avatares/atendimento.svg', horas: 16,
    desc: 'Responder dúvidas, preço, horário e status de pedido, 24h por dia.',        hl: '24h por dia' },
  { title: 'Agendamentos',            pessoa: 'Júlia, recepção',  avatar: '/avatares/agenda.svg',      horas: 10,
    desc: 'Marcar, confirmar e lembrar o cliente sem ninguém no telefone.',             hl: 'sem ninguém no telefone' },
  { title: 'Orçamentos e cobranças',  pessoa: 'Roberto, comercial', avatar: '/avatares/orcamento.svg', horas: 8,
    desc: 'Enviar orçamento, follow-up e lembrete de pagamento automaticamente.',       hl: 'automaticamente' },
  { title: 'Planilhas e relatórios',  pessoa: 'Marcos, administrativo', avatar: '/avatares/planilhas.svg', horas: 6,
    desc: 'Dados que se atualizam sozinhos e relatório pronto no seu WhatsApp.',       hl: 'se atualizam sozinhos' },
];
/* Avatares: estilo "Avataaars" de Pablo Stanley via DiceBear (uso comercial liberado), salvos em public/avatares */
/* Lógica do gráfico: todos ganham 1 salário mínimo.
 * Hoje: 44h por semana. Com a 5×2: 40h pelo MESMO salário → 4h/semana pagas e não trabalhadas.
 * Valor perdido por funcionário = salário × 4 ÷ 44. A barra mostra a semana de 44h dividida em:
 * tarefa repetitiva (a IA assume) · resto do trabalho · 4h perdidas com a 5×2. */
const SALARIO_MINIMO = 1621; // 2026 — Decreto 12.797/2025
const JORNADA_HOJE   = 44;
const JORNADA_NOVA   = 40;
const HORAS_PERDIDAS = JORNADA_HOJE - JORNADA_NOVA;
const PERDA_MES      = Math.round(SALARIO_MINIMO * HORAS_PERDIDAS / JORNADA_HOJE); // R$ por funcionário
const TOTAL_HORAS    = AUTOMATIZAVEL.reduce((s, a) => s + a.horas, 0);            // horas que a automação devolve
const TOTAL_PERDIDAS = HORAS_PERDIDAS * AUTOMATIZAVEL.length;                     // horas que a 5×2 tira
const TOTAL_PERDA    = PERDA_MES * AUTOMATIZAVEL.length;
const SALDO_HORAS    = TOTAL_HORAS - TOTAL_PERDIDAS;                           // o que sobra a favor da empresa
const fmtReal = (n: number) => n.toLocaleString('pt-BR');

/* Realça o trecho `hl` dentro de `text` com efeito marca-texto */
function Realce({ text, hl, light = false }: { text: string; hl: string; light?: boolean }) {
  const i = text.indexOf(hl);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className={light ? 'lp-mark-light' : 'lp-mark'}>{hl}</mark>{text.slice(i + hl.length)}</>;
}

const MODULOS = [
  { n: '01', title: 'Mapeie as horas que vão faltar', desc: 'Descubra onde sua equipe gasta tempo com tarefa repetitiva e o que dá para tirar dela.' },
  { n: '02', title: 'Atendimento com IA no WhatsApp', desc: 'Monte um agente que responde, qualifica e agenda clientes com o jeito da sua empresa.' },
  { n: '03', title: 'Rotinas de escritório no automático', desc: 'Planilhas, relatórios e avisos rodando sozinhos, com IA lendo documentos por você.' },
  { n: '04', title: 'Seu plano de transição para a 5×2', desc: 'Reorganize escalas e processos para atravessar a mudança sem sobrecarregar ninguém.' },
];

const CREDENCIAIS = [
  { pre: 'Top ', n: 10,   suf: '',  icon: Trophy,    t: 'mundial no NASA Space Apps Challenge, com a equipe Nexla.' },
  { pre: '',     n: 1000, suf: '+', icon: Mic,       t: 'pessoas na plateia. Palestrante para grandes públicos.' },
  { pre: '',     n: 30,   suf: '+', icon: Briefcase, t: 'projetos entregues e 15+ clientes recorrentes.' },
];

const FAQ = [
  { q: 'O pré-cadastro é pago?', hl: 'gratuito e não te compromete com nada',
    a: 'Não. Entrar na lista é gratuito e não te compromete com nada. Você recebe as novidades primeiro e uma condição especial no lançamento.' },
  { q: 'Preciso saber programar?', hl: 'ferramentas visuais',
    a: 'Não. O curso é feito para dono de empresa e equipe administrativa. Você aprende a montar as automações com ferramentas visuais.' },
  { q: 'Quando começa a primeira turma?', hl: 'primeiro para quem estiver na lista',
    a: 'A data será anunciada primeiro para quem estiver na lista, pelo WhatsApp.' },
  { q: 'E se eu não quiser montar sozinho?', hl: 'monta para você',
    a: 'Sem problema. No formulário, marque que prefere que a Nexla implemente. A gente faz o diagnóstico e monta para você.' },
];

const RODAPE_LINKS: { label: string; href: string; externo?: boolean }[] = [
  { label: 'Serviços',      href: '/#servicos' },
  { label: 'Como Funciona', href: '/#como-funciona' },
  { label: 'Experimente',   href: '/#experimente' },
  { label: 'Cases',         href: '/#cases' },
  { label: 'Depoimentos',   href: '/#depoimentos' },
  { label: 'Diferenciais',  href: '/#diferenciais' },
  { label: 'Sobre',         href: '/#sobre' },
  { label: 'Instagram',     href: 'https://www.instagram.com/nexla_ia/', externo: true },
];

/* ─── Utilidades ───────────────────────────────────────────────── */
const onlyDigits = (s: string) => s.replace(/\D/g, '');
function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const fmt = (n: number, dec = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function getTracking() {
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => p.get(k) || '';
  return {
    origem: get('utm_source') || get('src') || (document.referrer ? 'referencia' : 'direto'),
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

/* ─── Componentes base ─────────────────────────────────────────── */
function SectionLabel({ n, children, dark = false }: { n: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="lp-mono text-[11px] uppercase tracking-[0.16em] whitespace-nowrap" style={{ color: dark ? T.darkMute : T.mute }}>
        {n} <span className="mx-1.5 opacity-50">/</span> {children}
      </span>
      <span className="flex-1 h-px" style={{ background: dark ? T.darkRule : T.rule }} />
    </div>
  );
}

function PrimaryBtn({ children, onClick, type = 'button', disabled = false, full = false, tone = 'accent' }: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit';
  disabled?: boolean; full?: boolean; tone?: 'accent' | 'light';
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-tone={tone}
      className={`lp-btn inline-flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-[6px] font-medium text-[15px] disabled:opacity-40 disabled:cursor-not-allowed ${full ? 'w-full' : ''}`}>
      {children}
    </button>
  );
}

/* Número que conta de 0 até `to` quando entra na tela */
function CountUp({ to, pre = '', suf = '' }: { to: number; pre?: string; suf?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: n => setV(Math.round(n)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{pre}{fmt(v)}{suf}</span>;
}

const SEG_TAREFA = 'linear-gradient(90deg, #818CF8, #A78BFA)';

/* Barra de "carregamento" que enche até `pct` quando entra na tela */
function Barra({ pct, delay = 0.2, cor = 'laranja' }: { pct: number; delay?: number; cor?: 'laranja' | 'roxo' }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  return (
    <div ref={ref} className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(241,245,249,0.08)' }}>
      <motion.div className="h-full rounded-full"
        style={{ background: cor === 'roxo' ? SEG_TAREFA : 'linear-gradient(90deg, #F97316, #FB923C)' }}
        initial={{ width: 0 }} animate={{ width: inView ? `${pct}%` : 0 }} transition={{ duration: 1.4, delay, ease }} />
    </div>
  );
}

/* Semana de trabalho: `horas` preenchidas (de 44) + `perdidas` hachuradas em laranja */
function BarraJornada({ rotulo, horas, perdidas = 0 }: { rotulo: string; horas: number; perdidas?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const pct = (h: number) => `${(h / JORNADA_HOJE) * 100}%`;
  return (
    <div ref={ref} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 text-[13px]">
      <span style={{ color: T.darkMute }}>{rotulo}</span>
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px]" style={{ background: 'rgba(241,245,249,0.06)' }}>
        <motion.div className="h-full" style={{ background: 'rgba(241,245,249,0.35)' }}
          initial={{ width: 0 }} animate={{ width: inView ? pct(horas) : 0 }} transition={{ duration: 1, delay: 0.1, ease }} />
        {perdidas > 0 && (
          <motion.div className="h-full lp-hatch"
            initial={{ width: 0 }} animate={{ width: inView ? pct(perdidas) : 0 }} transition={{ duration: 0.6, delay: 1.1, ease }} />
        )}
      </div>
      <span className="lp-num text-right" style={{ color: T.darkText }}>
        <strong>{horas}h</strong>{perdidas > 0 && <span style={{ color: '#FB923C' }}> −{perdidas}h</span>}
      </span>
    </div>
  );
}

/* Passo numerado da explicação (1 → 2 → 3), ligado por uma linha vertical */
function Passo({ n, titulo, ultimo = false, children }: { n: number; titulo: string; ultimo?: boolean; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="relative grid grid-cols-[2.25rem_1fr] gap-x-4">
      <div className="flex flex-col items-center">
        <span className="w-9 h-9 rounded-full flex items-center justify-center lp-serif text-[16px] shrink-0"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#FFFFFF' }}>{n}</span>
        {!ultimo && <span className="flex-1 w-px my-2" style={{ background: 'rgba(241,245,249,0.12)' }} />}
      </div>
      <div className={ultimo ? '' : 'pb-10'}>
        <h3 className="lp-serif text-[22px] md:text-[24px] leading-tight mb-3 pt-1">{titulo}</h3>
        {children}
      </div>
    </motion.div>
  );
}

const Arrow = ({ size = 17 }: { size?: number }) => <ArrowRight size={size} strokeWidth={1.75} className="lp-arrow" />;

const scrollToForm = () =>
  document.getElementById('lista')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ─── Calculadora ──────────────────────────────────────────────── */
function Calculadora({ funcionarios, setFuncionarios, horas, setHoras }: {
  funcionarios: number; setFuncionarios: (n: number) => void;
  horas: number; setHoras: (n: number) => void;
}) {
  const fase1 = funcionarios * Math.max(0, horas - 42);
  const final = funcionarios * Math.max(0, horas - 40);
  const pessoas = final / 40;
  const mes = final * 4.33;
  const capHoje = funcionarios * horas;
  const capDepois = funcionarios * Math.min(horas, 40);
  const pctDepois = capHoje ? (capDepois / capHoje) * 100 : 100;
  const sliderPct = ((funcionarios - 1) / 99) * 100;
  const pessoasTxt = fmt(pessoas, Number.isInteger(pessoas) || pessoas >= 10 ? 0 : 1);
  const jornadas = [
    { h: 44, d: 'Mais comum hoje' },
    { h: 42, d: '' },
    { h: 40, d: 'Já no novo limite' },
  ];

  return (
    <div className="rounded-2xl p-6 md:p-8"
      style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 30px 70px -40px rgba(79,70,229,0.35), 0 1px 0 rgba(15,23,42,0.04)' }}>
      <h3 className="lp-serif text-[24px] md:text-[27px] leading-[1.15] mb-2" style={{ color: T.ink }}>
        Quantas horas de trabalho sua empresa vai perder?
      </h3>
      <p className="text-[15px] leading-relaxed mb-7" style={{ color: T.mute }}>
        Responda duas perguntas e veja o impacto na hora.
      </p>

      {/* Pergunta 1 */}
      <label className="block mb-7">
        <div className="flex items-end justify-between gap-4 mb-2">
          <span className="text-[15px] font-semibold leading-snug" style={{ color: T.ink }}>
            <span style={{ color: T.accent }}>1.</span> Quantos funcionários com carteira assinada você tem?
          </span>
          <span className="lp-serif lp-num text-[34px] leading-none shrink-0" style={{ color: T.accent }}>
            {funcionarios}{funcionarios === 100 ? '+' : ''}
          </span>
        </div>
        <input type="range" min={1} max={100} value={funcionarios}
          onChange={e => setFuncionarios(Number(e.target.value))}
          className="lp-range" style={{ ['--p' as string]: `${sliderPct}%` }} aria-label="Número de funcionários" />
        <div className="flex justify-between text-[12px]" style={{ color: T.mute }}>
          <span>1 pessoa</span><span>100 ou mais</span>
        </div>
      </label>

      {/* Pergunta 2 */}
      <div className="mb-8">
        <span className="block text-[15px] font-semibold leading-snug mb-3" style={{ color: T.ink }}>
          <span style={{ color: T.accent }}>2.</span> Quantas horas por semana cada um trabalha hoje?
        </span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {jornadas.map(j => {
            const on = horas === j.h;
            return (
              <button key={j.h} type="button" role="radio" aria-checked={on} onClick={() => setHoras(j.h)}
                className="rounded-xl py-3 px-2 text-center transition-all"
                style={{
                  background: on ? 'rgba(79,70,229,0.08)' : T.card,
                  border: `1.5px solid ${on ? T.accent : T.rule}`,
                  boxShadow: on ? '0 4px 14px rgba(79,70,229,0.15)' : 'none',
                }}>
                <span className="block lp-serif lp-num text-[22px] leading-none" style={{ color: on ? T.accent : T.ink }}>{j.h}h</span>
                <span className="block text-[11px] mt-1.5 leading-tight min-h-[14px]" style={{ color: T.mute }}>{j.d}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultado */}
      {final > 0 ? (
        <div className="rounded-xl p-5 md:p-6" style={{ background: T.paper, border: `1px solid ${T.rule}` }}>
          <p className="text-[13.5px] mb-1.5" style={{ color: T.mute }}>
            Com a jornada de 40h, sua empresa perde
          </p>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <motion.span key={final} initial={{ opacity: 0.35, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
              className="lp-serif lp-num leading-none" style={{ fontSize: 'clamp(42px,5.4vw,54px)', color: T.loss }}>
              {fmt(final)}h
            </motion.span>
            <span className="text-[15px] font-medium" style={{ color: T.ink2 }}>por semana</span>
          </div>

          {/* Capacidade que sobra */}
          <div className="mt-5" aria-hidden>
            <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(249,115,22,0.25)' }}>
              <motion.div animate={{ width: `${pctDepois}%` }} transition={{ duration: 0.5, ease }}
                className="rounded-full" style={{ background: `linear-gradient(90deg, ${T.accent}, ${T.violet})` }} />
            </div>
          </div>
          <p className="text-[12.5px] mt-2" style={{ color: T.mute }}>
            <span className="lp-num font-semibold" style={{ color: T.loss }}>{fmt(100 - pctDepois)}%</span> menos tempo de trabalho na equipe
          </p>

          <div className={`grid ${fase1 > 0 ? 'grid-cols-3' : 'grid-cols-2'} mt-5 pt-5`} style={{ borderTop: `1px solid ${T.rule}` }}>
            {[
              { v: pessoasTxt, l: pessoas >= 2 ? 'funcionários a menos' : 'funcionário a menos' },
              { v: `${fmt(mes)}h`, l: 'a menos por mês' },
              ...(fase1 > 0 ? [{ v: `${fmt(fase1)}h`, l: 'já na 1ª etapa (42h)' }] : []),
            ].map((s, i) => (
              <div key={s.l} className={i ? 'pl-3 md:pl-4' : 'pr-3'} style={i ? { borderLeft: `1px solid ${T.rule}` } : undefined}>
                <div className="lp-serif lp-num text-[20px] md:text-[22px] leading-none" style={{ color: T.ink }}>{s.v}</div>
                <div className="text-[11.5px] leading-tight mt-1.5" style={{ color: T.mute }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5 md:p-6" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <p className="lp-serif text-[22px] leading-tight mb-2" style={{ color: T.ink }}>Sua jornada já está no novo limite.</p>
          <p className="text-[15px] leading-relaxed" style={{ color: T.ink2 }}>
            A 5×2 não tira horas da sua equipe. Mesmo assim, automatizar o trabalho repetitivo libera tempo para vender e atender melhor.
          </p>
        </div>
      )}

      <div className="mt-6">
        <PrimaryBtn onClick={scrollToForm} full>
          {final > 0 ? 'Quero cobrir essas horas' : 'Quero ganhar tempo com IA'} <Arrow />
        </PrimaryBtn>
      </div>
    </div>
  );
}

/* ─── Formulário ───────────────────────────────────────────────── */
type Interesse = 'aprender' | 'implementar' | 'indefinido' | '';
type Status = 'idle' | 'sending' | 'ok' | 'error';

function Campo({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block lp-mono text-[10.5px] uppercase tracking-[0.14em] mb-2" style={{ color: T.darkMute }}>{label}</span>
      {children}
    </label>
  );
}

function Formulario({ funcionarios, horas }: { funcionarios: number; horas: number }) {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [segmento, setSegmento] = useState('');
  const [qtd, setQtd] = useState(String(funcionarios));
  const [interesse, setInteresse] = useState<Interesse>('');
  const [aceite, setAceite] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [erro, setErro] = useState('');
  const touchedQtd = useRef(false);

  // Acompanha a calculadora até a pessoa editar o campo à mão
  useEffect(() => { if (!touchedQtd.current) setQtd(String(funcionarios)); }, [funcionarios]);

  const waLink = useMemo(() => {
    const txt = `Olá! Sou ${nome || '...'}${empresa ? ` da ${empresa}` : ''}. Vi a página da escala 5×2 e quero ${
      interesse === 'implementar' ? 'que a Nexla automatize minha empresa' : 'saber mais sobre o curso'}.`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`;
  }, [nome, empresa, interesse]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = onlyDigits(whats);
    if (nome.trim().length < 2) return setErro('Informe seu nome.');
    if (digits.length < 10) return setErro('Informe um WhatsApp válido com DDD.');
    if (!empresa.trim()) return setErro('Informe o nome da empresa.');
    if (!interesse) return setErro('Escolha como você prefere resolver.');
    if (!aceite) return setErro('Confirme que aceita receber nosso contato.');
    setErro('');
    setStatus('sending');

    const n = Number(qtd) || 0;
    const payload = {
      nome: nome.trim(),
      whatsapp: digits.length <= 11 ? `55${digits}` : digits,
      empresa: empresa.trim(),
      segmento,
      funcionarios: n,
      jornada_atual: horas,
      horas_perdidas_semana: n * Math.max(0, horas - 40),
      interesse,
      pagina: '5x2',
      enviado_em: new Date().toISOString(),
      ...getTracking(),
    };

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      fbqCall('track', 'Lead', { content_name: 'precadastro-5x2' });
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  };

  const field = 'lp-field w-full h-12 rounded-[4px] px-3.5 text-[15px]';

  if (status === 'ok' || status === 'error') {
    const ok = status === 'ok';
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="py-4">
        <div className="w-11 h-11 rounded-[6px] flex items-center justify-center mb-6"
          style={{ border: `1px solid ${T.darkRule}`, color: ok ? '#4ADE80' : '#FDBA74' }}>
          {ok ? <Check size={22} strokeWidth={2} /> : <MessageCircle size={20} strokeWidth={1.75} />}
        </div>
        <h3 className="lp-serif text-[30px] md:text-[34px] leading-[1.1] mb-3" style={{ color: T.darkText }}>
          {ok ? `Pronto, ${nome.split(' ')[0]}. Você está na lista.` : 'Quase lá. Finalize pelo WhatsApp.'}
        </h3>
        <p className="max-w-md leading-relaxed mb-8" style={{ color: T.darkMute }}>
          {ok
            ? interesse === 'implementar'
              ? 'Como você prefere que a Nexla implemente, nossa equipe vai te chamar no WhatsApp para o diagnóstico. Se quiser adiantar, é só clicar abaixo.'
              : 'Você vai receber as novidades do curso e a condição especial de lançamento direto no seu WhatsApp.'
            : 'Não conseguimos registrar seu cadastro agora. Clique abaixo e mande a mensagem pronta para garantir sua vaga na lista.'}
        </p>
        {(!ok || interesse === 'implementar') && (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="lp-btn inline-flex items-center gap-2.5 px-6 h-[52px] rounded-[6px] font-medium text-[15px]" data-tone="light">
            <MessageCircle size={17} strokeWidth={1.75} /> Falar no WhatsApp <Arrow />
          </a>
        )}
      </motion.div>
    );
  }

  const opcoes: { v: Interesse; t: string; d: string }[] = [
    { v: 'aprender',    t: 'Quero aprender a montar',   d: 'Entrar na lista do curso' },
    { v: 'implementar', t: 'Prefiro que a Nexla monte', d: 'Diagnóstico e implantação' },
    { v: 'indefinido',  t: 'Ainda não sei',             d: 'Quero entender melhor' },
  ];

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo label="Nome">
          <input className={field} placeholder="Seu nome" value={nome}
            onChange={e => setNome(e.target.value)} autoComplete="name" />
        </Campo>
        <Campo label="WhatsApp">
          <input className={field} placeholder="(00) 00000-0000" value={whats} inputMode="tel"
            onChange={e => setWhats(maskPhone(e.target.value))} autoComplete="tel" />
        </Campo>
        <Campo label="Empresa" className="sm:col-span-2">
          <input className={field} placeholder="Nome da empresa" value={empresa}
            onChange={e => setEmpresa(e.target.value)} autoComplete="organization" />
        </Campo>
        <Campo label="Segmento">
          <div className="relative">
            <select className={`${field} appearance-none pr-10`} style={{ color: segmento ? T.darkText : 'rgba(241,245,249,0.38)' }}
              value={segmento} onChange={e => setSegmento(e.target.value)}>
              <option value="" disabled>Selecione</option>
              {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={16} strokeWidth={1.75} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" color={T.darkMute} />
          </div>
        </Campo>
        <Campo label="Funcionários com carteira">
          <input type="number" min={0} className={`${field} lp-num`} value={qtd}
            onChange={e => { touchedQtd.current = true; setQtd(e.target.value); }} />
        </Campo>
      </div>

      <fieldset>
        <legend className="block lp-mono text-[10.5px] uppercase tracking-[0.14em] mb-2" style={{ color: T.darkMute }}>
          Como você prefere resolver?
        </legend>
        <div className="space-y-2" role="radiogroup">
          {opcoes.map(o => {
            const on = interesse === o.v;
            return (
              <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setInteresse(o.v)}
                className="w-full flex items-center gap-3.5 text-left rounded-[10px] px-4 py-3.5 transition-colors"
                style={{
                  background: on ? 'rgba(79,70,229,0.16)' : 'transparent',
                  border: `1px solid ${on ? '#818CF8' : T.darkRule}`,
                }}>
                <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                  style={{ border: `1.5px solid ${on ? '#818CF8' : 'rgba(241,245,249,0.35)'}` }}>
                  {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className="w-2 h-2 rounded-full" style={{ background: '#818CF8' }} />}
                </span>
                <span className="flex-1 text-[15px] font-medium" style={{ color: T.darkText }}>{o.t}</span>
                <span className="hidden sm:block text-[13px]" style={{ color: T.darkMute }}>{o.d}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-[13px] leading-relaxed cursor-pointer select-none" style={{ color: T.darkMute }}>
        <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-stone-200" />
        Aceito receber contato da Nexla pelo WhatsApp sobre o curso e os serviços. Seus dados não são compartilhados.
      </label>

      <AnimatePresence>
        {erro && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-sm" style={{ color: '#FDBA74' }} role="alert">
            {erro}
          </motion.p>
        )}
      </AnimatePresence>

      <PrimaryBtn type="submit" disabled={status === 'sending' || !aceite} full tone="accent">
        {status === 'sending'
          ? <><Loader2 size={17} className="animate-spin" /> Enviando…</>
          : <>Quero entrar na lista <Arrow /></>}
      </PrimaryBtn>
    </form>
  );
}

/* ─── Página ───────────────────────────────────────────────────── */
export default function Landing5x2() {
  const [funcionarios, setFuncionarios] = useState(10);
  const [horas, setHoras] = useState(44);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const heroRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const heroVisible = useInView(heroRef, { margin: '-40% 0px 0px 0px' });
  const formVisible = useInView(formRef, { margin: '0px 0px -20% 0px' });
  const showSticky = !heroVisible && !formVisible;
  const perdaSemana = funcionarios * Math.max(0, horas - 40);

  useEffect(() => { loadPixel(); }, []);

  const load = (delay: number) => ({
    initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease },
  });

  return (
    <div className="lp min-h-screen overflow-x-clip" style={{ background: T.paper, color: T.ink }}>
      {/* Topo */}
      <header style={{ borderBottom: `1px solid ${T.rule}` }}>
        <div className={`${WRAP} h-16 flex items-center justify-between`}>
          <a href="/" className="flex items-center gap-2.5">
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-[17px] tracking-tight">Nexla</span>
          </a>
          <a href="/" className="lp-link inline-flex items-center gap-1.5 text-sm" style={{ color: T.mute }}>
            <ArrowLeft size={15} strokeWidth={1.75} /> <span className="hidden sm:inline">Voltar ao site</span><span className="sm:hidden">Site</span>
          </a>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="pt-12 pb-20 md:pt-20 md:pb-28">
        <div className={`${WRAP} grid lg:grid-cols-[1.18fr_1fr] gap-14 lg:gap-20 items-start`}>
          <div className="lg:pt-4">
            <motion.h1 {...load(0.06)} className="lp-serif font-medium leading-[1.02] mb-8"
              style={{ fontSize: 'clamp(42px,5.8vw,76px)', letterSpacing: '-0.025em' }}>
              Sua empresa vai perder horas com a <em className="not-italic text-gradient">escala 5×2</em>.
              Você já sabe como cobrir?
            </motion.h1>

            <motion.p {...load(0.16)} className="text-[18px] leading-[1.6] max-w-[34rem] mb-10" style={{ color: T.ink2 }}>
              A jornada cai para <strong className="font-semibold" style={{ color: T.ink }}>42h</strong> e depois para{' '}
              <strong className="font-semibold" style={{ color: T.ink }}>40h</strong> por semana,{' '}
              <strong className="font-semibold" style={{ color: T.ink }}>sem redução de salário</strong>. Aprenda a usar
              inteligência artificial para tirar o trabalho repetitivo da sua equipe e atravessar a transição sem
              contratar no desespero.
            </motion.p>

            <motion.div {...load(0.24)} className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-14">
              <PrimaryBtn onClick={scrollToForm}>Entrar na lista do curso <Arrow /></PrimaryBtn>
              <span className="text-sm" style={{ color: T.mute }}>Gratuito · vagas da 1ª turma limitadas</span>
            </motion.div>

            {/* Linha do tempo */}
            <motion.div {...load(0.34)} className="max-w-[34rem]">
              <ol className="grid grid-cols-3">
                {[
                  { t: 'Hoje', h: '44h', d: 'regra atual' },
                  { t: '+60 dias', h: '42h', d: 'escala 5×2' },
                  { t: '+14 meses', h: '40h', d: 'jornada final' },
                ].map((s, i) => (
                  <li key={s.t} className="relative pt-5 pr-3" style={{ borderTop: `1px solid ${i === 0 ? T.ink : T.rule}` }}>
                    <span className="absolute -top-[4.5px] left-0 w-2 h-2 rounded-full"
                      style={{ background: i === 0 ? T.ink : T.paper, border: `1.5px solid ${i === 2 ? T.accent : T.ink}` }} />
                    <div className="lp-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: T.mute }}>{s.t}</div>
                    <div className="lp-serif lp-num text-[34px] leading-none mt-2" style={{ color: i === 2 ? T.accent : T.ink }}>{s.h}</div>
                    <div className="text-[13px] mt-1.5" style={{ color: T.mute }}>{s.d}</div>
                  </li>
                ))}
              </ol>
              <p className="text-[12px] mt-5" style={{ color: T.mute }}>
                Prazos contados a partir da promulgação da emenda constitucional.
              </p>
            </motion.div>
          </div>

          <motion.div {...load(0.2)}>
            <Calculadora funcionarios={funcionarios} setFuncionarios={setFuncionarios} horas={horas} setHoras={setHoras} />
          </motion.div>
        </div>
      </section>

      {/* O PROBLEMA */}
      <section className="pb-24 md:pb-32">
        <div className={WRAP}>
          <SectionLabel n="01">O problema</SectionLabel>
          <motion.h2 initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="lp-serif font-medium leading-[1.08] max-w-[46rem] mb-14" style={{ fontSize: 'clamp(32px,4.2vw,52px)' }}>
            Menos horas, mesmo salário. A maioria vai resolver do jeito <em className="not-italic" style={{ color: T.loss }}>mais caro</em>.
          </motion.h2>

          <motion.ol initial="hidden" whileInView="show" viewport={vp}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid md:grid-cols-3 gap-x-4 gap-y-4 -mx-6">
            {PROBLEMAS.map((c, i) => (
              <motion.li key={c.t} variants={fadeUp} className="lp-bubble cursor-default"
                whileHover={{ scale: 1.05, y: -6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14 }}>
                <div className="lp-mono text-[11px] mb-5" style={{ color: T.loss }}>✕ 0{i + 1}</div>
                <h3 className="lp-serif text-[26px] leading-tight mb-3">{c.t}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: T.ink2 }}>{c.d}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* A SAÍDA */}
      <section className="lp-dark py-24 md:py-32" style={{ background: T.dark, color: T.darkText }}>
        <div className={WRAP}>
          <SectionLabel n="02" dark>A saída</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.25fr] gap-14 lg:gap-20 items-start">
            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="lg:sticky lg:top-[max(6rem,calc(50vh-10rem))]">
              <h2 className="lp-serif font-medium leading-[1.08] mb-6" style={{ fontSize: 'clamp(32px,4vw,50px)' }}>
                Tire o repetitivo da equipe. Deixe <span className="lp-grad-light">a IA cobrir essas horas.</span>
              </h2>
              <p className="text-[17px] leading-[1.65]" style={{ color: T.darkMute }}>
                Com a 5×2, cada funcionário trabalha <strong className="font-semibold" style={{ color: T.darkText }}>4 horas a menos</strong>{' '}
                por semana, pelo mesmo salário. Contratar mais gente aumenta a folha. A saída mais barata é tirar da equipe o
                trabalho repetitivo, que a IA faz <strong className="font-semibold" style={{ color: T.darkText }}>sozinha e em segundos</strong>.
                Veja a conta em 3 passos.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={vp}
              variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
              {/* ① O que a 5×2 tira */}
              <Passo n={1} titulo="A 5×2 tira 4 horas de cada funcionário">
                <p className="text-[15px] leading-relaxed mb-5" style={{ color: T.darkMute }}>
                  A jornada cai de <strong style={{ color: T.darkText }}>{JORNADA_HOJE}h para {JORNADA_NOVA}h</strong> por semana e o salário
                  continua o mesmo. Você paga igual por menos horas de trabalho.
                </p>
                <div className="space-y-3 mb-5">
                  <BarraJornada rotulo="Antes" horas={JORNADA_HOJE} />
                  <BarraJornada rotulo="Com a 5×2" horas={JORNADA_NOVA} perdidas={HORAS_PERDIDAS} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl p-4" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <div className="flex -space-x-2.5 shrink-0">
                    {AUTOMATIZAVEL.map(a => (
                      <img key={a.avatar} src={a.avatar} alt="" className="w-9 h-9 rounded-full" loading="lazy"
                        style={{ background: T.dark2, border: `2px solid ${T.dark}` }} />
                    ))}
                  </div>
                  <p className="text-[14px] leading-snug" style={{ color: T.darkMute }}>
                    Numa equipe de {AUTOMATIZAVEL.length}: <strong style={{ color: '#FB923C' }}>−{TOTAL_PERDIDAS}h por semana</strong>, ou{' '}
                    <strong style={{ color: '#FB923C' }}>R$ {fmtReal(TOTAL_PERDA)} por mês</strong> pagos por horas que deixam de existir.
                  </p>
                </div>
              </Passo>

              {/* ② Onde a IA entra */}
              <Passo n={2} titulo="A IA assume o trabalho repetitivo">
                <p className="text-[15px] leading-relaxed mb-2" style={{ color: T.darkMute }}>
                  Toda equipe gasta parte da semana em tarefas que se repetem. Essas a IA faz sozinha, e cada hora que ela assume
                  volta para a sua equipe:
                </p>
                {AUTOMATIZAVEL.map(a => (
                  <div key={a.title} className="flex items-start gap-4 py-4" style={{ borderBottom: `1px solid ${T.darkRule}` }}>
                    <img src={a.avatar} alt="" className="w-11 h-11 shrink-0 rounded-full" loading="lazy"
                      style={{ background: T.dark2, border: `1px solid ${T.darkRule}` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="lp-serif text-[18px] md:text-[19px] leading-tight">{a.title}</h3>
                        <span className="lp-serif lp-num text-[18px] md:text-[19px] shrink-0" style={{ color: '#C4B5FD' }}>
                          +<CountUp to={a.horas} suf="h" />
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <span className="text-[12.5px]" style={{ color: T.darkMute }}>{a.pessoa}</span>
                        <span className="text-[11.5px] shrink-0" style={{ color: T.darkMute }}>livres/semana</span>
                      </div>
                      <p className="text-[14px] leading-relaxed" style={{ color: T.darkMute }}><Realce text={a.desc} hl={a.hl} /></p>
                    </div>
                  </div>
                ))}
              </Passo>

              {/* ③ O resultado */}
              <Passo n={3} titulo="O resultado: sua empresa sai ganhando" ultimo>
                <div className="rounded-xl p-5" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}>
                  <div className="space-y-3 mb-5">
                    <div>
                      <div className="flex justify-between text-[13px] mb-1.5" style={{ color: T.darkMute }}>
                        <span>A 5×2 tira</span>
                        <strong className="lp-num" style={{ color: '#FB923C' }}>−<CountUp to={TOTAL_PERDIDAS} suf="h" /> por semana</strong>
                      </div>
                      <Barra pct={(TOTAL_PERDIDAS / TOTAL_HORAS) * 100} cor="laranja" delay={0.2} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[13px] mb-1.5" style={{ color: T.darkMute }}>
                        <span>A IA devolve</span>
                        <strong className="lp-num" style={{ color: '#C4B5FD' }}>+<CountUp to={TOTAL_HORAS} suf="h" /> por semana</strong>
                      </div>
                      <Barra pct={100} cor="roxo" delay={0.4} />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 flex-wrap pt-4" style={{ borderTop: `1px solid ${T.darkRule}` }}>
                    <span className="text-[14px]" style={{ color: T.darkMute }}>Saldo</span>
                    <span className="lp-serif lp-num leading-none" style={{ fontSize: 'clamp(36px,4.6vw,46px)', color: '#4ADE80' }}>
                      +<CountUp to={SALDO_HORAS} suf="h" />
                    </span>
                    <span className="text-[14px]" style={{ color: T.darkText }}>por semana a seu favor</span>
                  </div>
                  <p className="text-[14.5px] leading-relaxed mt-3" style={{ color: T.darkMute }}>
                    As {TOTAL_PERDIDAS}h que a 5×2 tira ficam cobertas e ainda sobram {SALDO_HORAS}h. As {TOTAL_HORAS}h que a IA devolve são{' '}
                    <strong style={{ color: T.darkText }}>uma jornada inteira da nova escala</strong>: é como ganhar um funcionário a mais,
                    sem pagar R$ {fmtReal(SALARIO_MINIMO)} por mês para contratar.
                  </p>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {[
                    'Sem contratar e sem aumentar a folha',
                    'Atendimento respondendo 24h, inclusive fora do expediente',
                    'Equipe livre para vender, atender e resolver o que só gente resolve',
                  ].map(t => (
                    <li key={t} className="flex items-start gap-3 text-[14.5px]" style={{ color: T.darkText }}>
                      <span className="w-5 h-5 mt-0.5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                        <Check size={12} strokeWidth={2.5} color="#4ADE80" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>

                <p className="text-[11.5px] mt-5 leading-relaxed" style={{ color: T.darkMute }}>
                  Exemplo com {AUTOMATIZAVEL.length} funcionários ganhando salário mínimo (R$ {fmtReal(SALARIO_MINIMO)}, 2026). As 4h a menos
                  valem R$ {fmtReal(PERDA_MES)} por mês de cada um, sem contar encargos. As horas de cada tarefa são estimativas e variam em cada empresa.
                </p>
              </Passo>
            </motion.div>
          </div>
        </div>
      </section>

      {/* O CURSO */}
      <section className="py-24 md:py-32">
        <div className={WRAP}>
          <SectionLabel n="03">O curso</SectionLabel>
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="grid lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-20 items-end mb-14">
            <h2 className="lp-serif font-medium leading-[1.08]" style={{ fontSize: 'clamp(32px,4.2vw,52px)' }}>
              IA na prática para atravessar a <em className="not-italic text-gradient">5×2</em>, sem precisar programar.
            </h2>
            <p className="text-[17px] leading-[1.65]" style={{ color: T.ink2 }}>
              Feito para dono de empresa e equipe administrativa. Você sai com as automações montadas e um plano de
              transição para o seu negócio.
            </p>
          </motion.div>

          <motion.ol initial="hidden" whileInView="show" viewport={vp}
            variants={{ show: { transition: { staggerChildren: 0.07 } } }} style={{ borderBottom: `1px solid ${T.rule}` }}>
            {MODULOS.map(m => (
              <motion.li key={m.n} variants={fadeUp}
                className="lp-row grid md:grid-cols-[9rem_1fr_1fr] gap-x-10 gap-y-2 py-7 md:py-8"
                style={{ borderTop: `1px solid ${T.rule}` }}>
                <span className="lp-mono text-[11px] uppercase tracking-[0.14em] md:pt-2" style={{ color: T.mute }}>Módulo {m.n}</span>
                <h3 className="lp-serif text-[26px] md:text-[28px] leading-tight">{m.title}</h3>
                <p className="text-[15px] leading-relaxed md:pt-1.5" style={{ color: T.ink2 }}>{m.desc}</p>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-[15px]" style={{ color: T.ink2 }}>
              <span className="font-semibold" style={{ color: T.ink }}>Primeira turma em breve.</span>{' '}
              Quem estiver na lista tem condição especial de lançamento.
            </p>
            <button onClick={scrollToForm} className="lp-link inline-flex items-center gap-2 font-medium shrink-0 underline underline-offset-[6px] decoration-1"
              style={{ color: T.accent }}>
              Garantir minha vaga <Arrow size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* QUEM ENSINA */}
      <section className="py-24 md:py-32" style={{ background: T.paper2 }}>
        <div className={WRAP}>
          <SectionLabel n="04">Quem ensina</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-start">
            <motion.figure initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}>
              {/* Corte 4:3 a partir do topo — ajusta sozinho quando trocar pela foto do professor */}
              <div className="rounded-2xl overflow-hidden aspect-[4/3]"
                style={{ border: `1px solid ${T.rule}`, boxShadow: '0 24px 50px -30px rgba(15,23,42,0.35)' }}>
                <img src="/nexla.jpg" alt="Alisson Amorim e equipe Nexla no NASA Space Apps Challenge"
                  className="w-full h-full object-cover object-top block" loading="lazy" />
              </div>
              <figcaption className="mt-3 text-[12.5px]" style={{ color: T.mute }}>
                Equipe Nexla no NASA Space Apps Challenge · Vilhena, RO
              </figcaption>
            </motion.figure>

            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}>
              <h2 className="lp-serif font-medium leading-[1.05]" style={{ fontSize: 'clamp(34px,4.2vw,52px)' }}>
                Alisson <span className="text-gradient">Amorim</span>
              </h2>
              <p className="text-[15px] font-semibold mt-2 mb-6" style={{ color: T.mute }}>
                Fundador da Nexla · Engenheiro de automação com IA
              </p>
              <p className="text-[17px] leading-[1.65] mb-8" style={{ color: T.ink2 }}>
                À frente da Nexla, constrói agentes de atendimento e automações para clínicas, comércios, restaurantes e
                escritórios.{' '}
                <motion.strong className="font-semibold" style={{
                    color: T.ink, backgroundRepeat: 'no-repeat', backgroundPosition: '0 88%',
                    backgroundImage: 'linear-gradient(rgba(124,58,237,0.22), rgba(124,58,237,0.22))',
                    WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone',
                  }}
                  initial={{ backgroundSize: '0% 38%' }} whileInView={{ backgroundSize: '100% 38%' }}
                  viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1.1, delay: 0.4, ease }}>
                  Vai ensinar exatamente o que aplica nos clientes.
                </motion.strong>
              </p>
              <dl className="grid sm:grid-cols-3 gap-3 mb-10">
                {CREDENCIAIS.map((c, i) => {
                  const destaque = i === 0;
                  return (
                    <motion.div key={c.t} className="lp-cred rounded-xl p-4 cursor-default"
                      whileHover={{ scale: 1.07, y: -6 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                      style={destaque
                        ? { background: `linear-gradient(135deg, ${T.accent}, ${T.violet})`, boxShadow: '0 18px 40px -18px rgba(79,70,229,0.6)' }
                        : { background: T.card, border: `1px solid ${T.rule}` }}>
                      <c.icon size={18} strokeWidth={1.75} className="mb-3" style={{ color: destaque ? '#FFFFFF' : T.accent }} />
                      <dt className="lp-serif lp-num text-[26px] leading-none" style={{ color: destaque ? '#FFFFFF' : T.ink }}>
                        <CountUp to={c.n} pre={c.pre} suf={c.suf} />
                      </dt>
                      <dd className="text-[13px] leading-snug mt-2" style={{ color: destaque ? 'rgba(255,255,255,0.85)' : T.ink2 }}>{c.t}</dd>
                    </motion.div>
                  );
                })}
              </dl>
              <a href="/#experimente" className="lp-link inline-flex items-center gap-2 font-medium underline underline-offset-[6px] decoration-1"
                style={{ color: T.accent }}>
                Testar um agente da Nexla agora <Arrow size={16} />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section id="lista" ref={formRef} className="lp-dark py-24 md:py-32" style={{ background: T.dark, color: T.darkText }}>
        <div className={WRAP}>
          <SectionLabel n="05" dark>Pré-cadastro</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-20 items-start">
            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}>
              <h2 className="lp-serif font-medium leading-[1.06] mb-5" style={{ fontSize: 'clamp(34px,4.4vw,56px)' }}>
                Entre na lista e saia na frente da <span className="lp-grad-light">5×2</span>.
              </h2>
              <p className="text-[17px] leading-[1.65] mb-8" style={{ color: T.darkMute }}>
                Leva <strong className="font-semibold" style={{ color: T.darkText }}>30 segundos</strong>. Você recebe tudo pelo WhatsApp.
              </p>

              {/* Lembra o resultado do simulador lá de cima */}
              {perdaSemana > 0 && (
                <div className="rounded-xl p-5 mb-8" style={{ background: T.dark2, border: `1px solid ${T.darkRule}` }}>
                  <p className="text-[13px] mb-1" style={{ color: T.darkMute }}>
                    Pelo simulador, com {funcionarios} funcionário{funcionarios > 1 ? 's' : ''} em {horas}h:
                  </p>
                  <p className="text-[16px] leading-snug" style={{ color: T.darkText }}>
                    sua empresa perde{' '}
                    <motion.span key={perdaSemana} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}
                      className="lp-serif lp-num text-[22px]" style={{ color: '#FB923C' }}>
                      {fmt(perdaSemana)}h por semana
                    </motion.span>
                    . No curso, você aprende a cobrir isso.
                  </p>
                </div>
              )}

              <motion.ul className="space-y-3.5" initial="hidden" whileInView="show" viewport={vp}
                variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}>
                {[
                  { b: 'Gratuito', r: ' e sem compromisso' },
                  { b: 'Novidades do curso', r: ' antes de todo mundo' },
                  { b: 'Condição especial', r: ' de lançamento' },
                ].map(t => (
                  <motion.li key={t.b} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease } } }}
                    className="flex items-center gap-3 text-[15px]" style={{ color: T.darkMute }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      <Check size={13} strokeWidth={2.5} color="#4ADE80" />
                    </span>
                    <span><strong className="font-semibold" style={{ color: T.darkText }}>{t.b}</strong>{t.r}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
              className="relative rounded-2xl p-6 md:p-8 overflow-hidden" style={{ background: T.dark2, border: `1px solid ${T.darkRule}` }}>
              <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${T.accent}, ${T.violet})` }} />
              <Formulario funcionarios={funcionarios} horas={horas} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-32">
        <div className={WRAP}>
          <SectionLabel n="06">Dúvidas</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-20 items-start">
            <div>
              <h2 className="lp-serif font-medium leading-[1.08] mb-5" style={{ fontSize: 'clamp(32px,3.8vw,46px)' }}>
                Perguntas frequentes
              </h2>
              <p className="text-[15px] leading-relaxed mb-5" style={{ color: T.ink2 }}>
                Não achou sua resposta? Chama a gente, respondemos rápido.
              </p>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
                className="lp-link inline-flex items-center gap-3 rounded-xl pl-2 pr-4 py-2 mb-8 transition-colors hover:bg-white"
                style={{ border: `1px solid ${T.rule}` }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>
                  <MessageCircle size={18} strokeWidth={1.75} />
                </span>
                <span className="text-[15px] font-semibold" style={{ color: T.ink }}>Falar no WhatsApp</span>
                <Arrow size={15} />
              </a>
              <div className="hidden lg:block">
                <PrimaryBtn onClick={scrollToForm}>Quero entrar na lista <Arrow /></PrimaryBtn>
              </div>
            </div>

            <div className="space-y-3">
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <motion.div key={f.q}
                    whileHover={{ scale: 1.015 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      background: open ? T.card : 'transparent',
                      border: `1px solid ${open ? 'rgba(79,70,229,0.25)' : T.rule}`,
                      boxShadow: open ? '0 20px 44px -26px rgba(79,70,229,0.45)' : 'none',
                      transition: 'background-color 250ms ease, border-color 250ms ease, box-shadow 250ms ease',
                    }}>
                    <motion.span className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: `linear-gradient(${T.accent}, ${T.violet})`, originY: 0 }}
                      initial={false} animate={{ scaleY: open ? 1 : 0 }} transition={{ duration: 0.35, ease }} />
                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}
                      className="w-full flex items-center justify-between gap-6 text-left px-5 md:px-6 py-5">
                      <span className="lp-serif text-[19px] md:text-[21px] leading-snug" style={{ color: T.ink }}>{f.q}</span>
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
                          <p className="px-5 md:px-6 pb-6 pr-14 text-[16px] leading-relaxed" style={{ color: T.ink2 }}>
                            <Realce text={f.a} hl={f.hl} light />
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
          <div className="lg:hidden mt-10">
            <PrimaryBtn onClick={scrollToForm} full>Quero entrar na lista <Arrow /></PrimaryBtn>
          </div>
        </div>
      </section>

      {/* Rodapé — igual ao da página inicial (App.tsx), com links para as seções de lá */}
      <footer className="pt-10 pb-28 md:pb-10 px-6" style={{ background: '#1E1B4B', borderTop: '1px solid rgba(237,233,254,0.1)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <motion.a href="/" className="flex items-center gap-3" whileHover={{ scale: 1.04 }}>
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="Nexla" className="w-12 h-12 md:w-14 md:h-14 object-contain opacity-90" />
            <span className="lp-serif text-2xl" style={{ color: '#EDE9FE', letterSpacing: 'normal' }}>Nexla</span>
          </motion.a>

          <div className="flex flex-wrap justify-center items-center gap-6">
            {RODAPE_LINKS.map(l => (
              <motion.a key={l.href} href={l.href}
                {...(l.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-sm font-medium" style={{ color: 'rgba(237,233,254,0.6)' }}
                whileHover={{ color: '#EDE9FE', y: -1 }} transition={{ duration: 0.2 }}>
                {l.label}
              </motion.a>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'rgba(167,139,250,0.35)' }}>
            Nexla Automação e IA LTDA · Vilhena, RO · 2025
          </p>
        </div>
      </footer>

      {/* CTA fixo no celular */}
      <AnimatePresence>
        {showSticky && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ duration: 0.35, ease }}
            className="fixed bottom-0 inset-x-0 z-40 p-3 md:hidden"
            style={{ background: 'rgba(241,245,249,0.94)', borderTop: `1px solid ${T.rule}`, backdropFilter: 'blur(8px)' }}>
            <PrimaryBtn onClick={scrollToForm} full>Entrar na lista do curso <Arrow /></PrimaryBtn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
