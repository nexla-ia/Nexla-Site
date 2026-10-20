import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Clock, MessageCircle, CalendarCheck,
  FileSpreadsheet, Receipt, Users, Flame, UserPlus, PhoneOff, Sparkles,
  GraduationCap, Wrench, HelpCircle, ChevronDown, Loader2, Rocket, Mic, Trophy,
} from 'lucide-react';

/* ─── Configuração da campanha ───────────────────────────────────
 * WEBHOOK_URL  → crie no n8n um Webhook (POST) com esse caminho.
 * META_PIXEL_ID → cole o ID do Pixel do Meta para medir os leads
 *                 dos anúncios (deixe vazio para desligar).        */
const WEBHOOK_URL   = 'https://n8n.nexladesenvolvimento.com.br/webhook/5x2';
const META_PIXEL_ID: string = '';
const WHATSAPP      = '556999300101';

/* ─── Paleta (a mesma do site) ─────────────────────────────────── */
const C = {
  bg: '#F1F5F9', surface: '#FFFFFF',
  indigo: '#4F46E5', violet: '#7C3AED', coral: '#F97316', green: '#22C55E',
  text: '#0F172A', muted: '#475569', border: 'rgba(15,23,42,0.08)',
  dark: '#0F172A', darkSurface: '#1E293B', darkText: '#F1F5F9',
  darkMuted: 'rgba(241,245,249,0.68)', darkBorder: 'rgba(241,245,249,0.10)',
} as const;
const GRAD = `linear-gradient(135deg, ${C.indigo}, ${C.violet})`;

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const vp = { once: true, margin: '-60px' } as const;

/* ─── Dados ────────────────────────────────────────────────────── */
const SEGMENTOS = [
  'Comércio / varejo', 'Restaurante / alimentação', 'Saúde / clínica',
  'Serviços', 'Automotivo / autopeças', 'Construção', 'Indústria', 'Outro',
];

const AUTOMATIZAVEL = [
  { icon: MessageCircle,   title: 'Atendimento no WhatsApp', desc: 'Responder dúvidas, preço, horário e status de pedido, 24h por dia.' },
  { icon: CalendarCheck,   title: 'Agendamentos',            desc: 'Marcar, confirmar e lembrar o cliente sem ninguém no telefone.' },
  { icon: Receipt,         title: 'Orçamentos e cobranças',  desc: 'Enviar orçamento, follow-up e lembrete de pagamento automaticamente.' },
  { icon: FileSpreadsheet, title: 'Planilhas e relatórios',  desc: 'Dados que se atualizam sozinhos e relatório pronto no seu WhatsApp.' },
];

const MODULOS = [
  { n: '01', title: 'Mapeie as horas que vão faltar', desc: 'Descubra onde sua equipe gasta tempo com tarefa repetitiva e o que dá para tirar dela.' },
  { n: '02', title: 'Atendimento com IA no WhatsApp', desc: 'Monte um agente que responde, qualifica e agenda clientes com o jeito da sua empresa.' },
  { n: '03', title: 'Rotinas de escritório no automático', desc: 'Planilhas, relatórios e avisos rodando sozinhos, com IA lendo documentos por você.' },
  { n: '04', title: 'Seu plano de transição para a 5×2', desc: 'Reorganize escalas e processos para atravessar a mudança sem sobrecarregar ninguém.' },
];

const FAQ = [
  { q: 'O pré-cadastro é pago?', a: 'Não. Entrar na lista é gratuito e não te compromete com nada. Você recebe as novidades primeiro e uma condição especial no lançamento.' },
  { q: 'Preciso saber programar?', a: 'Não. O curso é feito para dono de empresa e equipe administrativa. Você aprende a montar as automações com ferramentas visuais.' },
  { q: 'Quando começa a primeira turma?', a: 'A data será anunciada primeiro para quem estiver na lista, pelo WhatsApp.' },
  { q: 'E se eu não quiser montar sozinho?', a: 'Sem problema. No formulário, marque que prefere que a Nexla implemente. A gente faz o diagnóstico e monta para você.' },
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
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] px-3 py-1.5 rounded-full"
      style={{
        color: dark ? '#A5B4FC' : C.indigo,
        background: dark ? 'rgba(165,180,252,0.10)' : 'rgba(79,70,229,0.08)',
        border: `1px solid ${dark ? 'rgba(165,180,252,0.20)' : 'rgba(79,70,229,0.18)'}`,
      }}>
      {children}
    </span>
  );
}

function PrimaryBtn({ children, onClick, type = 'button', disabled = false, full = false }: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; full?: boolean;
}) {
  return (
    <motion.button type={type} onClick={onClick} disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }} whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base text-white disabled:opacity-70 ${full ? 'w-full' : ''}`}
      style={{ background: GRAD, boxShadow: '0 10px 30px rgba(79,70,229,0.30)' }}>
      {children}
    </motion.button>
  );
}

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

  return (
    <div className="relative rounded-3xl p-6 md:p-8"
      style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 30px 80px -24px rgba(79,70,229,0.35), 0 8px 24px rgba(15,23,42,0.06)' }}>
      <div className="absolute -top-3 right-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
        style={{ background: GRAD }}>
        <Clock size={13} /> Diagnóstico rápido
      </div>

      <h3 className="font-display font-bold text-xl md:text-2xl mb-1" style={{ color: C.text }}>
        Quantas horas sua empresa vai perder?
      </h3>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Ajuste para a realidade da sua equipe.</p>

      <label className="block mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: C.text }}>Funcionários com carteira</span>
          <span className="font-display font-bold text-2xl" style={{ color: C.indigo }}>{funcionarios}</span>
        </div>
        <input type="range" min={1} max={100} value={funcionarios}
          onChange={e => setFuncionarios(Number(e.target.value))}
          className="w-full accent-indigo-600" aria-label="Número de funcionários" />
        <div className="flex justify-between text-[11px] font-mono mt-1" style={{ color: C.muted }}>
          <span>1</span><span>100+</span>
        </div>
      </label>

      <div className="mb-6">
        <span className="block text-sm font-semibold mb-2" style={{ color: C.text }}>Jornada semanal hoje</span>
        <div className="grid grid-cols-3 gap-2">
          {[44, 42, 40].map(h => (
            <button key={h} type="button" onClick={() => setHoras(h)}
              className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={horas === h
                ? { background: GRAD, color: '#fff' }
                : { background: '#F8FAFC', color: C.muted, border: `1px solid ${C.border}` }}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: '#FFF7ED', border: '1px solid rgba(249,115,22,0.22)' }}>
        <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: '#C2410C' }}>
          Ao fim da transição (40h)
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display font-extrabold leading-none" style={{ fontSize: 'clamp(40px,6vw,56px)', color: C.coral }}>
            −{fmt(final)}h
          </span>
          <span className="text-sm font-semibold" style={{ color: '#9A3412' }}>por semana</span>
        </div>
        <p className="text-sm mt-2" style={{ color: '#9A3412' }}>
          {final > 0
            ? <>Cerca de <strong>{fmt(mes)} horas por mês</strong>. É o mesmo que <strong>{fmt(pessoas, Number.isInteger(pessoas) || pessoas >= 10 ? 0 : 1)} funcionário{pessoas >= 2 ? 's' : ''}</strong> de 40h a menos na operação.</>
            : <>Sua jornada já está no novo limite. Ainda dá para ganhar tempo automatizando o repetitivo.</>}
        </p>
        {fase1 > 0 && (
          <p className="text-xs mt-3 pt-3" style={{ color: '#9A3412', borderTop: '1px dashed rgba(249,115,22,0.35)' }}>
            Já na primeira etapa (42h): <strong>−{fmt(fase1)}h por semana</strong>.
          </p>
        )}
      </div>

      <div className="mt-5">
        <PrimaryBtn onClick={scrollToForm} full>
          Quero cobrir essas horas <ArrowRight size={18} />
        </PrimaryBtn>
      </div>
      <p className="text-[11px] text-center mt-3" style={{ color: C.muted }}>
        Estimativa: diferença de jornada × número de funcionários.
      </p>
    </div>
  );
}

/* ─── Formulário ───────────────────────────────────────────────── */
type Interesse = 'aprender' | 'implementar' | 'indefinido' | '';
type Status = 'idle' | 'sending' | 'ok' | 'error';

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

  const field = 'w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition-shadow focus:ring-2 focus:ring-indigo-400';
  const fieldStyle = { background: 'rgba(241,245,249,0.06)', border: `1px solid ${C.darkBorder}`, color: C.darkText };

  if (status === 'ok' || status === 'error') {
    const ok = status === 'ok';
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }}
        className="text-center py-6">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)' }}>
          {ok ? <CheckCircle2 size={34} color={C.green} /> : <MessageCircle size={30} color={C.coral} />}
        </div>
        <h3 className="font-display font-bold text-2xl md:text-3xl mb-3" style={{ color: C.darkText }}>
          {ok ? `Pronto, ${nome.split(' ')[0]}! Você está na lista.` : 'Quase lá! Finalize pelo WhatsApp.'}
        </h3>
        <p className="max-w-md mx-auto mb-7" style={{ color: C.darkMuted }}>
          {ok
            ? interesse === 'implementar'
              ? 'Como você prefere que a Nexla implemente, nossa equipe vai te chamar no WhatsApp para o diagnóstico. Se quiser adiantar, é só clicar abaixo.'
              : 'Você vai receber as novidades do curso e a condição especial de lançamento direto no seu WhatsApp.'
            : 'Não conseguimos registrar seu cadastro agora. Clique abaixo e mande a mensagem pronta para garantir sua vaga na lista.'}
        </p>
        {(!ok || interesse === 'implementar') && (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-semibold text-white"
            style={{ background: '#22C55E', boxShadow: '0 10px 30px rgba(34,197,94,0.30)' }}>
            <MessageCircle size={18} /> Falar no WhatsApp
          </a>
        )}
      </motion.div>
    );
  }

  const opcoes: { v: Interesse; icon: typeof GraduationCap; t: string; d: string }[] = [
    { v: 'aprender',    icon: GraduationCap, t: 'Quero aprender a montar', d: 'Entrar na lista do curso' },
    { v: 'implementar', icon: Wrench,        t: 'Prefiro que a Nexla monte', d: 'Diagnóstico e implantação' },
    { v: 'indefinido',  icon: HelpCircle,    t: 'Ainda não sei', d: 'Quero entender melhor' },
  ];

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input className={field} style={fieldStyle} placeholder="Seu nome" value={nome}
          onChange={e => setNome(e.target.value)} autoComplete="name" />
        <input className={field} style={fieldStyle} placeholder="WhatsApp com DDD" value={whats} inputMode="tel"
          onChange={e => setWhats(maskPhone(e.target.value))} autoComplete="tel" />
        <input className={field} style={fieldStyle} placeholder="Nome da empresa" value={empresa}
          onChange={e => setEmpresa(e.target.value)} autoComplete="organization" />
        <div className="relative">
          <select className={`${field} appearance-none pr-10`} style={{ ...fieldStyle, color: segmento ? C.darkText : 'rgba(241,245,249,0.45)' }}
            value={segmento} onChange={e => setSegmento(e.target.value)}>
            <option value="" disabled>Segmento</option>
            {SEGMENTOS.map(s => <option key={s} value={s} style={{ color: C.text }}>{s}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" color={C.darkMuted} />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-xl px-4 py-3" style={fieldStyle}>
        <Users size={18} color="#A5B4FC" />
        <span className="text-[15px] flex-1" style={{ color: C.darkMuted }}>Funcionários com carteira</span>
        <input type="number" min={0} className="w-20 bg-transparent text-right font-semibold outline-none" style={{ color: C.darkText }}
          value={qtd} onChange={e => { touchedQtd.current = true; setQtd(e.target.value); }} />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold mb-2.5" style={{ color: C.darkText }}>Como você prefere resolver?</legend>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {opcoes.map(o => {
            const on = interesse === o.v;
            return (
              <button key={o.v} type="button" onClick={() => setInteresse(o.v)}
                className="text-left rounded-xl p-3.5 transition-all"
                style={{
                  background: on ? 'rgba(124,58,237,0.22)' : 'rgba(241,245,249,0.04)',
                  border: `1.5px solid ${on ? '#8B5CF6' : C.darkBorder}`,
                }}>
                <o.icon size={18} color={on ? '#C4B5FD' : '#A5B4FC'} />
                <div className="text-sm font-semibold mt-2" style={{ color: C.darkText }}>{o.t}</div>
                <div className="text-xs mt-0.5" style={{ color: C.darkMuted }}>{o.d}</div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm cursor-pointer select-none" style={{ color: C.darkMuted }}>
        <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-violet-500 shrink-0" />
        Aceito receber contato da Nexla pelo WhatsApp sobre o curso e os serviços. Seus dados não são compartilhados.
      </label>

      <AnimatePresence>
        {erro && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-sm font-medium" style={{ color: '#FDBA74' }} role="alert">
            {erro}
          </motion.p>
        )}
      </AnimatePresence>

      <PrimaryBtn type="submit" disabled={status === 'sending'} full>
        {status === 'sending'
          ? <><Loader2 size={18} className="animate-spin" /> Enviando…</>
          : <>Quero entrar na lista <ArrowRight size={18} /></>}
      </PrimaryBtn>
      <p className="text-xs text-center" style={{ color: 'rgba(241,245,249,0.45)' }}>
        Gratuito · sem compromisso · condição especial para quem estiver na lista
      </p>
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

  useEffect(() => { loadPixel(); }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: C.bg, color: C.text }}>
      {/* Topo */}
      <header className="absolute top-0 inset-x-0 z-30">
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl" style={{ color: C.text }}>Nexla</span>
          </a>
          <a href="/" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: C.muted }}>
            <ArrowLeft size={15} /> Voltar ao site
          </a>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="aurora-1 absolute top-[-15%] left-[-10%] w-[620px] h-[620px] rounded-full opacity-[0.16] blur-[110px]"
            style={{ background: `radial-gradient(circle, ${C.indigo}, transparent)` }} />
          <div className="aurora-2 absolute bottom-[-20%] right-[-5%] w-[560px] h-[560px] rounded-full opacity-[0.14] blur-[100px]"
            style={{ background: `radial-gradient(circle, #818CF8, ${C.violet})` }} />
          <div className="aurora-3 absolute top-[35%] right-[30%] w-[380px] h-[380px] rounded-full opacity-[0.10] blur-[90px]"
            style={{ background: `radial-gradient(circle, ${C.coral}, #FBBF24)` }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 md:px-10 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6"
                style={{ background: 'rgba(249,115,22,0.10)', color: '#C2410C', border: '1px solid rgba(249,115,22,0.25)' }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ background: C.coral }} />
                  <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: C.coral }} />
                </span>
                Fim da escala 6×1 aprovado pelo Congresso
              </span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.08, ease }}
              className="font-display font-bold leading-[1.04] mb-6" style={{ fontSize: 'clamp(38px,6.2vw,70px)' }}>
              Sua empresa vai perder horas com a{' '}
              <span className="text-gradient">escala 5×2</span>.
              <br className="hidden md:block" />{' '}
              Você já sabe como cobrir?
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease }}
              className="text-lg leading-relaxed max-w-xl mb-8" style={{ color: C.muted }}>
              A jornada cai para <strong style={{ color: C.text }}>42h</strong> e depois para{' '}
              <strong style={{ color: C.text }}>40h</strong> por semana, <strong style={{ color: C.text }}>sem redução de salário</strong>.
              Aprenda a usar inteligência artificial para tirar o trabalho repetitivo da sua equipe e atravessar a
              transição sem contratar no desespero.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.32, ease }}
              className="flex flex-wrap items-center gap-4 mb-10">
              <PrimaryBtn onClick={scrollToForm}>Entrar na lista do curso <ArrowRight size={18} /></PrimaryBtn>
              <span className="text-sm" style={{ color: C.muted }}>Gratuito · vagas da 1ª turma limitadas</span>
            </motion.div>

            {/* Linha do tempo */}
            <motion.ol initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } } }}
              className="grid grid-cols-3 gap-3 max-w-xl">
              {[
                { t: 'Hoje', h: '44h', d: 'regra atual' },
                { t: '+60 dias', h: '42h', d: 'escala 5×2' },
                { t: '+14 meses', h: '40h', d: 'jornada final' },
              ].map((s, i) => (
                <motion.li key={s.t} variants={fadeUp} className="rounded-2xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}`, backdropFilter: 'blur(6px)' }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: C.muted }}>{s.t}</div>
                  <div className="font-display font-bold text-2xl mt-0.5" style={{ color: i === 2 ? C.coral : C.text }}>{s.h}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{s.d}</div>
                </motion.li>
              ))}
            </motion.ol>
            <p className="text-[11px] mt-2.5 max-w-xl" style={{ color: C.muted }}>
              Prazos contados a partir da promulgação da emenda constitucional.
            </p>
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25, ease }}>
            <Calculadora funcionarios={funcionarios} setFuncionarios={setFuncionarios} horas={horas} setHoras={setHoras} />
          </motion.div>
        </div>
      </section>

      {/* O PROBLEMA */}
      <section className="py-20 md:py-28" style={{ background: C.dark, color: C.darkText }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="max-w-2xl mb-12">
            <Eyebrow dark>O problema</Eyebrow>
            <h2 className="font-display font-bold mt-5 leading-tight" style={{ fontSize: 'clamp(30px,4.4vw,48px)' }}>
              Menos horas, mesmo salário. A maioria vai resolver do jeito mais caro.
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={vp}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Flame,    t: 'Sobrecarregar a equipe', d: 'Mesma demanda em menos horas. Aumenta o erro, o estresse e a rotatividade.' },
              { icon: UserPlus, t: 'Contratar no desespero', d: 'Folha maior, encargos e tempo de treinamento, justo no período de adaptação.' },
              { icon: PhoneOff, t: 'Perder cliente no atendimento', d: 'Mensagem sem resposta no WhatsApp vira venda para o concorrente.' },
            ].map(c => (
              <motion.div key={c.t} variants={fadeUp} className="rounded-2xl p-6"
                style={{ background: C.darkSurface, border: `1px solid ${C.darkBorder}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(249,115,22,0.14)' }}>
                  <c.icon size={20} color="#FB923C" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{c.t}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: C.darkMuted }}>{c.d}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="mt-16 grid lg:grid-cols-[1fr_1.3fr] gap-10 items-start">
            <div>
              <Eyebrow dark>A saída inteligente</Eyebrow>
              <h2 className="font-display font-bold mt-5 leading-tight mb-4" style={{ fontSize: 'clamp(28px,3.8vw,42px)' }}>
                Tire o repetitivo da equipe. Deixe a IA cobrir essas horas.
              </h2>
              <p className="leading-relaxed" style={{ color: C.darkMuted }}>
                IA não repõe estoque nem serve mesa. Mas boa parte do dia da sua equipe vai embora em tarefas que uma
                automação faz em segundos. As horas que sobram vão para o que só gente faz.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {AUTOMATIZAVEL.map(a => (
                <div key={a.title} className="rounded-2xl p-5 glow-card"
                  style={{ background: 'rgba(241,245,249,0.04)', border: `1px solid ${C.darkBorder}` }}>
                  <a.icon size={20} color="#A5B4FC" />
                  <h3 className="font-semibold mt-3 mb-1">{a.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.darkMuted }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* O CURSO */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="max-w-2xl mb-12">
            <Eyebrow>O curso</Eyebrow>
            <h2 className="font-display font-bold mt-5 leading-tight mb-4" style={{ fontSize: 'clamp(30px,4.4vw,48px)' }}>
              IA na prática para atravessar a <span className="text-gradient">5×2</span>, sem precisar programar.
            </h2>
            <p className="text-lg" style={{ color: C.muted }}>
              Feito para dono de empresa e equipe administrativa. Você sai com as automações montadas e um plano de
              transição para o seu negócio.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={vp}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid md:grid-cols-2 gap-5">
            {MODULOS.map(m => (
              <motion.div key={m.n} variants={fadeUp} className="glow-card rounded-2xl p-6 md:p-7 flex gap-5"
                style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}>
                <span className="font-mono text-sm font-bold shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: GRAD }}>{m.n}</span>
                <div>
                  <h3 className="font-display font-semibold text-xl mb-1.5">{m.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: C.muted }}>{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="mt-8 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.18)' }}>
            <div className="flex items-center gap-3">
              <Sparkles size={22} color={C.violet} />
              <p className="font-medium">
                Primeira turma em breve. <span style={{ color: C.muted }}>Quem estiver na lista tem condição especial de lançamento.</span>
              </p>
            </div>
            <button onClick={scrollToForm} className="inline-flex items-center gap-1.5 font-semibold shrink-0" style={{ color: C.indigo }}>
              Garantir minha vaga <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* QUEM ENSINA */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-5 md:px-10 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="relative order-2 lg:order-1">
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: '0 30px 80px -20px rgba(79,70,229,0.35)' }}>
              <img src="/nexla.jpg" alt="Equipe Nexla no NASA Space Apps Challenge" className="w-full h-auto block" loading="lazy" />
            </div>
            <p className="mt-3 text-xs font-mono text-center" style={{ color: C.muted }}>
              Equipe Nexla · Vilhena, RO
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="order-1 lg:order-2">
            <Eyebrow>Quem ensina</Eyebrow>
            <h2 className="font-display font-bold mt-5 leading-tight mb-4" style={{ fontSize: 'clamp(28px,3.8vw,42px)' }}>
              Alisson Amorim, fundador da Nexla
            </h2>
            <p className="leading-relaxed mb-6" style={{ color: C.muted }}>
              Engenheiro de automação com IA. À frente da Nexla, constrói agentes de atendimento e automações para
              clínicas, comércios, restaurantes e escritórios. Vai ensinar exatamente o que aplica nos clientes.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                { icon: Trophy, t: 'Top 10 mundial do NASA Space Apps Challenge com a equipe Nexla' },
                { icon: Mic,    t: 'Palestrante, já apresentou para públicos de mais de mil pessoas' },
                { icon: Rocket, t: '30+ projetos entregues e 15+ clientes recorrentes pela Nexla' },
              ].map(i => (
                <li key={i.t} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(79,70,229,0.08)' }}>
                    <i.icon size={16} color={C.indigo} />
                  </span>
                  <span className="pt-1 text-[15px]">{i.t}</span>
                </li>
              ))}
            </ul>
            <a href="/#experimente" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.indigo }}>
              Testar um agente da Nexla agora <ArrowRight size={15} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section id="lista" ref={formRef} className="py-20 md:py-28 relative overflow-hidden" style={{ background: C.dark }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="aurora-1 absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.18] blur-[120px]"
            style={{ background: `radial-gradient(circle, ${C.violet}, transparent)` }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-5 md:px-10">
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="text-center mb-10">
            <Eyebrow dark>Pré-cadastro</Eyebrow>
            <h2 className="font-display font-bold mt-5 leading-tight mb-3" style={{ fontSize: 'clamp(30px,4.4vw,48px)', color: C.darkText }}>
              Entre na lista e saia na frente da 5×2
            </h2>
            <p style={{ color: C.darkMuted }}>Leva 30 segundos. Você recebe tudo pelo WhatsApp.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
            className="rounded-3xl p-6 md:p-9"
            style={{ background: 'rgba(30,41,59,0.75)', border: `1px solid ${C.darkBorder}`, backdropFilter: 'blur(10px)', boxShadow: '0 40px 100px -30px rgba(124,58,237,0.45)' }}>
            <Formulario funcionarios={funcionarios} horas={horas} />
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-8 text-center">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <button onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 font-semibold">
                    {f.q}
                    <ChevronDown size={18} className="shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: C.indigo }} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease }}>
                        <p className="px-5 pb-5 text-[15px] leading-relaxed" style={{ color: C.muted }}>{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <PrimaryBtn onClick={scrollToForm}>Quero entrar na lista <ArrowRight size={18} /></PrimaryBtn>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
        Nexla Automação e Inteligência Artificial · Vilhena, RO ·{' '}
        <a href="/" className="font-medium" style={{ color: C.indigo }}>nexla.com.br</a>
      </footer>

      {/* CTA fixo no celular */}
      <AnimatePresence>
        {showSticky && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ duration: 0.35, ease }}
            className="fixed bottom-0 inset-x-0 z-40 p-3 md:hidden"
            style={{ background: 'linear-gradient(transparent, rgba(241,245,249,0.95) 30%)' }}>
            <PrimaryBtn onClick={scrollToForm} full>Entrar na lista do curso <ArrowRight size={18} /></PrimaryBtn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
