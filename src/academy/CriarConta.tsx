import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, Phone, PlayCircle, LineChart, Award, Check } from 'lucide-react';
import { T, display, campoCls, AuthLayout, ListaPainel, Campo, Mensagem, BotaoGoogle, Divisor, soDigitos, mascaraWhats } from './ui';
import { Link, parametro, BASE } from './router';
import { lerOrigem } from './rastreio';

/* Mantém o ?voltar= (ex.: /comprar/curso) ao alternar entre entrar e criar conta */
const comVoltar = (rota: string) => { const v = parametro('voltar'); return v ? `${rota}?voltar=${encodeURIComponent(v)}` : rota; };
import { supabase, erroAuth, marcarNovoLogin, desmarcarNovoLogin } from './supabase';

const VANTAGENS = [
  { icon: PlayCircle, titulo: 'Aulas de amostra grátis',        sub: 'Assista antes de comprar, sem compromisso' },
  { icon: LineChart,  titulo: 'Progresso salvo aula a aula',    sub: 'Volte de onde parou, no celular ou no computador' },
  { icon: Award,      titulo: 'Certificado ao concluir',         sub: 'Emitido em PDF ao terminar 100% do curso' },
];

/* Força da senha: 0 a 3 (tamanho, letras + números, símbolo/maiúscula) */
function forca(s: string) {
  if (s.length < 8) return s.length ? 0 : -1;
  let n = 1;
  if (/[a-zA-Z]/.test(s) && /\d/.test(s)) n++;
  if (/[^a-zA-Z0-9]/.test(s) || (/[a-z]/.test(s) && /[A-Z]/.test(s))) n++;
  return n;
}
const FORCA = [
  { t: 'Muito curta', c: '#EF4444' },
  { t: 'Fraca',       c: '#F97316' },
  { t: 'Boa',         c: '#EAB308' },
  { t: 'Forte',       c: '#22C55E' },
];

function Caixa({ marcado, onChange, children }: { marcado: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 text-[13.5px] leading-relaxed cursor-pointer select-none" style={{ color: T.mute }}>
      <input type="checkbox" checked={marcado} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <span className="mt-0.5 w-[18px] h-[18px] rounded-[5px] shrink-0 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500"
        style={{ background: marcado ? T.accent : T.card, border: `1.5px solid ${marcado ? T.accent : 'rgba(15,23,42,0.25)'}` }}>
        {marcado && <Check size={12} strokeWidth={3} color="#FFFFFF" />}
      </span>
      <span>{children}</span>
    </label>
  );
}

export default function CriarConta() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whats, setWhats] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [termos, setTermos] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const nivel = forca(senha);

  const [criando, setCriando] = useState(false);

  /* Cadastro no Supabase. Nome, WhatsApp e consentimento vão nos metadados e o banco cria o perfil (academy_profiles).
   * Se o projeto exigir confirmação de e-mail, o aluno recebe o link; senão, já entra e vai para o painel. */
  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso('');
    if (nome.trim().split(/\s+/).length < 2) return setErro('Informe seu nome e sobrenome.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (soDigitos(whats).length < 10) return setErro('Informe um WhatsApp válido com DDD.');
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (!termos) return setErro('Para criar a conta, aceite os Termos de uso e a Política de privacidade.');
    setErro(''); setCriando(true);
    marcarNovoLogin();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/academy${/^\/[\w\-/]*$/.test(parametro('voltar') ?? '') ? parametro('voltar') : '/painel'}`,
        // utm: de onde a pessoa veio na primeira visita (vai para o perfil e para as métricas)
        data: { nome: nome.trim(), whatsapp: `55${soDigitos(whats)}`, consentimento_marketing: marketing, utm: lerOrigem() },
      },
    });
    setCriando(false);
    if (error) { desmarcarNovoLogin(); return setErro(erroAuth(error.message)); }
    if (!data.session) setAviso(`Conta criada, ${nome.trim().split(' ')[0]}! Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail para ativar o acesso.`);
  };

  return (
    <AuthLayout painel={<>
      <h1 className="font-bold leading-[1.08] mb-5" style={{ ...display, fontSize: 'clamp(34px,3.2vw,46px)' }}>
        Crie sua conta grátis e <span style={{ color: '#A5B4FC' }}>comece agora</span>.
      </h1>
      <p className="text-[16px] leading-relaxed mb-10" style={{ color: T.darkMute }}>
        Com a conta, você assiste às aulas de amostra e decide com calma se o curso é para você.
      </p>
      <ListaPainel itens={VANTAGENS} />
    </>}>
      <h2 className="font-bold leading-tight mb-2" style={{ ...display, fontSize: 'clamp(28px,3vw,34px)' }}>Criar conta grátis</h2>
      <p className="text-[15px] mb-8" style={{ color: T.mute }}>Leva menos de um minuto.</p>

      <BotaoGoogle texto="Cadastrar com Google" onClick={() => { setErro(''); setAviso('O cadastro com Google será liberado junto com a abertura da Nexla Academy.'); }} />
      <Divisor texto="ou cadastre com e-mail" />

      <form onSubmit={criar} noValidate className="space-y-5">
        <Campo label="Nome completo" icon={User}>
          <input className={campoCls} placeholder="Seu nome e sobrenome" value={nome}
            onChange={e => setNome(e.target.value)} autoComplete="name" />
        </Campo>

        <Campo label="E-mail" icon={Mail}>
          <input type="email" className={campoCls} placeholder="voce@empresa.com.br" value={email}
            onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </Campo>

        <Campo label="WhatsApp" icon={Phone}>
          <input className={campoCls} placeholder="(00) 00000-0000" value={whats} inputMode="tel"
            onChange={e => setWhats(mascaraWhats(e.target.value))} autoComplete="tel" />
        </Campo>

        <div>
          <Campo label="Senha" icon={Lock}>
            <input type={verSenha ? 'text' : 'password'} className={`${campoCls} pr-12`} placeholder="Mínimo de 8 caracteres" value={senha}
              onChange={e => setSenha(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100"
              style={{ color: T.mute }}>
              {verSenha ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
            </button>
          </Campo>
          {nivel >= 0 && (
            <div className="flex items-center gap-3 mt-2.5" aria-live="polite">
              <div className="flex-1 grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="h-1 rounded-full transition-colors duration-300"
                    style={{ background: i <= nivel ? FORCA[nivel].c : 'rgba(15,23,42,0.10)' }} />
                ))}
              </div>
              <span className="text-[12px] font-medium w-[4.5rem] text-right" style={{ color: FORCA[nivel].c }}>{FORCA[nivel].t}</span>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <Caixa marcado={termos} onChange={setTermos}>
            {/* Abrem em nova aba para não perder o que já foi preenchido */}
            Li e aceito os <a href={`${BASE}/termos`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2" style={{ color: T.ink2 }}>Termos de uso</a> e
            a <a href={`${BASE}/privacidade`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2" style={{ color: T.ink2 }}>Política de privacidade</a>.
          </Caixa>
          <Caixa marcado={marketing} onChange={setMarketing}>
            Quero receber novidades e ofertas da Nexla por e-mail e WhatsApp. <span style={{ color: '#94A3B8' }}>(opcional)</span>
          </Caixa>
        </div>

        <Mensagem erro={erro} aviso={aviso} />

        <button type="submit" disabled={!termos || criando}
          className="acad-btn w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
          {criando ? 'Criando conta…' : <>Criar conta grátis <ArrowRight size={17} strokeWidth={2} className="acad-arrow" /></>}
        </button>
      </form>

      <p className="text-[14.5px] text-center mt-7" style={{ color: T.mute }}>
        Já tem conta?{' '}
        <Link para={comVoltar('/entrar')} className="font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>Entrar</Link>
      </p>
    </AuthLayout>
  );
}
