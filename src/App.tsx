import { useState, useEffect, useRef, useMemo } from 'react';
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring as useFMSpring,
  useMotionValue, useInView, animate,
} from 'framer-motion';
import Lenis from 'lenis';
import {
  Bot, Zap, Package, Headphones, Send, BookOpen,
  Clock, Sliders, Link2, TrendingUp, Server, LifeBuoy,
  Calendar,
  MessageCircle, ArrowRight, CheckCircle2,
  Search, Settings, BarChart3, Activity, Users, FileText,
  ChevronDown, ChevronLeft, ChevronRight, Sparkles,
  Dumbbell, HardHat, Store, Stethoscope, Plane,
  UtensilsCrossed, Scissors, Scale, Calculator, Wand2,
  RefreshCw, Play, X, Volume2, VolumeX,
} from 'lucide-react';

/* ─── Palette ────────────────────────────────────────────────── */
const C = {
  bg: '#FAFAF8', surface: '#FFFFFF', soft: '#F4F1EC',
  indigo: '#4F46E5', violet: '#7C3AED', coral: '#F97316', green: '#22C55E',
  text: '#0F172A', muted: '#64748B', border: 'rgba(15,23,42,0.08)',
  dark: '#1E1B4B', darkSurface: '#272466',
  darkText: '#EDE9FE', darkMuted: 'rgba(237,233,254,0.6)', darkBorder: 'rgba(237,233,254,0.1)',
} as const;

/* ─── Motion config ──────────────────────────────────────────── */
const ease = [0.16, 1, 0.3, 1] as const;
const vp   = { once: true, margin: '-70px' } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09 } },
};

/* ─── Data ───────────────────────────────────────────────────── */
const STATS = [
  { value: '1',   label: 'ano de mercado' },
  { value: '30+', label: 'projetos entregues' },
  { value: '15+', label: 'clientes recorrentes' },
  { value: '6+',  label: 'setores atendidos' },
];
const SERVICES = [
  { n:'01', icon:Bot,        title:'Agente de IA no WhatsApp',  desc:'Atendimento automatizado, triagem e agendamentos — 24h por dia, 7 dias por semana.' },
  { n:'02', icon:Zap,        title:'Automação de Processos',     desc:'Integração entre sistemas, notificações automáticas e fluxos operacionais sem intervenção humana.' },
  { n:'03', icon:Package,    title:'Soluções SaaS Próprias',     desc:'Plataformas prontas para saúde, barbearias e educação com IA embarcada e painel central.' },
  { n:'04', icon:Headphones, title:'Implantação e Suporte',      desc:'Briefing estruturado, entrega sob medida e acompanhamento contínuo do resultado.' },
  { n:'05', icon:Send,       title:'Disparo Inteligente',        desc:'Réguas de cobrança, campanhas segmentadas e comunicação em massa via WhatsApp.' },
  { n:'06', icon:BookOpen,   title:'Base de Conhecimento',       desc:'Indexação de documentos e FAQs para alimentar o agente com informações da sua empresa.' },
];
const SHOWCASE = [
  {
    image: '/ChatGPT Image 18 de mai. de 2026, 16_28_48.png',
    tag: 'Atendimento 24/7 com IA',
    title: 'Atenda 10x mais clientes no WhatsApp — sem contratar ninguém',
    desc: 'Cada mensagem sem resposta é um cliente que foi para o concorrente. Nossa IA atende, qualifica, agenda e cobra automaticamente — com a personalidade da sua marca e o conhecimento do seu negócio.',
    bullets: [
      'Resposta em segundos, 24 horas por dia, todos os dias',
      'Agendamentos, cobranças e triagem 100% automáticos',
      'Reduz drasticamente o custo de atendimento já no 1º mês',
    ],
  },
  {
    image: '/ChatGPT Image 18 de mai. de 2026, 16_44_07.png',
    tag: 'Plataforma para Clínicas e Consultórios',
    title: 'CliniSac — Sua clínica inteira organizada num painel só',
    desc: 'Acabou a confusão de WhatsApp pessoal, agenda em papel e paciente esquecido. O CliniSac centraliza todos os canais, distribui o atendimento por setor e mostra em tempo real o que a sua equipe está fazendo.',
    bullets: [
      'WhatsApp e Instagram unificados em um só painel',
      'Distribuição automática de conversas por setor da clínica',
      'Relatórios em tempo real e IA respondendo na hora',
    ],
    href: 'https://www.clinisac.com.br/',
    ctaLabel: 'Conhecer o CliniSac',
  },
  {
    image: '/ChatGPT Image 18 de mai. de 2026, 16_55_19.png',
    tag: 'Plataforma para Escritórios de Advocacia',
    title: 'AdvoSac — O escritório que responde primeiro fecha o caso',
    desc: 'No mercado jurídico, a primeira resposta define quem o cliente vai contratar. Centralize todos os canais de atendimento, distribua casos por advogado e responda com a agilidade que o cliente espera de um escritório sério.',
    bullets: [
      'Atendimento centralizado de clientes e prospects',
      'Distribuição automática de casos por área e advogado',
      'IA integrada e acompanhamento em tempo real do funil',
    ],
    href: 'https://nexla-adv.vercel.app/',
    ctaLabel: 'Conhecer o AdvoSac',
  },
  {
    image: '/ChatGPT Image 19 de mai. de 2026, 07_57_51.png',
    tag: 'Software Sob Medida',
    title: 'Seu próprio sistema, feito do jeito do seu negócio',
    desc: 'Saia do refém de planilhas confusas, sistemas genéricos e mensalidades caras. Construímos plataformas SaaS e sistemas internos sob medida — pensados para o seu fluxo e prontos para escalar junto com a operação.',
    bullets: [
      'Arquitetura escalável pronta para crescer com sua empresa',
      'Design e usabilidade no padrão das maiores SaaS do mercado',
      'Tecnologia de ponta com segurança e performance enterprise',
    ],
  },
  {
    image: '/ChatGPT Image 19 de mai. de 2026, 08_24_01.png',
    tag: 'Sites e Landing Pages',
    title: 'Sites que vendem — não só cartão de visita digital',
    desc: 'Site bonito é o mínimo. O nosso é projetado para converter: design que impressiona, performance que o Google ama e estrutura pensada para transformar visitante em cliente todos os dias.',
    bullets: [
      'Sites institucionais e landing pages otimizadas para conversão',
      'Lojas virtuais completas integradas a meios de pagamento',
      'SEO técnico, performance e design responsivo de alto padrão',
    ],
  },
  {
    image: '/ChatGPT Image 19 de mai. de 2026, 08_36_53.png',
    tag: 'Apps Android e iOS',
    title: 'Seu app na tela inicial do seu cliente — todos os dias',
    desc: 'Ter um aplicativo é colocar sua marca a um toque de distância do seu cliente. Desenvolvemos apps Android e iOS com design impecável, performance superior e cuidado em cada detalhe da experiência.',
    bullets: [
      'Apps nativos para Android e iOS com identidade própria',
      'Publicação acompanhada na Google Play e App Store',
      'Suporte, atualizações e evolução contínua do produto',
    ],
  },
  {
    image: '/ChatGPT Image 19 de mai. de 2026, 09_10_02.png',
    tag: 'Automação & Integrações',
    title: 'Pare de fazer no manual o que o sistema deveria fazer sozinho',
    desc: 'Tarefa repetitiva é dinheiro indo embora todo dia. Conectamos seus sistemas e automatizamos fluxos inteiros — para que a sua equipe pare de copiar e colar dado e comece a fechar negócio.',
    bullets: [
      'Integrações com WhatsApp, CRM, ERP, APIs e Google Workspace',
      'Fluxos automáticos entre planilhas, e-mails e sistemas internos',
      'Redução drástica de retrabalho, erros e custos operacionais',
    ],
  },
];
const STEPS = [
  { n:'01', icon:Search,    title:'Diagnóstico', desc:'Entendemos seu processo em uma conversa sem compromisso. Mapeamos gargalos e oportunidades reais.' },
  { n:'02', icon:Settings,  title:'Automação',   desc:'Construímos a solução sob medida: agentes, integrações e fluxos que se encaixam no seu dia a dia.' },
  { n:'03', icon:BarChart3, title:'Resultados',  desc:'Acompanhamos a evolução, medimos o impacto e continuamos otimizando com você.' },
];
const CASES = [
  { icon:Activity, sector:'Saúde e Diagnóstico',      title:'Agente para Clínica Médica',      desc:'Triagem, agendamentos e lembretes via WhatsApp — 24/7 sem custo adicional.',       tag:'Atendimento 24/7' },
  { icon:Calendar, sector:'Barbearias e Estética',    title:'Plataforma SaaS com IA',          desc:'Painel central, confirmações automáticas e gestão de agenda inteligente.',         tag:'Gestão centralizada' },
  { icon:Users,    sector:'Cooperativas Financeiras', title:'Automação Administrativa',         desc:'Integração de sistemas e comunicação automática em massa com cooperados.',         tag:'Operação escalável' },
  { icon:FileText, sector:'Energia e Utilities',      title:'Conformidade Regulatória',         desc:'Automação de relatórios e fluxos de comunicação para concessionárias de energia.', tag:'Conformidade garantida' },
];
const SECTORS = ['Saúde e Diagnóstico','Cooperativas Financeiras','Educação e Escolas','Barbearias e Estética','Energia e Utilities','Jurídico e Contábil'];
const DIFFERENTIALS = [
  { icon:Clock,      title:'Disponível 24/7',        desc:'Agentes rodando sem interrupção, sem custo de hora extra ou folga.' },
  { icon:Sliders,    title:'100% Customizável',      desc:'Nenhuma solução genérica — cada automação parte do processo real do cliente.' },
  { icon:Link2,      title:'Integra com Tudo',       desc:'CRMs, ERPs, planilhas, Google Workspace — se tem API, conectamos.' },
  { icon:TrendingUp, title:'ROI Mensurável',         desc:'Clientes eliminaram custos fixos de pessoal já no primeiro ano de uso.' },
  { icon:Server,     title:'Infraestrutura Própria', desc:'Soluções auto-hospedadas — mais controle e dados do cliente protegidos.' },
  { icon:LifeBuoy,   title:'Suporte Contínuo',       desc:'Não entregamos e sumimos — acompanhamos a evolução da solução.' },
];
const STACK = ['n8n','Evolution API','Claude (Anthropic)','Supabase','React / Next.js','Easypanel VPS','Azure OpenAI','Stripe'];

const DEPOIMENTOS: Array<{
  id: number;
  type: 'image' | 'video';
  src: string;
  name: string;
  role: string;
  sector: string;
}> = [
  { id: 1, type: 'image', src: '/depoimentos/depoimento1.jpg', name: 'Cliente Nexla',  role: 'Depoimento real',          sector: 'Saúde' },
  { id: 2, type: 'video', src: '/depoimentos/depoimento2.mp4', name: 'Cliente Nexla',  role: 'Depoimento real',          sector: 'Atendimento' },
  { id: 3, type: 'video', src: '/depoimentos/depoimento3.mp4', name: 'Cliente Nexla',  role: 'Depoimento real',          sector: 'Operação' },
  { id: 4, type: 'video', src: '/depoimentos/depoimento4.mp4', name: 'Cliente Nexla',  role: 'Depoimento real',          sector: 'Automação' },
  { id: 5, type: 'video', src: '/depoimentos/depoimento5.mp4', name: 'Cliente Nexla',  role: 'Depoimento real',          sector: 'Resultados' },
];

const AGENTS = [
  { id:'academia',     name:'Academia',         icon:Dumbbell,        desc:'Atende alunos, vende planos e tira dúvidas',          url:'https://n8n.nexladesenvolvimento.com.br/webhook/academia',       welcome:'Olá! Sou o agente da academia. Como posso te ajudar hoje?' },
  { id:'construcao',   name:'Construção',       icon:HardHat,         desc:'Orçamentos, materiais e dúvidas técnicas',            url:'https://n8n.nexladesenvolvimento.com.br/webhook/construcao',     welcome:'Oi! Posso ajudar com orçamentos, materiais ou prazos. O que precisa?' },
  { id:'loja',         name:'Loja',             icon:Store,           desc:'Atendimento, produtos e pedidos',                     url:'https://n8n.nexladesenvolvimento.com.br/webhook/entrada',        welcome:'Olá! Bem-vindo à nossa loja. Está procurando algo específico?' },
  { id:'clinica',      name:'Clínica',          icon:Stethoscope,     desc:'Agendamento, triagem e dúvidas',                      url:'https://n8n.nexladesenvolvimento.com.br/webhook/clinica',        welcome:'Oi! Sou o agente da clínica. Quer agendar uma consulta ou tirar uma dúvida?' },
  { id:'manicure',     name:'Manicure',         icon:Sparkles,        desc:'Agendamento e dúvidas sobre serviços',                url:'https://n8n.nexladesenvolvimento.com.br/webhook/manicure',       welcome:'Oi! Quer agendar um horário ou conhecer os serviços?' },
  { id:'turismo',      name:'Turismo',          icon:Plane,           desc:'Pacotes, destinos e reservas',                        url:'https://n8n.nexladesenvolvimento.com.br/webhook/turismo',        welcome:'Olá! Pra onde você quer viajar?' },
  { id:'restaurante',  name:'Restaurante',      icon:UtensilsCrossed, desc:'Cardápio, pedidos e reservas',                        url:'https://n8n.nexladesenvolvimento.com.br/webhook/comida',         welcome:'Olá! Quer ver o cardápio ou fazer um pedido?' },
  { id:'barbearia',    name:'Barbearia',        icon:Scissors,        desc:'Agendamento de cortes e serviços',                    url:'https://n8n.nexladesenvolvimento.com.br/webhook/barbearia',      welcome:'Fala, chefe! Bora marcar um corte?' },
  { id:'advocacia',    name:'Advocacia',        icon:Scale,           desc:'Triagem jurídica e agendamento',                      url:'https://n8n.nexladesenvolvimento.com.br/webhook/advocacia',      welcome:'Olá! Em que posso te ajudar juridicamente?' },
  { id:'contabilidade',name:'Contabilidade',    icon:Calculator,      desc:'Dúvidas fiscais e atendimento',                       url:'https://n8n.nexladesenvolvimento.com.br/webhook/contabilidade',  welcome:'Olá! Posso ajudar com dúvidas fiscais, impostos ou abertura de empresa.' },
  { id:'custom',       name:'Crie seu agente',  icon:Wand2,           desc:'Monte um agente do zero — diga o que ele faz',        url:'https://n8n.nexladesenvolvimento.com.br/webhook/CriaAgenteTeste',welcome:'Vamos criar um agente do zero! Me conte: qual o nome do seu negócio e o que ele faz?' },
] as const;
type Agent = typeof AGENTS[number];

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getUserId(): string {
  if (typeof window === 'undefined') return newId();
  try {
    const k = 'nexla_demo_user_id';
    let id = localStorage.getItem(k);
    if (!id) { id = newId(); localStorage.setItem(k, id); }
    return id;
  } catch {
    return newId();
  }
}

async function callAgent(url: string, message: string, sessionId: string, userId: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      message,
      timestamp: new Date().toISOString(),
      sessionId,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data) && data[0]) {
      const first = data[0];
      return first.output || first.reply || first.message || first.text || JSON.stringify(first);
    }
    if (data?.output) return data.output;
    if (data?.reply)  return data.reply;
    if (data?.message)return data.message;
    if (data?.text)   return data.text;
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  } catch {
    return text || 'Sem resposta.';
  }
}


/* ─── StarField ──────────────────────────────────────────────── */
function StarField({ count = 90 }: { count?: number }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x:    Math.random() * 100,
    y:    Math.random() * 100,
    size: Math.random() < 0.15 ? Math.random() * 1.8 + 1.5   // big stars
        : Math.random() < 0.40 ? Math.random() * 1.0 + 0.8   // medium
        :                        Math.random() * 0.6 + 0.3,   // tiny
    baseOpacity: Math.random() * 0.5 + 0.15,
    dur:  Math.random() * 4 + 2,
    del:  Math.random() * 6,
    // occasional blue-tinted star
    color: Math.random() < 0.2 ? '#C4B5FD' : '#FFFFFF',
  })), [count]);

  // 5 shooting stars with staggered delays
  const shoots = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    id: i,
    startY: Math.random() * 60 + 5,      // % from top
    delay:  i * 4.5 + Math.random() * 3, // staggered
    dur:    Math.random() * 0.8 + 0.9,
    width:  Math.random() * 80 + 60,
    repeatDelay: Math.random() * 10 + 8,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Static twinkling stars */}
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{ left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size, background:s.color }}
          animate={{ opacity:[s.baseOpacity * 0.3, s.baseOpacity, s.baseOpacity * 0.3], scale:[1, 1.4, 1] }}
          transition={{ duration:s.dur, delay:s.del, repeat:Infinity, ease:'easeInOut' }}
        />
      ))}

      {/* Shooting stars */}
      {shoots.map(s => (
        <motion.div
          key={`shoot-${s.id}`}
          className="absolute"
          style={{ top:`${s.startY}%`, left:0, height:'1.5px', width:s.width,
            background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(196,181,253,0.6), transparent)',
            borderRadius:'99px' }}
          initial={{ x:'-10vw', opacity:0 }}
          animate={{ x:'115vw', opacity:[0, 1, 1, 0] }}
          transition={{ duration:s.dur, delay:s.delay, repeat:Infinity, repeatDelay:s.repeatDelay, ease:'easeIn' }}
        />
      ))}
    </div>
  );
}

/* ─── Scroll Progress Bar ────────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useFMSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[100] origin-left"
      style={{ scaleX, background: `linear-gradient(90deg, ${C.indigo}, ${C.violet}, ${C.coral})` }}
    />
  );
}

/* ─── Mouse Spotlight ────────────────────────────────────────── */
function MouseSpotlight() {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  useEffect(() => {
    const fn = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[2] hidden md:block"
      style={{ background: `radial-gradient(700px circle at ${pos.x}px ${pos.y}px, rgba(79,70,229,0.055), transparent 45%)` }} />
  );
}

/* ─── Floating Particles ─────────────────────────────────────── */
function Particles() {
  const pts = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x:  Math.random() * 100,
    y:  Math.random() * 100,
    sz: Math.random() * 3 + 1.5,
    dur: Math.random() * 12 + 10,
    del: Math.random() * 6,
    color: [C.indigo, C.violet, C.coral][i % 3],
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pts.map(p => (
        <motion.div key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.sz, height: p.sz, background: p.color }}
          animate={{ y: [0, -32, 0], opacity: [0.12, 0.5, 0.12] }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─── 3D Tilt Card ───────────────────────────────────────────── */
function TiltCard({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useFMSpring(rx, { stiffness: 280, damping: 22 });
  const sy = useFMSpring(ry, { stiffness: 280, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    rx.set(-y * 10);
    ry.set( x * 10);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div ref={ref}
      className={`glow-card rounded-2xl ${className}`}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 900, ...style }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ y: -7, boxShadow: '0 20px 60px rgba(79,70,229,0.14)' }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Magnetic Button ────────────────────────────────────────── */
function MagneticBtn({ children, onClick, href, style = {}, className = '' }: {
  children: React.ReactNode; onClick?: () => void;
  href?: string; style?: React.CSSProperties; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const mx  = useMotionValue(0);
  const my  = useMotionValue(0);
  const sx  = useFMSpring(mx, { stiffness: 260, damping: 20 });
  const sy  = useFMSpring(my, { stiffness: 260, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left - r.width  / 2) * 0.28);
    my.set((e.clientY - r.top  - r.height / 2) * 0.28);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const Tag = href ? motion.a : motion.button;
  return (
    <Tag
      ref={ref as any}
      href={href}
      onClick={onClick}
      target={href ? '_blank' : undefined}
      rel={href ? 'noopener noreferrer' : undefined}
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden ${className}`}
      style={{ x: sx, y: sy, ...style }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 25 }}
    >
      {children}
      {/* Ripple shine */}
      <motion.span
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)' }}
      />
    </Tag>
  );
}

/* ─── Animated Counter ───────────────────────────────────────── */
function AnimatedCounter({ target, dark = false }: { target: string; dark?: boolean }) {
  const numeric = parseInt(target.replace(/\D/g, ''));
  const suffix  = target.replace(/\d/g, '');
  const count   = useMotionValue(0);
  const rounded = useTransform(count, v => `${Math.round(v)}${suffix}`);
  const ref     = useRef<HTMLSpanElement>(null);
  const inView  = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(count, numeric, { duration: 1.8, ease: 'easeOut' });
    return () => ctrl.stop();
  }, [inView, numeric, count]);

  return <motion.span ref={ref} style={{ color: dark ? C.darkText : C.indigo }}>{rounded}</motion.span>;
}

/* ─── Word-by-word animated heading ─────────────────────────── */
function AnimatedHeading({ text, className = '', style = {} }: {
  text: string; className?: string; style?: React.CSSProperties; dark?: boolean;
}) {
  const words = text.split(' ');
  return (
    <motion.h2
      className={className}
      style={style}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
    >
      {words.map((word, i) => (
        <motion.span key={i} className="inline-block mr-[0.28em]"
          variants={{
            hidden: { opacity: 0, y: 28 },
            show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
          }}>
          {word}
        </motion.span>
      ))}
    </motion.h2>
  );
}

/* ─── Eyebrow label ──────────────────────────────────────────── */
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <motion.p
      className="font-mono text-xs font-bold tracking-widest uppercase mb-3"
      style={{ color: dark ? 'rgba(167,139,250,0.9)' : C.indigo }}
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease }}
    >
      {children}
    </motion.p>
  );
}

/* ─── Dashboard Mockup ───────────────────────────────────────── */
function DashboardMockup() {
  const metrics = [
    { label:'Atendimentos hoje', value:'247', accent:C.green,  symbol:'↑' },
    { label:'Resposta média',    value:'2.3s', accent:C.indigo, symbol:'⚡' },
    { label:'Satisfação',        value:'98%',  accent:C.coral,  symbol:'★' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 6 }}
      animate={{ opacity: 1, y: 0,  rotateX: 0 }}
      transition={{ duration: 1, delay: 0.6, ease }}
      className="relative hidden lg:block"
      style={{ perspective: 1000 }}
    >
      {/* Main card */}
      <motion.div
        className="float-main relative rounded-2xl overflow-hidden w-[320px]"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(79,70,229,0.16)',
          boxShadow: '0 28px 90px rgba(79,70,229,0.17), 0 4px 20px rgba(0,0,0,0.06)',
        }}
        whileHover={{ boxShadow: '0 36px 100px rgba(79,70,229,0.26), 0 4px 20px rgba(0,0,0,0.07)' }}
        transition={{ duration: 0.35 }}
      >
        {/* Title bar dots */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom:'1px solid rgba(79,70,229,0.08)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:`linear-gradient(135deg,${C.indigo},${C.violet})` }}>
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color:C.text }}>Agente Nexla</p>
            <p className="text-xs flex items-center gap-1.5" style={{ color:C.green }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block pulse-dot" />
              Online agora
            </p>
          </div>
          <div className="ml-auto flex gap-1">
            {['#FF5F57','#FEBC2E','#28C840'].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background:c }} />
            ))}
          </div>
        </div>
        {/* Metrics */}
        <div className="px-5 py-5 space-y-3.5">
          {metrics.map(({ label, value, accent, symbol }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color:C.muted }}>{label}</span>
              <motion.span className="font-display font-bold text-base" style={{ color:accent }}
                initial={{ opacity:0, x:10 }} whileInView={{ opacity:1, x:0 }}
                viewport={{ once:true }} transition={{ duration:0.5, delay:0.2, ease }}>
                {symbol} {value}
              </motion.span>
            </div>
          ))}
          <div className="pt-3" style={{ borderTop:`1px solid ${C.border}` }}>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color:C.muted }}>Taxa de resolução</span>
              <span className="font-semibold" style={{ color:C.indigo }}>94%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(79,70,229,0.1)' }}>
              <div className="bar-fill h-full rounded-full"
                style={{ background:`linear-gradient(90deg,${C.indigo},${C.violet})` }} />
            </div>
          </div>
        </div>
        <div className="px-5 py-3 flex items-center gap-2"
          style={{ background:'rgba(79,70,229,0.04)', borderTop:'1px solid rgba(79,70,229,0.07)' }}>
          <CheckCircle2 size={13} style={{ color:C.green }} />
          <span className="text-xs" style={{ color:C.muted }}>Funcionando 24/7 sem interrupções</span>
        </div>
      </motion.div>

      {/* Badge: new appointments */}
      <motion.div
        className="float-badge absolute -bottom-7 -left-12 rounded-xl px-4 py-3 flex items-center gap-3 w-52"
        style={{
          background:'rgba(255,255,255,0.95)', backdropFilter:'blur(16px)',
          border:'1px solid rgba(34,197,94,0.22)',
          boxShadow:'0 8px 32px rgba(34,197,94,0.14)',
        }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background:'rgba(34,197,94,0.1)' }}>
          <MessageCircle size={14} style={{ color:C.green }} />
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color:C.text }}>+23 agendamentos</p>
          <p className="text-xs" style={{ color:C.muted }}>Hoje automaticamente</p>
        </div>
      </motion.div>

      {/* Badge: AI active */}
      <motion.div
        className="float-main absolute -top-5 -right-6 rounded-xl px-3 py-2 flex items-center gap-2"
        style={{
          background:`linear-gradient(135deg,${C.indigo},${C.violet})`,
          boxShadow:`0 8px 24px rgba(79,70,229,0.35)`,
        }}
      >
        <Sparkles size={13} className="text-white" />
        <span className="text-xs font-semibold text-white">IA ativa</span>
      </motion.div>
    </motion.div>
  );
}

/* ─── Showcase Carousel ─────────────────────────────────────── */
function ShowcaseCarousel({ onCta }: { onCta: () => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir]     = useState(0);
  const total = SHOWCASE.length;

  const go = (next: number) => {
    setDir(next > index ? 1 : -1);
    setIndex((next + total) % total);
  };
  const prev = () => go(index - 1);
  const next = () => go(index + 1);

  /* Auto-advance (paused on hover) */
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setTimeout(() => go(index + 1), 6500);
    return () => clearTimeout(id);
  }, [index, paused, total]);

  /* Touch swipe */
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchX.current = null;
  };

  const slide = SHOWCASE[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative overflow-hidden rounded-3xl"
        style={{
          background: `linear-gradient(135deg, ${C.surface} 0%, ${C.soft} 100%)`,
          border: `1px solid ${C.border}`,
          boxShadow: '0 24px 80px rgba(79,70,229,0.10)',
        }}
      >
        {/* Soft aurora glow inside the card */}
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-30 blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.indigo}, transparent)` }} />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full opacity-20 blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.violet}, transparent)` }} />

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.5, ease }}
            className="relative grid md:grid-cols-2 gap-6 md:gap-12 items-center p-5 sm:p-7 md:p-12"
          >
            {/* Image */}
            <div className="relative flex justify-center md:justify-start">
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${C.violet}, transparent 60%)` }}
              />
              <img
                src={slide.image}
                alt={slide.title}
                className="relative w-full max-w-[260px] sm:max-w-[340px] md:max-w-[440px] h-auto object-contain drop-shadow-2xl"
              />
            </div>

            {/* Text */}
            <div>
              <h3 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl mb-3 md:mb-4 leading-[1.15]"
                style={{ color: C.text }}>
                {slide.title}
              </h3>

              <p className="text-[15px] md:text-lg leading-relaxed mb-5 md:mb-6" style={{ color: C.muted }}>
                {slide.desc}
              </p>

              <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8">
                <motion.li
                  className="flex items-start gap-2.5 md:gap-3 text-[14px] md:text-base leading-snug"
                  style={{ color: C.text }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <CheckCircle2 size={17} className="shrink-0 mt-0.5" style={{ color: C.green }} />
                  <span>{slide.tag}</span>
                </motion.li>
                {slide.bullets.map((b, i) => (
                  <motion.li key={b}
                    className="flex items-start gap-2.5 md:gap-3 text-[14px] md:text-base leading-snug"
                    style={{ color: C.text }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                  >
                    <CheckCircle2 size={17} className="shrink-0 mt-0.5" style={{ color: C.green }} />
                    <span>{b}</span>
                  </motion.li>
                ))}
              </ul>

              <MagneticBtn
                onClick={slide.href ? undefined : onCta}
                href={slide.href}
                className="px-5 md:px-6 py-3 rounded-full font-semibold text-sm w-full sm:w-auto justify-center"
                style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, color: '#fff',
                  boxShadow: '0 8px 24px rgba(79,70,229,0.28)' }}>
                {slide.ctaLabel || 'Quero esta solução'} <ArrowRight size={16} />
              </MagneticBtn>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls (hidden when there's only 1 slide) */}
      {total > 1 && (
        <>
          {/* Arrows — only on tablet/desktop; mobile uses swipe + dots */}
          <button
            onClick={prev}
            aria-label="Slide anterior"
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-5 w-11 h-11 rounded-full items-center justify-center shadow-lg transition-transform hover:scale-110"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.indigo }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Próximo slide"
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-5 w-11 h-11 rounded-full items-center justify-center shadow-lg transition-transform hover:scale-110"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.indigo }}
          >
            <ChevronRight size={20} />
          </button>

          {/* Mobile arrows below the card */}
          <div className="flex md:hidden items-center justify-center gap-3 mt-5">
            <button
              onClick={prev}
              aria-label="Slide anterior"
              className="w-11 h-11 rounded-full flex items-center justify-center shadow"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.indigo }}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-mono text-xs font-bold px-2" style={{ color: C.muted }}>
              <span style={{ color: C.indigo }}>{String(index + 1).padStart(2, '0')}</span>
              <span className="opacity-40"> / </span>
              <span>{String(total).padStart(2, '0')}</span>
            </span>
            <button
              onClick={next}
              aria-label="Próximo slide"
              className="w-11 h-11 rounded-full flex items-center justify-center shadow"
              style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, color: '#fff' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center flex-wrap gap-2 mt-4 md:mt-6 px-2">
            {SHOWCASE.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === index ? 28 : 8,
                  background: i === index ? C.indigo : 'rgba(79,70,229,0.25)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Testimonials (Reels-style) ────────────────────────────── */
function TestimonialCard({ t, onClick }: {
  t: typeof DEPOIMENTOS[number];
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play when in view, pause when out
  useEffect(() => {
    if (t.type !== 'video' || !videoRef.current) return;
    const el = videoRef.current;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [t.type]);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className="group relative shrink-0 w-[180px] sm:w-[210px] md:w-[230px] aspect-[9/16] rounded-2xl overflow-hidden"
      style={{
        background: '#000',
        border: `1px solid ${C.border}`,
        boxShadow: '0 12px 30px -10px rgba(15,23,42,0.20), 0 4px 10px -4px rgba(79,70,229,0.18)',
      }}
    >
      {t.type === 'image' ? (
        <img src={t.src} alt={t.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <video
          ref={videoRef}
          src={t.src}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay for legibility */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.35) 100%)' }} />

      {/* Play icon (only on hover) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <Play size={20} className="ml-1" fill={C.indigo} style={{ color: C.indigo }} />
        </div>
      </div>

      {/* Top badge */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full font-mono text-[9px] font-bold tracking-widest uppercase flex items-center gap-1.5"
        style={{ background: 'rgba(255,255,255,0.92)', color: C.indigo, backdropFilter: 'blur(8px)' }}>
        <span>★</span>
        Real
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/70 mb-1">{t.sector}</p>
        <p className="text-[13px] font-display font-bold text-white leading-tight">{t.name}</p>
      </div>
    </motion.button>
  );
}

function TestimonialModal({ items, openIndex, onClose, onIndexChange }: {
  items: typeof DEPOIMENTOS;
  openIndex: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [muted, setMuted] = useState(false);
  const active = items[openIndex];

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && openIndex > 0) onIndexChange(openIndex - 1);
      if (e.key === 'ArrowRight' && openIndex < items.length - 1) onIndexChange(openIndex + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex, items.length, onClose, onIndexChange]);

  // Body scroll lock
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);

  const prev = () => openIndex > 0 && onIndexChange(openIndex - 1);
  const next = () => openIndex < items.length - 1 && onIndexChange(openIndex + 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,7,28,0.94)', backdropFilter: 'blur(24px)' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 md:top-6 md:right-6 w-11 h-11 rounded-full flex items-center justify-center text-white transition-colors"
        style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-widest uppercase text-white/80"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
        {String(openIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
      </div>

      {/* Prev / Next arrows */}
      {openIndex > 0 && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Anterior"
          className="hidden md:flex absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center text-white"
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ChevronLeft size={22} />
        </motion.button>
      )}
      {openIndex < items.length - 1 && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); next(); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Próximo"
          className="hidden md:flex absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center text-white"
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ChevronRight size={22} />
        </motion.button>
      )}

      {/* Player */}
      <motion.div
        key={active.id}
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease }}
        className="relative aspect-[9/16] max-h-[85vh] w-auto rounded-2xl overflow-hidden"
        style={{
          background: '#000',
          boxShadow: '0 40px 100px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {active.type === 'image' ? (
          <img src={active.src} alt={active.name} className="w-full h-full object-cover" />
        ) : (
          <video
            key={active.src}
            src={active.src}
            autoPlay
            loop
            playsInline
            muted={muted}
            className="w-full h-full object-cover"
          />
        )}

        {/* Mute toggle */}
        {active.type === 'video' && (
          <motion.button
            onClick={() => setMuted(m => !m)}
            whileTap={{ scale: 0.92 }}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
            className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
        )}

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-5"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), transparent)' }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60 mb-1.5">
            ★ Cliente Nexla · {active.sector}
          </p>
          <p className="text-[18px] md:text-[20px] font-display font-bold text-white leading-tight">{active.name}</p>
          <p className="text-[13px] text-white/70 mt-0.5">{active.role}</p>
        </div>
      </motion.div>

      {/* Mobile prev/next bottom */}
      <div className="md:hidden absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
        <motion.button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          disabled={openIndex === 0}
          whileTap={{ scale: 0.92 }}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ChevronLeft size={18} />
        </motion.button>
        <motion.button
          onClick={(e) => { e.stopPropagation(); next(); }}
          disabled={openIndex >= items.length - 1}
          whileTap={{ scale: 0.92 }}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function TestimonialsSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        data-lenis-prevent>
        <div className="flex gap-3 md:gap-4 md:justify-center">
          {DEPOIMENTOS.map((t, i) => (
            <TestimonialCard key={t.id} t={t} onClick={() => setOpenIndex(i)} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <TestimonialModal
            items={DEPOIMENTOS}
            openIndex={openIndex}
            onClose={() => setOpenIndex(null)}
            onIndexChange={setOpenIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Demo Chat — Product OS aesthetic ──────────────────────── */
const SUGGESTIONS = ['Como funciona?', 'Quais os preços?', 'Quero saber mais'];

function DemoChat() {
  const [selected, setSelected] = useState<Agent>(AGENTS[0]);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => newId());
  const userIdRef = useRef<string>(getUserId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* Reset when agent changes */
  useEffect(() => {
    setMessages([{ role: 'bot', text: selected.welcome }]);
    setSessionId(newId());
    setInput('');
  }, [selected]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendText = async (text: string) => {
    if (!text || loading) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await callAgent(selected.url, text, sessionId, userIdRef.current);
      setMessages(m => [...m, { role: 'bot', text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido';
      setMessages(m => [...m, { role: 'bot', text: `⚠ Não consegui responder agora (${msg}). Tente novamente em alguns segundos.` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendText(input.trim());
  };

  const reset = () => {
    setMessages([{ role: 'bot', text: selected.welcome }]);
    setSessionId(newId());
    setInput('');
    // Limpa a memória de todas as IAs (fire-and-forget)
    fetch('https://n8n.nexladesenvolvimento.com.br/webhook/memoraria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdRef.current,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => { /* silently ignore */ });
  };

  const ActiveIcon = selected.icon;
  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4 lg:gap-6 items-start min-w-0">

      {/* ══════ Agent Launcher (sidebar) ══════ */}
      <aside className="relative min-w-0">
        {/* Section label with line decoration */}
        <div className="hidden lg:flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${C.indigo}40, transparent)` }} />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase whitespace-nowrap" style={{ color: C.indigo }}>
            11 setores
          </p>
          <div className="h-px flex-1" style={{ background: `linear-gradient(-90deg, ${C.indigo}40, transparent)` }} />
        </div>

        <div className="relative">
          {/* Fade-out gradient indicating scrollable content (desktop only) */}
          <div className="hidden lg:block absolute bottom-0 left-0 right-3 h-12 pointer-events-none z-10 rounded-b-xl"
            style={{ background: `linear-gradient(to bottom, transparent, ${C.soft})` }} />
          <div
            data-lenis-prevent
            className="agent-scroll flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:max-h-[560px] lg:overflow-y-auto pb-1 lg:pb-12 lg:pr-2 -mx-1 px-1 lg:mx-0">
            {AGENTS.map((a, i) => {
              const Icon = a.icon;
              const active = selected.id === a.id;
              return (
                <motion.button key={a.id}
                  onClick={() => setSelected(a)}
                  whileHover={{ x: active ? 0 : 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="group/agent relative shrink-0 lg:w-full flex items-center gap-3 pl-3 pr-3 lg:pr-4 py-2.5 lg:py-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? `${C.indigo}0F` : C.surface,
                    border: `1px solid ${active ? `${C.indigo}55` : C.border}`,
                    boxShadow: active
                      ? `0 8px 24px -10px ${C.indigo}55, inset 1px 0 0 ${C.indigo}`
                      : '0 1px 0 rgba(15,23,42,0.03)',
                  }}
                >
                  {/* Numbered tag */}
                  <span className="hidden lg:block font-mono text-[9px] font-bold tracking-wider"
                    style={{ color: active ? C.indigo : 'rgba(100,116,139,0.5)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Icon tile */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: active
                        ? `linear-gradient(135deg, ${C.indigo}, ${C.violet})`
                        : `${C.indigo}10`,
                      color: active ? '#fff' : C.indigo,
                      boxShadow: active ? `0 6px 16px -4px ${C.indigo}66, inset 0 1px 0 rgba(255,255,255,0.2)` : 'none',
                    }}>
                    <Icon size={16} strokeWidth={active ? 2.2 : 2} />
                  </div>

                  {/* Name + description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold whitespace-nowrap lg:whitespace-normal leading-tight"
                      style={{ color: active ? C.text : C.text, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                      {a.name}
                    </p>
                    <p className="text-[11px] truncate hidden lg:block mt-0.5" style={{ color: C.muted }}>{a.desc}</p>
                  </div>

                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="agentActive"
                      className="hidden lg:block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: C.indigo, boxShadow: `0 0 0 3px ${C.indigo}25` }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer label */}
          <div className="hidden lg:flex items-center gap-1.5 mt-4 px-3 py-2 rounded-lg font-mono text-[10px]"
            style={{ background: 'rgba(15,23,42,0.03)', color: C.muted }}>
            <span style={{ color: C.green }}>●</span>
            <span>Todos os agentes online</span>
          </div>
        </div>
      </aside>

      {/* ══════ Chat Window (product mockup) ══════ */}
      <div className="relative min-w-0">
        {/* Floating ambient glow behind window */}
        <div aria-hidden className="absolute -inset-2 rounded-3xl opacity-50 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${C.indigo}15, transparent 60%)` }} />

        <div className="relative flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: '0 40px 100px -30px rgba(15,23,42,0.25), 0 16px 40px -16px rgba(79,70,229,0.18), inset 0 1px 0 rgba(255,255,255,0.8)',
            height: 'clamp(460px, 70vh, 680px)',
          }}>

          {/* ─── Browser chrome: traffic lights + URL bar ─── */}
          <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5"
            style={{
              background: `linear-gradient(180deg, #F5F2EC, ${C.soft})`,
              borderBottom: `1px solid ${C.border}`,
            }}>
            <div className="flex gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
            </div>
            <div className="flex-1 flex items-center gap-2 px-2.5 md:px-3 py-1 rounded-md mx-1 md:mx-2 min-w-0 overflow-hidden"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0 pulse-dot" style={{ background: C.green }} />
              <span className="font-mono text-[10.5px] tracking-tight truncate min-w-0" style={{ color: C.muted }}>
                <span style={{ color: 'rgba(100,116,139,0.55)' }}>nexla.ai</span>
                <span style={{ color: C.text }}>/voce/esta/testando/nossos/</span>
                <span style={{ color: C.indigo }}>agentes</span>
              </span>
            </div>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden sm:inline-flex items-center gap-1 font-mono text-[9px] font-bold tracking-widest uppercase shrink-0"
              style={{ color: C.green }}>
              <span className="w-1 h-1 rounded-full" style={{ background: C.green }} />
              LIVE
            </motion.span>
          </div>

          {/* ─── Agent header ─── */}
          <div className="relative px-5 py-4 flex items-center gap-3"
            style={{
              borderBottom: `1px solid ${C.border}`,
              background: `linear-gradient(135deg, ${C.indigo}08 0%, transparent 50%, ${C.violet}06 100%)`,
            }}>
            <motion.div
              key={selected.id}
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
                color: '#fff',
                boxShadow: `0 10px 24px -6px ${C.indigo}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}>
              <ActiveIcon size={19} strokeWidth={2.2} />
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-[15px] leading-tight tracking-tight" style={{ color: C.text }}>
                Agente {selected.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-[10px] flex items-center gap-1.5" style={{ color: C.green }}>
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: C.green }} />
                  ONLINE
                </span>
                <span className="opacity-30 hidden sm:inline">·</span>
                <span className="font-mono text-[10px] hidden sm:inline" style={{ color: C.muted }}>IA Nexla</span>
                <span className="opacity-30 hidden md:inline">·</span>
                <span className="font-mono text-[10px] hidden md:inline" style={{ color: C.muted }}>resposta &lt; 3s</span>
              </div>
            </div>

            <motion.button onClick={reset}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              title="Limpa a conversa e reseta a memória da IA"
              className="group inline-flex items-center gap-2 shrink-0 px-3 md:px-3.5 py-1.5 md:py-2 rounded-full text-[12px] md:text-[12.5px] font-semibold"
              style={{
                color: C.indigo,
                background: `${C.indigo}0A`,
                border: `1px solid ${C.indigo}30`,
              }}>
              <RefreshCw size={13} className="transition-transform duration-500 group-hover:-rotate-180" />
              <span className="hidden sm:inline">Reiniciar conversa</span>
              <span className="sm:hidden">Reiniciar</span>
            </motion.button>
          </div>

          {/* ─── Messages ─── */}
          <div ref={scrollRef}
            data-lenis-prevent
            className="agent-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-5 py-5 space-y-4 relative min-w-0"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${C.indigo}08, transparent 55%), linear-gradient(180deg, ${C.bg}, ${C.surface})`,
            }}>
            {/* Subtle dot grid pattern */}
            <div aria-hidden className="absolute inset-0 opacity-[0.025] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(${C.text} 1px, transparent 1px)`,
                backgroundSize: '22px 22px',
              }} />

            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                const prev = messages[i - 1];
                const isFirstInGroup = !prev || prev.role !== m.role;
                return (
                  <motion.div key={`${sessionId}-${i}`}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease }}
                    className={`relative flex items-end gap-2 ${isUser ? 'justify-end pl-9' : 'justify-start pr-9'} ${!isFirstInGroup ? 'mt-1' : ''}`}
                  >
                    {!isUser && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-opacity ${isFirstInGroup ? 'opacity-100' : 'opacity-0'}`}
                        style={isFirstInGroup ? {
                          background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
                          color: '#fff',
                          boxShadow: `0 4px 10px -3px ${C.indigo}55`,
                        } : undefined}>
                        {isFirstInGroup && <ActiveIcon size={12} strokeWidth={2.3} />}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 max-w-[82%]" style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                      {isFirstInGroup && (
                        <span className="font-mono text-[10px] mb-1 px-1" style={{ color: C.muted }}>
                          {isUser ? 'Você' : `Agente ${selected.name}`}
                        </span>
                      )}
                      <div className="px-4 py-2.5 text-[14px] leading-[1.55] whitespace-pre-wrap break-words"
                        style={isUser
                          ? {
                              background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
                              color: '#fff',
                              borderRadius: isFirstInGroup ? '18px 18px 6px 18px' : '18px 6px 6px 18px',
                              boxShadow: `0 8px 20px -10px ${C.indigo}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
                            }
                          : {
                              background: C.surface,
                              color: C.text,
                              border: `1px solid ${C.border}`,
                              borderRadius: isFirstInGroup ? '18px 18px 18px 6px' : '6px 18px 18px 6px',
                              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                            }}>
                        {m.text}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="relative flex items-end gap-2 justify-start pr-9">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
                    color: '#fff',
                    boxShadow: `0 4px 10px -3px ${C.indigo}55`,
                  }}>
                  <ActiveIcon size={12} />
                </div>
                <div className="px-4 py-3 flex items-center gap-1.5"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: '18px 18px 18px 6px',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                  }}>
                  {[0, 1, 2].map(i => (
                    <motion.span key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: C.indigo }}
                      animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick suggestion chips */}
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative pl-9">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: C.muted }}>
                  ↳ Sugestões para começar
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => sendText(s)}
                      className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
                        border: `1px solid ${C.indigo}25`,
                        color: C.indigo,
                        boxShadow: `0 2px 8px -3px ${C.indigo}25`,
                      }}>
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ─── Input bar ─── */}
          <form onSubmit={send}
            className="flex items-center gap-2 px-3 md:px-4 py-3"
            style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte algo..."
              disabled={loading}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-full text-[14px] outline-none disabled:opacity-50"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
              }}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || loading}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
                color: '#fff',
                boxShadow: `0 8px 20px -4px ${C.indigo}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
              aria-label="Enviar mensagem">
              <Send size={15} />
            </motion.button>
          </form>

        </div>
      </div>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  const [navScrolled,   setNavScrolled]   = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -60]);

  /* Lenis smooth scroll */
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.3, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    let id: number;
    const raf = (time: number) => { lenis.raf(time); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { lenis.destroy(); cancelAnimationFrame(id); };
  }, []);

  /* Nav scroll */
  useEffect(() => {
    const fn = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Active section */
  useEffect(() => {
    const ids = ['inicio','servicos','experimente','como-funciona','cases','diferenciais','sobre','contato'];
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      entries => {
        const top = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
        if (top.length) setActiveSection((top[0].target as HTMLElement).id);
      },
      { threshold:[0.2,0.5] }
    );
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });
    setActiveSection(id);
  };

  const navLinks = [
    { id:'servicos',      label:'Serviços' },
    { id:'experimente',   label:'Experimente' },
    { id:'como-funciona', label:'Como Funciona' },
    { id:'cases',         label:'Cases' },
    { id:'diferenciais',  label:'Diferenciais' },
    { id:'sobre',         label:'Sobre' },
  ];

  const iconBg = { background:'rgba(79,70,229,0.08)', border:'1px solid rgba(79,70,229,0.15)' };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background:C.bg }}>
      <ScrollProgress />
      <MouseSpotlight />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-40"
        animate={{
          background: navScrolled ? 'rgba(250,250,248,0.92)' : 'rgba(250,250,248,0)',
          borderBottom: navScrolled ? `1px solid ${C.border}` : '1px solid transparent',
        }}
        style={{ backdropFilter: navScrolled ? 'blur(22px)' : 'none' }}
        transition={{ duration:0.3 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.button onClick={() => scrollTo('inicio')}
            className="flex items-center gap-2.5"
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}>
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="Nexla" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl" style={{ color:C.text }}>Nexla</span>
          </motion.button>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className={`nav-link text-sm font-medium transition-colors ${activeSection===l.id?'active':''}`}
                style={{ color: activeSection===l.id ? C.indigo : C.muted }}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <MagneticBtn onClick={() => scrollTo('contato')}
              className="px-4 md:px-5 py-2 md:py-2.5 rounded-full font-semibold text-xs md:text-sm"
              style={{ background:`linear-gradient(135deg,${C.indigo},${C.violet})`, color:'#fff', boxShadow:`0 4px 16px rgba(79,70,229,0.28)` }}>
              <span className="hidden sm:inline">Falar com a Nexla</span>
              <span className="sm:hidden">Falar</span>
            </MagneticBtn>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden pt-20"
        style={{ background:C.bg }}>

        {/* Aurora blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="aurora-1 absolute top-[-10%] left-[20%] w-[700px] h-[700px] rounded-full opacity-[0.18] blur-[100px]"
            style={{ background:`radial-gradient(circle,${C.indigo},${C.violet})` }} />
          <div className="aurora-2 absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.14] blur-[100px]"
            style={{ background:`radial-gradient(circle,#818CF8,${C.violet})` }} />
          <div className="aurora-3 absolute top-[40%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.1] blur-[80px]"
            style={{ background:`radial-gradient(circle,${C.coral},#FBBF24)` }} />
        </div>
        <Particles />

        <motion.div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full py-16"
          style={{ y: heroY }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <motion.div
                initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }}
                transition={{ duration:0.8, delay:0.1, ease }}>
                <h1 className="font-display font-bold leading-[1.05] mb-5"
                  style={{ fontSize:'clamp(40px,7vw,80px)', color:C.text }}>
                  Sua empresa no{' '}
                  <span className="text-gradient">piloto automático</span>{' '}
                  com IA real
                </h1>
              </motion.div>

              <motion.p className="text-lg leading-relaxed max-w-lg mb-10" style={{ color:C.muted }}
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                transition={{ duration:0.7, delay:0.25, ease }}>
                A Nexla constrói automações inteligentes que desburocratizam operações,
                atendem clientes 24/7 e geram resultados mensuráveis — sem complexidade técnica para você.
              </motion.p>

              <motion.div className="flex flex-wrap gap-4 mb-10"
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                transition={{ duration:0.6, delay:0.38, ease }}>
                <MagneticBtn onClick={() => scrollTo('contato')}
                  className="px-7 py-3.5 rounded-full font-semibold text-base"
                  style={{ background:`linear-gradient(135deg,${C.indigo},${C.violet})`, color:'#fff', boxShadow:`0 8px 28px rgba(79,70,229,0.28)` }}>
                  Quero automatizar minha empresa <ArrowRight size={17} />
                </MagneticBtn>

                <MagneticBtn onClick={() => scrollTo('experimente')}
                  className="px-7 py-3.5 rounded-full font-semibold text-base relative overflow-hidden"
                  style={{ border:`1.5px solid ${C.indigo}`, color:C.indigo, background: 'rgba(79,70,229,0.04)' }}>
                  <Sparkles size={16} /> Testar IA agora
                </MagneticBtn>

                <MagneticBtn onClick={() => scrollTo('servicos')}
                  className="px-7 py-3.5 rounded-full font-medium text-base"
                  style={{ border:`1.5px solid rgba(79,70,229,0.3)`, color:C.indigo }}>
                  Ver serviços <ChevronDown size={17} />
                </MagneticBtn>
              </motion.div>

            </div>

            {/* Right: Dashboard */}
            <div className="flex justify-center lg:justify-end">
              <DashboardMockup />
            </div>
          </div>

          {/* Stats strip */}
          <motion.div className="mt-20 pt-10 grid grid-cols-2 md:grid-cols-4 gap-8"
            style={{ borderTop:`1px solid ${C.border}` }}
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.7, delay:0.7, ease }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div className="font-display font-bold text-5xl md:text-6xl leading-none mb-1.5">
                  <AnimatedCounter target={s.value} />
                </div>
                <p className="text-sm font-mono" style={{ color:C.muted }}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div style={{ width:'1px', height:'40px', background:`linear-gradient(to bottom,transparent,${C.indigo})` }} />
          <motion.div animate={{ y:[0,6,0] }} transition={{ repeat:Infinity, duration:1.5 }}>
            <ChevronDown size={14} style={{ color:C.indigo }} />
          </motion.div>
        </div>
      </section>

      {/* ── Serviços ────────────────────────────────────────────── */}
      <section id="servicos" className="py-28 px-6" style={{ background:C.soft }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={vp}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <Eyebrow>Serviços</Eyebrow>
              <AnimatedHeading text="O que a Nexla entrega"
                className="font-display font-bold text-4xl md:text-5xl"
                style={{ color:C.text }} />
            </div>
            <motion.p variants={fadeUp} className="text-base max-w-sm leading-relaxed" style={{ color:C.muted }}>
              Transformamos processos manuais e repetitivos em fluxos automatizados com inteligência artificial.
            </motion.p>
          </motion.div>

          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            {SERVICES.map(({ n, icon:Icon, title, desc }) => (
              <motion.div key={n} variants={fadeUp}>
                <TiltCard className="p-6" style={{ background:C.surface, border:`1px solid ${C.border}` }}>
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconBg}>
                      <Icon size={18} style={{ color:C.indigo }} />
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color:'rgba(79,70,229,0.18)' }}>{n}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2" style={{ color:C.text }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:C.muted }}>{desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Soluções em Destaque (Carrossel) ────────────────────── */}
      <section id="solucoes" className="py-16 md:py-28 px-4 md:px-6" style={{ background: C.bg }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 md:mb-14"
            variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            <Eyebrow>Soluções em Destaque</Eyebrow>
            <AnimatedHeading text="Veja a Nexla em ação"
              className="font-display font-bold text-3xl md:text-5xl mb-4"
              style={{ color: C.text }} />
            <motion.p variants={fadeUp}
              className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: C.muted }}>
              Conheça as soluções que já estão transformando o atendimento e a operação de empresas brasileiras.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={vp}
            transition={{ duration: 0.7, ease }}
          >
            <ShowcaseCarousel onCta={() => scrollTo('contato')} />
          </motion.div>
        </div>
      </section>

      {/* ── Experimente (Demo Chat) ─────────────────────────────── */}
      <section id="experimente" className="py-16 md:py-28 px-4 md:px-6 relative overflow-hidden" style={{ background: C.soft }}>
        {/* Soft aurora */}
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.indigo}, transparent)` }} />
        <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.violet}, transparent)` }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            {/* Refined eyebrow with decorative lines */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease }}
              className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-10" style={{ background: `linear-gradient(90deg, transparent, ${C.indigo}80)` }} />
              <span className="font-mono text-[11px] font-bold tracking-[0.28em] uppercase" style={{ color: C.indigo }}>
                Demo Interativa
              </span>
              <div className="h-px w-10" style={{ background: `linear-gradient(-90deg, transparent, ${C.indigo}80)` }} />
            </motion.div>

            <AnimatedHeading text="Experimente um agente da Nexla agora"
              className="font-display font-bold text-3xl md:text-5xl mb-5 tracking-tight"
              style={{ color: C.text, letterSpacing: '-0.02em' }} />
            <p className="text-[15px] md:text-[17px] max-w-2xl mx-auto leading-relaxed" style={{ color: C.muted }}>
              Converse como se fosse um cliente. Escolha um setor abaixo, mande sua pergunta
              e veja a IA da Nexla respondendo em tempo real — sem cadastro, sem instalação.
            </p>
          </div>

          <DemoChat />
        </div>
      </section>

      {/* ── Como Funciona ───────────────────────────────────────── */}
      <section id="como-funciona" className="py-28 px-6 relative overflow-hidden" style={{ background:C.dark }}>
        <div className="absolute inset-0 pointer-events-none">
          {/* Starfield */}
          <StarField count={100} />
          {/* Soft aurora blobs on top of stars */}
          <div className="aurora-1 absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.18] blur-[100px]"
            style={{ background:`radial-gradient(circle,${C.violet},transparent)` }} />
          <div className="aurora-3 absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.1] blur-[80px]"
            style={{ background:`radial-gradient(circle,${C.indigo},transparent)` }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Eyebrow dark>Processo</Eyebrow>
            <AnimatedHeading text="Como funciona" dark
              className="font-display font-bold text-4xl md:text-5xl"
              style={{ color:C.darkText }} />
          </div>

          <motion.div className="grid md:grid-cols-3 gap-6"
            variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            {STEPS.map(({ n, icon:Icon, title, desc }, i) => (
              <motion.div key={n} variants={fadeUp}>
                <TiltCard className="p-6" style={{ background:C.darkSurface, border:`1px solid ${C.darkBorder}` }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background:'rgba(167,139,250,0.14)', border:'1px solid rgba(167,139,250,0.25)' }}>
                      <Icon size={18} style={{ color:'#A78BFA' }} />
                    </div>
                    {i < 2 && <div className="hidden md:block flex-1 h-px"
                      style={{ background:'linear-gradient(to right,rgba(167,139,250,0.3),transparent)' }} />}
                    <span className="font-mono text-xs font-bold" style={{ color:'rgba(167,139,250,0.28)' }}>{n}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2" style={{ color:C.darkText }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:C.darkMuted }}>{desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="mt-12 text-center"
            initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={vp}
            transition={{ duration:0.6, ease }}>
            <MagneticBtn onClick={() => scrollTo('contato')}
              className="px-7 py-3.5 rounded-full font-semibold text-base"
              style={{ background:C.darkText, color:C.dark }}>
              Quero uma avaliação gratuita <ArrowRight size={17} />
            </MagneticBtn>
          </motion.div>
        </div>
      </section>

      {/* ── Cases ───────────────────────────────────────────────── */}
      <section id="cases" className="py-28 px-6" style={{ background:C.bg }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={vp}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <Eyebrow>Cases</Eyebrow>
              <AnimatedHeading text="Resultados comprovados"
                className="font-display font-bold text-4xl md:text-5xl"
                style={{ color:C.text }} />
            </div>
            <motion.p variants={fadeUp} className="text-base max-w-xs leading-relaxed" style={{ color:C.muted }}>
              30+ projetos entregues em 1 ano, em setores completamente distintos.
            </motion.p>
          </motion.div>

          <motion.div className="grid md:grid-cols-2 gap-5"
            variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            {CASES.map(({ icon:Icon, sector, title, desc, tag }) => (
              <motion.div key={title} variants={fadeUp}>
                <TiltCard className="overflow-hidden !p-0" style={{ background:C.surface, border:`1px solid ${C.border}` }}>
                  <div className="h-1 w-full" style={{ background:`linear-gradient(90deg,${C.indigo},${C.violet})` }} />
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={iconBg}>
                          <Icon size={16} style={{ color:C.indigo }} />
                        </div>
                        <span className="font-mono text-xs" style={{ color:C.muted }}>{sector}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                        style={{ background:'rgba(79,70,229,0.08)', color:C.indigo, border:'1px solid rgba(79,70,229,0.18)' }}>
                        {tag}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-xl mb-2" style={{ color:C.text }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color:C.muted }}>{desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Depoimentos (Reels) ─────────────────────────────────── */}
      <section id="depoimentos" className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden" style={{ background: C.bg }}>
        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[100px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.indigo}, transparent)` }} />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full opacity-[0.06] blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.violet}, transparent)` }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease }}
              className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-10" style={{ background: `linear-gradient(90deg, transparent, ${C.indigo}80)` }} />
              <span className="font-mono text-[11px] font-bold tracking-[0.28em] uppercase" style={{ color: C.indigo }}>
                Depoimentos Reais
              </span>
              <div className="h-px w-10" style={{ background: `linear-gradient(-90deg, transparent, ${C.indigo}80)` }} />
            </motion.div>

            <AnimatedHeading text="O que dizem nossos clientes"
              className="font-display font-bold text-3xl md:text-5xl mb-5 tracking-tight"
              style={{ color: C.text, letterSpacing: '-0.02em' }} />
            <p className="text-[15px] md:text-[17px] max-w-2xl mx-auto leading-relaxed" style={{ color: C.muted }}>
              Donos de empresas falando sobre os resultados que tiveram com a Nexla.
              Sem ator, sem roteiro — só clientes reais.
            </p>
          </div>

          <TestimonialsSection />
        </div>
      </section>

      {/* ── Setores ─────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background:C.soft }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="mb-10" initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={vp} transition={{ duration:0.6,ease }}>
            <Eyebrow>Setores Atendidos</Eyebrow>
            <AnimatedHeading text="Quem já confia na Nexla"
              className="font-display font-bold text-3xl md:text-4xl"
              style={{ color:C.text }} />
          </motion.div>
          <motion.div className="flex flex-wrap gap-3"
            variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            {SECTORS.map((s,i) => (
              <motion.div key={s} variants={fadeUp}>
                <motion.div className="flex items-center gap-3 px-5 py-3 rounded-full"
                  style={{ background:C.surface, border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(15,23,42,0.04)' }}
                  whileHover={{ scale:1.05, borderColor:'rgba(79,70,229,0.32)', boxShadow:`0 6px 20px rgba(79,70,229,0.12)`, y:-2 }}
                  transition={{ type:'spring', stiffness:400, damping:25 }}>
                  <span className="font-mono text-xs font-bold" style={{ color:C.indigo }}>{String(i+1).padStart(2,'0')}</span>
                  <span className="text-sm font-medium" style={{ color:C.text }}>{s}</span>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Diferenciais ────────────────────────────────────────── */}
      <section id="diferenciais" className="py-28 px-6" style={{ background:C.bg }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="mb-14" variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            <Eyebrow>Diferenciais Técnicos</Eyebrow>
            <AnimatedHeading text="Por que a Nexla entrega diferente"
              className="font-display font-bold text-4xl md:text-5xl"
              style={{ color:C.text }} />
          </motion.div>

          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20"
            variants={stagger} initial="hidden" whileInView="show" viewport={vp}>
            {DIFFERENTIALS.map(({ icon:Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp}>
                <TiltCard className="p-6" style={{ background:C.surface, border:`1px solid ${C.border}` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={iconBg}>
                      <Icon size={18} style={{ color:C.indigo }} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg mb-1" style={{ color:C.text }}>{title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color:C.muted }}>{desc}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={vp} transition={{ duration:0.6,ease }}>
            <Eyebrow>Stack Tecnológica</Eyebrow>
            <p className="text-sm mb-6" style={{ color:C.muted }}>Ferramentas escolhidas para robustez, flexibilidade e custo-benefício real.</p>
            <div className="flex flex-wrap gap-3">
              {STACK.map(s => (
                <motion.span key={s}
                  className="px-4 py-2 rounded-full text-sm font-medium cursor-default"
                  style={{ border:'1px solid rgba(79,70,229,0.2)', background:'rgba(79,70,229,0.05)', color:C.indigo }}
                  whileHover={{ scale:1.07, background:'rgba(79,70,229,0.12)', y:-2 }}
                  transition={{ type:'spring', stiffness:400, damping:25 }}>
                  {s}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sobre ───────────────────────────────────────────────── */}
      <section id="sobre" className="py-16 md:py-28 px-4 md:px-6" style={{ background:C.soft }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 md:mb-14 grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 items-center">
            <div>
              <Eyebrow>Sobre a Empresa</Eyebrow>
              <AnimatedHeading text="Quem é a Nexla"
                className="font-display font-bold text-3xl md:text-5xl mb-4"
                style={{ color:C.text }} />
              <p className="text-[15px] md:text-base leading-relaxed mb-4" style={{ color:C.muted }}>
                A Nexla é uma empresa brasileira de tecnologia que coloca{' '}
                <span style={{ color: C.indigo, fontWeight: 500, background: `linear-gradient(transparent 65%, ${C.indigo}1A 65%)`, padding: '0 2px' }}>
                  inteligência artificial
                </span>{' '}
                para trabalhar pelo seu negócio. Desenvolvemos automações, plataformas SaaS, aplicativos mobile e sistemas sob medida para empresas que querem crescer com previsibilidade — eliminando processos manuais, reduzindo custos operacionais e transformando ideias em produtos digitais reais. Cada projeto é construído com foco em{' '}
                <span style={{ color: C.indigo, fontWeight: 500, background: `linear-gradient(transparent 65%, ${C.indigo}1A 65%)`, padding: '0 2px' }}>
                  resultado mensurável
                </span>{' '}
                e estrutura preparada para escalar com a sua operação.
              </p>
              <p className="text-[15px] md:text-base leading-relaxed" style={{ color:C.muted }}>
                Nascida em Vilhena, Rondônia, a Nexla levou tecnologia brasileira ao{' '}
                <span style={{ color: C.indigo, fontWeight: 500, background: `linear-gradient(transparent 65%, ${C.indigo}1A 65%)`, padding: '0 2px' }}>
                  Top 10 mundial do NASA Space Apps Challenge
                </span>{' '}
                — o maior hackathon do planeta — depois de conquistar a{' '}
                <span style={{ color: C.indigo, fontWeight: 500, background: `linear-gradient(transparent 65%, ${C.indigo}1A 65%)`, padding: '0 2px' }}>
                  etapa regional
                </span>. Hoje, atende empresas em todo o Brasil no modelo{' '}
                <span style={{ color: C.indigo, fontWeight: 500, background: `linear-gradient(transparent 65%, ${C.indigo}1A 65%)`, padding: '0 2px' }}>
                  B2B
                </span>, com a mesma engenharia que competiu de igual para igual com os melhores do mundo.
              </p>
            </div>

            {/* Team photo — abaixo do texto no mobile, ao lado no desktop */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden"
                style={{
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 30px 80px -20px rgba(79,70,229,0.25), 0 8px 24px rgba(15,23,42,0.08)',
                }}>
                <img
                  src="/nexla.jpg"
                  alt="Equipe Nexla — Vencedora do NASA Space Apps Challenge"
                  className="w-full h-auto object-cover block"
                />
              </div>
              {/* Caption */}
              <p className="mt-3 text-xs font-mono text-center" style={{ color: C.muted }}>
                Equipe Nexla · Vilhena, RO — NASA Space Apps Challenge
              </p>
            </div>
          </div>


          <motion.div className="relative p-8 md:p-12 rounded-2xl text-center overflow-hidden"
            style={{ background:`linear-gradient(135deg,${C.indigo},${C.violet})` }}
            initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={vp}
            transition={{ duration:0.7, ease }}
            whileHover={{ scale:1.01 }}>
            <div className="absolute top-4 left-8 font-display font-bold text-8xl leading-none select-none opacity-10 text-white">"</div>
            <p className="font-display font-bold text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto text-white relative z-10">
              Transformar inteligência artificial em vantagem competitiva real para empresas brasileiras —
              com tecnologia de ponta, execução sob medida e resultados que aparecem no caixa, não só na apresentação.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section id="contato" className="py-28 px-6 relative overflow-hidden"
        style={{ background:`linear-gradient(135deg,${C.dark} 0%,#2D1B69 50%,${C.dark} 100%)` }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Stars */}
          <StarField count={110} />
          {/* Aurora on top of stars */}
          <div className="aurora-1 absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.18] blur-[100px]"
            style={{ background:`radial-gradient(circle,${C.violet},transparent)` }} />
          <div className="aurora-2 absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full opacity-[0.12] blur-[80px]"
            style={{ background:`radial-gradient(circle,${C.coral},transparent)` }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="show" viewport={vp} variants={stagger}>
            <AnimatedHeading text="Pronto para automatizar sua operação?"
              className="font-display font-bold leading-tight mb-6"
              style={{ fontSize:'clamp(34px,7vw,76px)', color:'#FFFFFF' }} />

            <motion.p variants={fadeUp} className="text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed" style={{ color:C.darkMuted }}>
              Entendemos seu processo e mostramos como a IA pode trabalhar por você — sem enrolação.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticBtn href="https://wa.me/556999300101?text=Ol%C3%A1%20Nexla%2C%20quero%20automatizar%20minha%20empresa"
                className="px-8 py-4 rounded-full font-semibold text-base"
                style={{ background:C.green, color:'#fff', boxShadow:`0 8px 28px rgba(34,197,94,0.32)` }}>
                <MessageCircle size={20} /> Falar pelo WhatsApp
              </MagneticBtn>

              <MagneticBtn onClick={() => scrollTo('cases')}
                className="px-8 py-4 rounded-full font-semibold text-base"
                style={{ border:'1.5px solid rgba(237,233,254,0.25)', color:C.darkText }}>
                Ver cases de sucesso <ArrowRight size={18} />
              </MagneticBtn>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-10 px-6" style={{ background:C.dark, borderTop:`1px solid ${C.darkBorder}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <motion.button onClick={() => scrollTo('inicio')} className="flex items-center gap-3"
            whileHover={{ scale:1.04 }}>
            <img src="/ChatGPT_Image_17_de_mar._de_2026,_10_56_43.png" alt="Nexla" className="w-7 h-7 object-contain opacity-80" />
            <span className="font-display font-bold text-xl" style={{ color:C.darkText }}>Nexla</span>
          </motion.button>

          <div className="flex flex-wrap justify-center items-center gap-6">
            {navLinks.map(l => (
              <motion.button key={l.id} onClick={() => scrollTo(l.id)}
                className="text-sm font-medium" style={{ color:C.darkMuted }}
                whileHover={{ color:C.darkText, y:-1 }}
                transition={{ duration:0.2 }}>
                {l.label}
              </motion.button>
            ))}
            <motion.a
              href="https://www.instagram.com/nexla_ia/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @nexla_ia"
              className="text-sm font-medium"
              style={{ color: C.darkMuted }}
              whileHover={{ color: C.darkText, y: -1 }}
              transition={{ duration: 0.2 }}
            >
              Instagram
            </motion.a>
          </div>

          <p className="text-xs" style={{ color:'rgba(167,139,250,0.35)' }}>
            Nexla Automação e IA LTDA · Vilhena, RO · 2025
          </p>
        </div>
      </footer>
    </div>
  );
}
