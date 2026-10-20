import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, ChevronDown, Loader2, MessageCircle, Plus, Minus } from 'lucide-react';

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
  { title: 'Atendimento no WhatsApp', desc: 'Responder dúvidas, preço, horário e status de pedido, 24h por dia.' },
  { title: 'Agendamentos',            desc: 'Marcar, confirmar e lembrar o cliente sem ninguém no telefone.' },
  { title: 'Orçamentos e cobranças',  desc: 'Enviar orçamento, follow-up e lembrete de pagamento automaticamente.' },
  { title: 'Planilhas e relatórios',  desc: 'Dados que se atualizam sozinhos e relatório pronto no seu WhatsApp.' },
];

const MODULOS = [
  { n: '01', title: 'Mapeie as horas que vão faltar', desc: 'Descubra onde sua equipe gasta tempo com tarefa repetitiva e o que dá para tirar dela.' },
  { n: '02', title: 'Atendimento com IA no WhatsApp', desc: 'Monte um agente que responde, qualifica e agenda clientes com o jeito da sua empresa.' },
  { n: '03', title: 'Rotinas de escritório no automático', desc: 'Planilhas, relatórios e avisos rodando sozinhos, com IA lendo documentos por você.' },
  { n: '04', title: 'Seu plano de transição para a 5×2', desc: 'Reorganize escalas e processos para atravessar a mudança sem sobrecarregar ninguém.' },
];

const CREDENCIAIS = [
  { k: 'Top 10', t: 'mundial no NASA Space Apps Challenge, com a equipe Nexla.' },
  { k: '1.000+', t: 'pessoas na plateia. Palestrante para públicos de mais de mil pessoas.' },
  { k: '30+',    t: 'projetos entregues e 15+ clientes recorrentes pela Nexla.' },
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
      className={`lp-btn inline-flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-[6px] font-medium text-[15px] disabled:opacity-60 ${full ? 'w-full' : ''}`}>
      {children}
    </button>
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

  return (
    <div className="rounded-[8px]"
      style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 1px 0 rgba(15,23,42,0.04), 0 40px 80px -48px rgba(15,23,42,0.45)' }}>
      <div className="flex items-center justify-between px-6 md:px-7 py-3.5" style={{ borderBottom: `1px solid ${T.rule}` }}>
        <span className="lp-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: T.ink }}>Simulador de horas</span>
        <span className="lp-mono text-[11px]" style={{ color: T.mute }}>estimativa</span>
      </div>

      <div className="p-6 md:p-7">
        <h3 className="lp-serif text-[26px] leading-[1.15] mb-7" style={{ color: T.ink }}>
          Quantas horas sua empresa vai perder?
        </h3>

        <label className="block mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: T.ink2 }}>Funcionários com carteira</span>
            <span className="lp-serif lp-num text-[30px] leading-none" style={{ color: T.ink }}>{funcionarios}</span>
          </div>
          <input type="range" min={1} max={100} value={funcionarios}
            onChange={e => setFuncionarios(Number(e.target.value))}
            className="lp-range" style={{ ['--p' as string]: `${sliderPct}%` }} aria-label="Número de funcionários" />
          <div className="flex justify-between lp-mono text-[10.5px]" style={{ color: T.mute }}>
            <span>1</span><span>100+</span>
          </div>
        </label>

        <div className="mb-7">
          <span className="block text-sm font-medium mb-2" style={{ color: T.ink2 }}>Jornada semanal hoje</span>
          <div className="grid grid-cols-3 rounded-[6px] overflow-hidden" style={{ border: `1px solid ${T.rule}` }} role="radiogroup">
            {[44, 42, 40].map((h, i) => {
              const on = horas === h;
              return (
                <button key={h} type="button" role="radio" aria-checked={on} onClick={() => setHoras(h)}
                  className="lp-num h-11 text-sm font-medium transition-colors"
                  style={{
                    background: on ? T.ink : 'transparent', color: on ? T.paper : T.ink2,
                    borderLeft: i ? `1px solid ${T.rule}` : 'none',
                  }}>
                  {h}h
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-6" style={{ borderTop: `1px solid ${T.rule}` }}>
          <div className="lp-mono text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: T.loss }}>
            Ao fim da transição · 40h
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <motion.span key={final} initial={{ opacity: 0.35, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
              className="lp-serif lp-num leading-none" style={{ fontSize: 'clamp(52px,6.5vw,68px)', color: T.loss }}>
              −{fmt(final)}h
            </motion.span>
            <span className="text-sm" style={{ color: T.ink2 }}>por semana</span>
          </div>

          {/* Capacidade de horas: hoje × depois da transição */}
          <div className="mt-5">
            <div className="flex h-2.5 rounded-[2px] overflow-hidden" aria-hidden>
              <motion.div animate={{ width: `${pctDepois}%` }} transition={{ duration: 0.5, ease }} style={{ background: T.ink }} />
              <div className="lp-hatch flex-1" />
            </div>
            <div className="flex justify-between mt-2 lp-mono lp-num text-[10.5px]" style={{ color: T.mute }}>
              <span>Depois: {fmt(capDepois)} h/sem</span>
              <span>Hoje: {fmt(capHoje)} h/sem</span>
            </div>
          </div>

          {final > 0 ? (
            <dl className="mt-5 text-sm">
              {[
                { k: 'Primeira etapa (42h)', v: fase1 > 0 ? `−${fmt(fase1)} h/sem` : '—' },
                { k: 'Por mês',              v: `${fmt(mes)} h` },
                { k: 'Equivale a',           v: `${fmt(pessoas, Number.isInteger(pessoas) || pessoas >= 10 ? 0 : 1)} funcionário${pessoas >= 2 ? 's' : ''} de 40h` },
              ].map(r => (
                <div key={r.k} className="flex justify-between gap-4 py-2.5" style={{ borderTop: `1px dashed ${T.rule}` }}>
                  <dt style={{ color: T.mute }}>{r.k}</dt>
                  <dd className="lp-num font-medium text-right" style={{ color: T.ink }}>{r.v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-5 text-sm leading-relaxed" style={{ color: T.ink2 }}>
              Sua jornada já está no novo limite. Ainda dá para ganhar tempo automatizando o repetitivo.
            </p>
          )}
        </div>

        <div className="mt-6">
          <PrimaryBtn onClick={scrollToForm} full>Quero cobrir essas horas <Arrow /></PrimaryBtn>
        </div>
        <p className="lp-mono text-[10.5px] text-center mt-3" style={{ color: T.mute }}>
          Diferença de jornada × número de funcionários.
        </p>
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
                className="w-full flex items-center gap-3.5 text-left rounded-[4px] px-4 py-3.5 transition-colors"
                style={{
                  background: on ? 'rgba(241,245,249,0.07)' : 'transparent',
                  border: `1px solid ${on ? T.darkText : T.darkRule}`,
                }}>
                <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                  style={{ border: `1.5px solid ${on ? T.darkText : 'rgba(241,245,249,0.35)'}` }}>
                  {on && <span className="w-2 h-2 rounded-full" style={{ background: T.darkText }} />}
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

      <PrimaryBtn type="submit" disabled={status === 'sending'} full tone="light">
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

  useEffect(() => { loadPixel(); }, []);

  const load = (delay: number) => ({
    initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease },
  });

  return (
    <div className="lp min-h-screen overflow-x-hidden" style={{ background: T.paper, color: T.ink }}>
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
            <motion.div {...load(0)} className="flex items-center gap-2.5 mb-8">
              <span className="w-1.5 h-1.5" style={{ background: T.loss }} />
              <span className="lp-mono text-[11.5px] uppercase tracking-[0.14em]" style={{ color: T.ink2 }}>
                Fim da escala 6×1 aprovado pelo Congresso
              </span>
            </motion.div>

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
            variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid md:grid-cols-3 gap-x-10 gap-y-10">
            {PROBLEMAS.map((c, i) => (
              <motion.li key={c.t} variants={fadeUp} className="pt-6" style={{ borderTop: `1px solid ${T.ink}` }}>
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
            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp} className="lg:sticky lg:top-12">
              <h2 className="lp-serif font-medium leading-[1.08] mb-6" style={{ fontSize: 'clamp(32px,4vw,50px)' }}>
                Tire o repetitivo da equipe. Deixe a IA cobrir essas horas.
              </h2>
              <p className="text-[17px] leading-[1.65]" style={{ color: T.darkMute }}>
                IA não repõe estoque nem serve mesa. Mas boa parte do dia da sua equipe vai embora em tarefas que uma
                automação faz em segundos. As horas que sobram vão para o que só gente faz.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={vp}
              variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
              <div className="hidden sm:grid grid-cols-[minmax(0,15rem)_1fr] gap-8 pb-3 lp-mono text-[10.5px] uppercase tracking-[0.14em]"
                style={{ color: T.darkMute }}>
                <span>Tarefa</span><span>O que a automação assume</span>
              </div>
              {AUTOMATIZAVEL.map(a => (
                <motion.div key={a.title} variants={fadeUp}
                  className="grid sm:grid-cols-[minmax(0,15rem)_1fr] gap-x-8 gap-y-1.5 py-6"
                  style={{ borderTop: `1px solid ${T.darkRule}` }}>
                  <h3 className="lp-serif text-[23px] leading-tight">{a.title}</h3>
                  <p className="text-[15px] leading-relaxed sm:pt-1" style={{ color: T.darkMute }}>{a.desc}</p>
                </motion.div>
              ))}
              <div style={{ borderTop: `1px solid ${T.darkRule}` }} />
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
              <div className="rounded-[6px] overflow-hidden" style={{ border: `1px solid ${T.rule}` }}>
                <img src="/nexla.jpg" alt="Equipe Nexla no NASA Space Apps Challenge" className="w-full h-auto block" loading="lazy" />
              </div>
              <figcaption className="mt-3 lp-mono text-[11px]" style={{ color: T.mute }}>
                Equipe Nexla no NASA Space Apps Challenge · Vilhena, RO
              </figcaption>
            </motion.figure>

            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}>
              <h2 className="lp-serif font-medium leading-[1.05]" style={{ fontSize: 'clamp(34px,4.2vw,52px)' }}>
                Alisson Amorim
              </h2>
              <p className="lp-mono text-[11.5px] uppercase tracking-[0.14em] mt-3 mb-6" style={{ color: T.mute }}>
                Fundador da Nexla · Engenheiro de automação com IA
              </p>
              <p className="text-[17px] leading-[1.65] mb-10" style={{ color: T.ink2 }}>
                À frente da Nexla, constrói agentes de atendimento e automações para clínicas, comércios, restaurantes e
                escritórios. Vai ensinar exatamente o que aplica nos clientes.
              </p>
              <dl className="mb-10" style={{ borderBottom: `1px solid ${T.rule}` }}>
                {CREDENCIAIS.map(c => (
                  <div key={c.k} className="grid grid-cols-[6.5rem_1fr] gap-6 py-5 items-baseline" style={{ borderTop: `1px solid ${T.rule}` }}>
                    <dt className="lp-serif lp-num text-[30px] leading-none">{c.k}</dt>
                    <dd className="text-[15px] leading-relaxed" style={{ color: T.ink2 }}>{c.t}</dd>
                  </div>
                ))}
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
                Entre na lista e saia na frente da 5×2.
              </h2>
              <p className="text-[17px] leading-[1.65] mb-10" style={{ color: T.darkMute }}>
                Leva 30 segundos. Você recebe tudo pelo WhatsApp.
              </p>
              <ul className="space-y-3.5">
                {['Gratuito e sem compromisso', 'Novidades do curso antes de todo mundo', 'Condição especial de lançamento'].map(t => (
                  <li key={t} className="flex items-center gap-3 text-[15px]">
                    <Check size={16} strokeWidth={2} color="#4ADE80" /> {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={vp} variants={fadeUp}
              className="rounded-[8px] p-6 md:p-8" style={{ background: T.dark2, border: `1px solid ${T.darkRule}` }}>
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
              <p className="text-[15px] leading-relaxed mb-8" style={{ color: T.ink2 }}>
                Ficou alguma dúvida?{' '}
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-4 decoration-1" style={{ color: T.accent }}>
                  Fale com a gente no WhatsApp
                </a>.
              </p>
              <div className="hidden lg:block">
                <PrimaryBtn onClick={scrollToForm}>Quero entrar na lista <Arrow /></PrimaryBtn>
              </div>
            </div>

            <div style={{ borderBottom: `1px solid ${T.rule}` }}>
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} style={{ borderTop: `1px solid ${T.rule}` }}>
                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}
                      className="w-full flex items-center justify-between gap-6 text-left py-6">
                      <span className="lp-serif text-[22px] leading-snug">{f.q}</span>
                      <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
                        style={{ border: `1px solid ${T.rule}`, color: T.ink }}>
                        {open ? <Minus size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.75} />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease }} className="overflow-hidden">
                          <p className="pb-6 pr-14 text-[16px] leading-relaxed" style={{ color: T.ink2 }}>{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lg:hidden mt-10">
            <PrimaryBtn onClick={scrollToForm} full>Quero entrar na lista <Arrow /></PrimaryBtn>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${T.rule}` }}>
        <div className={`${WRAP} py-8 flex flex-col sm:flex-row gap-2 justify-between text-[13px]`} style={{ color: T.mute }}>
          <span>Nexla Automação e Inteligência Artificial · Vilhena, RO</span>
          <a href="/" className="underline underline-offset-4 decoration-1" style={{ color: T.ink }}>nexla.com.br</a>
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
