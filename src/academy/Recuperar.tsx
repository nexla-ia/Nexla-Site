import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, campoCls, AuthLayout, Campo, Mensagem } from './ui';
import { Link, navegar } from './router';
import { supabase, erroAuth } from './supabase';

/* Painel escuro da esquerda (igual ao do login), com o passo a passo da recuperação */
function Painel() {
  return (
    <>
      <h1 className="font-bold leading-[1.08] mb-5" style={{ ...display, fontSize: 'clamp(34px,3.2vw,46px)' }}>
        Recupere o seu <span style={{ color: '#A5B4FC' }}>acesso</span>.
      </h1>
      <p className="text-[16px] leading-relaxed mb-10" style={{ color: T.darkMute }}>
        Em dois passos você cria uma senha nova e volta para os seus cursos, do ponto onde parou.
      </p>
      <ul className="space-y-5">
        {[
          { icone: MailCheck, titulo: 'Receba o link no e-mail', sub: 'Use o mesmo e-mail da sua conta' },
          { icone: KeyRound, titulo: 'Crie a senha nova', sub: 'O link vale por pouco tempo, por segurança' },
        ].map(i => (
          <li key={i.titulo} className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(165,180,252,0.12)', color: '#A5B4FC' }}>
              <i.icone size={19} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block font-semibold text-[15px]" style={{ color: T.darkText }}>{i.titulo}</span>
              <span className="block text-[13.5px] mt-0.5" style={{ color: T.darkMute }}>{i.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* /recuperar — pede o link de troca de senha por e-mail */
export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState('');
  const [erro, setErro] = useState('');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setErro('Informe um e-mail válido.');
    setErro(''); setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: `${window.location.origin}/academy/nova-senha` });
    setEnviando(false);
    // Por segurança, a resposta é a mesma exista ou não uma conta com esse e-mail
    if (error && /rate limit|too many|seconds/i.test(error.message)) return setErro('Muitas tentativas seguidas. Espere um minuto e tente de novo.');
    setEnviado(em);
  };

  return (
    <AuthLayout painel={<Painel />}>
      <Link para="/" className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-6 hover:underline underline-offset-4" style={{ color: T.mute }}>
        <ArrowLeft size={15} strokeWidth={1.75} /> Voltar para o login
      </Link>

      {enviado ? (
        <div>
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--a-green)' }}>
            <MailCheck size={24} strokeWidth={1.75} />
          </span>
          <h2 className="font-bold leading-tight mt-5 mb-2" style={{ ...display, fontSize: 'clamp(26px,3vw,32px)' }}>Confira o seu e-mail</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: T.mute }}>
            Se existir uma conta com <strong style={{ color: T.ink }}>{enviado}</strong>, você vai receber em instantes um link para criar uma senha nova.
          </p>
          <ul className="mt-6 space-y-2.5 text-[14px]" style={{ color: T.ink2 }}>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" color="#22C55E" /> Abra o link neste mesmo aparelho.</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" color="#22C55E" /> Não chegou? Olhe a caixa de spam ou promoções.</li>
            <li className="flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" color="#22C55E" /> O link vale por pouco tempo. Se expirar, é só pedir outro.</li>
          </ul>
          <button onClick={() => setEnviado('')} className="mt-7 text-[14px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
            Enviar de novo ou usar outro e-mail
          </button>
        </div>
      ) : (
        <>
          <h2 className="font-bold leading-tight mb-2" style={{ ...display, fontSize: 'clamp(28px,3vw,34px)' }}>Esqueceu a senha?</h2>
          <p className="text-[15px] mb-8" style={{ color: T.mute }}>Digite o e-mail da sua conta e enviamos um link para você criar uma senha nova.</p>
          <form onSubmit={enviar} noValidate className="space-y-5">
            <Campo label="E-mail" icon={Mail}>
              <input type="email" className={campoCls} placeholder="voce@empresa.com.br" value={email}
                onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus />
            </Campo>
            <Mensagem erro={erro} aviso="" />
            <button type="submit" disabled={enviando}
              className="acad-btn w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
              {enviando ? 'Enviando…' : <>Enviar link <ArrowRight size={17} strokeWidth={2} className="acad-arrow" /></>}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

/* Como a pessoa chegou em /nova-senha (lido ao abrir a página, antes do Supabase limpar o endereço):
 * 'usado' = o Supabase recusou o link (já usado, expirado ou trocado por um mais novo); 'direto' = sem link nenhum */
const CHEGADA = (() => {
  const p = new URLSearchParams(window.location.hash.slice(1) + '&' + window.location.search.slice(1));
  if (p.get('error') || p.get('error_code')) return 'usado';
  return p.get('access_token') || p.get('code') ? 'link' : 'direto';
})();

/* /nova-senha — aberta pelo link do e-mail (o Supabase já conecta a conta); aqui a pessoa cria a senha nova */
export function NovaSenha({ sessao }: { sessao: Session | null }) {
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [ver, setVer] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return setErro('A nova senha precisa ter pelo menos 8 caracteres.');
    if (senha !== senha2) return setErro('As duas senhas não são iguais.');
    setErro(''); setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      return setErro(/different from the old/i.test(error.message) ? 'A senha nova precisa ser diferente da anterior.' : erroAuth(error.message));
    }
    setPronto(true);
  };

  return (
    <AuthLayout painel={<Painel />}>
      {!sessao ? (
        <div>
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--a-red)' }}>
            <KeyRound size={24} strokeWidth={1.75} />
          </span>
          <h2 className="font-bold leading-tight mt-5 mb-2" style={{ ...display, fontSize: 'clamp(26px,3vw,32px)' }}>
            {CHEGADA === 'direto' ? 'Abra pelo link do e-mail' : 'Link expirado ou já usado'}
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: T.mute }}>
            {CHEGADA === 'direto'
              ? 'Esta página abre pelo link que enviamos para o seu e-mail. Peça um link para criar a senha nova.'
              : 'Por segurança, o link vale por pouco tempo e só funciona uma vez. Ao pedir um link novo, os anteriores deixam de valer: use sempre o e-mail mais recente.'}
          </p>
          <Link para="/recuperar" className="acad-btn mt-7 w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
            Pedir um novo link <ArrowRight size={17} strokeWidth={2} className="acad-arrow" />
          </Link>
        </div>
      ) : pronto ? (
        <div>
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--a-green)' }}>
            <ShieldCheck size={24} strokeWidth={1.75} />
          </span>
          <h2 className="font-bold leading-tight mt-5 mb-2" style={{ ...display, fontSize: 'clamp(26px,3vw,32px)' }}>Senha alterada!</h2>
          <p className="text-[15px] leading-relaxed" style={{ color: T.mute }}>Pronto, sua senha nova já vale. Você já está conectado.</p>
          <button onClick={() => navegar('/', { substituir: true })}
            className="acad-btn mt-7 w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
            Ir para os meus cursos <ArrowRight size={17} strokeWidth={2} className="acad-arrow" />
          </button>
        </div>
      ) : (
        <>
          <h2 className="font-bold leading-tight mb-2" style={{ ...display, fontSize: 'clamp(28px,3vw,34px)' }}>Crie uma senha nova</h2>
          <p className="text-[15px] mb-8" style={{ color: T.mute }}>
            Para a conta <strong style={{ color: T.ink }}>{sessao.user.email}</strong>. Use pelo menos 8 caracteres, misturando letras e números.
          </p>
          <form onSubmit={salvar} noValidate className="space-y-5">
            <Campo label="Nova senha" icon={Lock}>
              <input type={ver ? 'text' : 'password'} className={`${campoCls} pr-12`} placeholder="Mínimo de 8 caracteres" value={senha}
                onChange={e => setSenha(e.target.value)} autoComplete="new-password" autoFocus />
              <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
                {ver ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
              </button>
            </Campo>
            <Campo label="Confirmar nova senha" icon={Lock}>
              <input type={ver ? 'text' : 'password'} className={campoCls} placeholder="Repita a nova senha" value={senha2}
                onChange={e => setSenha2(e.target.value)} autoComplete="new-password" />
            </Campo>
            <Mensagem erro={erro} aviso="" />
            <button type="submit" disabled={salvando}
              className="acad-btn w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
              {salvando ? 'Salvando…' : <>Salvar senha nova <ArrowRight size={17} strokeWidth={2} className="acad-arrow" /></>}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
