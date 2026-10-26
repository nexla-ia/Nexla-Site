import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, GraduationCap, FileSpreadsheet } from 'lucide-react';
import { T, display, campoCls, AuthLayout, ListaPainel, Campo, Mensagem, BotaoGoogle, Divisor } from './ui';
import { Link, parametro } from './router';

const comVoltar = (rota: string) => { const v = parametro('voltar'); return v ? `${rota}?voltar=${encodeURIComponent(v)}` : rota; };
import { supabase, erroAuth, marcarNovoLogin, desmarcarNovoLogin, lerAvisoOutroDispositivo, entrarComGoogle, lerErroGoogle } from './supabase';

const CURSOS = [
  { icon: GraduationCap,   titulo: 'IA na prática para a escala 5×2', sub: 'Automação e atendimento com IA para atravessar a mudança' },
  { icon: FileSpreadsheet, titulo: 'Planilha no Automático',          sub: 'Planilhas e relatórios que se atualizam sozinhos' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState(() => lerErroGoogle() ? 'Não foi possível entrar com o Google. Tente de novo ou entre com e-mail e senha.' : '');
  // Desconectado porque a conta entrou em outro dispositivo? Mostra o motivo uma vez.
  const [aviso, setAviso] = useState(() => {
    let excluida = false;
    try { excluida = sessionStorage.getItem('nexla_conta_excluida') === '1'; sessionStorage.removeItem('nexla_conta_excluida'); } catch { /* sem armazenamento */ }
    if (excluida) return 'Sua conta e os seus dados foram excluídos da Nexla Academy.';
    return lerAvisoOutroDispositivo()
      ? 'Sua conta foi acessada em outro dispositivo, por isso este foi desconectado. Cada conta fica conectada em um dispositivo por vez.'
      : '';
  });

  const [entrando, setEntrando] = useState(false);

  /* Login com e-mail e senha no Supabase. Ao entrar, o main.tsx leva para o painel. */
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setErro(''); setEntrando(true);
    marcarNovoLogin(); // este aparelho passa a ser o dispositivo da conta
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) { desmarcarNovoLogin(); setErro(erroAuth(error.message)); }
  };
  const google = async () => {
    setErro(''); setAviso('');
    if (await entrarComGoogle(parametro('voltar'))) setErro('Não foi possível abrir o login do Google agora. Tente de novo.');
  };

  return (
    <AuthLayout painel={<>
      <h1 className="font-bold leading-[1.08] mb-5" style={{ ...display, fontSize: 'clamp(34px,3.2vw,46px)' }}>
        Aprenda a usar IA no seu negócio, <span style={{ color: '#A5B4FC' }}>na prática</span>.
      </h1>
      <p className="text-[16px] leading-relaxed mb-10" style={{ color: T.darkMute }}>
        Cursos gravados, direto ao ponto, feitos por quem implanta automação todos os dias em empresas reais.
      </p>
      <ListaPainel itens={CURSOS} />
    </>}>
      <h2 className="font-bold leading-tight mb-2" style={{ ...display, fontSize: 'clamp(28px,3vw,34px)' }}>Entrar na sua conta</h2>
      <p className="text-[15px] mb-8" style={{ color: T.mute }}>Acesse seus cursos e continue de onde parou.</p>

      <BotaoGoogle texto="Continuar com Google" onClick={google} />
      <Divisor texto="ou entre com e-mail" />

      <form onSubmit={entrar} noValidate className="space-y-5">
        <Campo label="E-mail" icon={Mail}>
          <input type="email" className={campoCls} placeholder="voce@empresa.com.br" value={email}
            onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </Campo>

        <Campo label="Senha" icon={Lock}
          extra={<Link para="/recuperar" className="text-[13px] font-medium hover:underline underline-offset-4" style={{ color: T.accent }}>Esqueci minha senha</Link>}>
          <input type={verSenha ? 'text' : 'password'} className={`${campoCls} pr-12`} placeholder="Sua senha" value={senha}
            onChange={e => setSenha(e.target.value)} autoComplete="current-password" />
          <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100"
            style={{ color: T.mute }}>
            {verSenha ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
          </button>
        </Campo>

        <Mensagem erro={erro} aviso={aviso} />

        <button type="submit" disabled={entrando}
          className="acad-btn w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
          {entrando ? 'Entrando…' : <>Entrar <ArrowRight size={17} strokeWidth={2} className="acad-arrow" /></>}
        </button>
      </form>

      <p className="text-[14.5px] text-center mt-7" style={{ color: T.mute }}>
        Ainda não tem conta?{' '}
        <Link para={comVoltar('/criar-conta')} className="font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>Criar conta grátis</Link>
      </p>
      <p className="text-[12px] text-center mt-8 leading-relaxed" style={{ color: T.mute }}>
        Ao entrar, você concorda com os <Link para="/termos" className="underline underline-offset-2 hover:opacity-80">Termos de uso</Link> e
        a <Link para="/privacidade" className="underline underline-offset-2 hover:opacity-80">Política de privacidade</Link> da Nexla.
      </p>
    </AuthLayout>
  );
}
