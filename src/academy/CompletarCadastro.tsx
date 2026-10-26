import { useEffect, useState } from 'react';
import { ArrowRight, Phone, User, ShieldCheck, LineChart, Award } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, campoCls, AuthLayout, ListaPainel, Campo, Mensagem, soDigitos, mascaraWhats } from './ui';
import { BASE } from './router';
import { supabase } from './supabase';
import { evento } from './pixel';
import { Caixa } from './CriarConta';

const VANTAGENS = [
  { icon: ShieldCheck, titulo: 'Conta conectada ao Google', sub: 'Entre com um clique, sem senha para lembrar' },
  { icon: LineChart,   titulo: 'Progresso salvo aula a aula', sub: 'Volte de onde parou, no celular ou no computador' },
  { icon: Award,       titulo: 'Certificado ao concluir',    sub: 'Emitido em PDF ao terminar 100% do curso' },
];

const entrouPeloGoogle = (s: Session | null | undefined) =>
  s?.user.app_metadata?.provider === 'google' || !!(s?.user.app_metadata?.providers as string[] | undefined)?.includes('google');

/* Conta que entrou pelo Google e ainda não tem WhatsApp (cadastro novo) → mostra "Complete seu cadastro".
 * Devolve [undefined = conferindo | true = falta completar | false = tudo certo, marcar como completo]. */
export function useCadastroPendente(sessao: Session | null | undefined, admin: boolean | undefined): [boolean | undefined, () => void] {
  const uid = sessao?.user.id;
  const conferir = !!uid && admin === false && entrouPeloGoogle(sessao);
  const [estado, setEstado] = useState<{ uid: string; pendente: boolean } | null>(null);
  useEffect(() => {
    if (!conferir || !uid) return;
    let vivo = true;
    supabase.from('academy_profiles').select('whatsapp').eq('id', uid).maybeSingle()
      .then(({ data, error }) => { if (vivo) setEstado({ uid, pendente: !error && !!data && !data.whatsapp }); });
    return () => { vivo = false; };
  }, [conferir, uid]);
  if (!conferir || !uid) return [false, () => undefined];
  return [estado?.uid === uid ? estado.pendente : undefined, () => setEstado({ uid, pendente: false })];
}

/* Primeiro acesso pelo Google: o Google já mandou nome e e-mail; aqui a pessoa informa o WhatsApp e aceita os termos */
export default function CompletarCadastro({ sessao, aoConcluir }: { sessao: Session; aoConcluir: () => void }) {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [termos, setTermos] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase.from('academy_profiles').select('nome').eq('id', sessao.user.id).maybeSingle()
      .then(({ data }) => setNome(n => n || ((data?.nome as string | null) ?? (sessao.user.user_metadata?.full_name as string | undefined) ?? '')));
  }, [sessao]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().split(/\s+/).length < 2) return setErro('Informe seu nome e sobrenome.');
    if (soDigitos(whats).length < 10) return setErro('Informe um WhatsApp válido com DDD.');
    if (!termos) return setErro('Para continuar, aceite os Termos de uso e a Política de privacidade.');
    setErro(''); setSalvando(true);
    const { error } = await supabase.from('academy_profiles').update({
      nome: nome.trim(), whatsapp: `55${soDigitos(whats)}`, consentimento_marketing: marketing,
    }).eq('id', sessao.user.id);
    setSalvando(false);
    if (error) return setErro('Não foi possível salvar agora. Tente de novo.');
    evento('CompleteRegistration', { content_name: 'Nexla Academy', status: true }, sessao.user.id); // Meta Pixel
    aoConcluir();
  };

  return (
    <AuthLayout painel={<>
      <h1 className="font-bold leading-[1.08] mb-5" style={{ ...display, fontSize: 'clamp(34px,3.2vw,46px)' }}>
        Falta só <span style={{ color: '#A5B4FC' }}>um passo</span>.
      </h1>
      <p className="text-[16px] leading-relaxed mb-10" style={{ color: T.darkMute }}>
        Sua conta já foi criada com o Google. Confirme seus dados para começar.
      </p>
      <ListaPainel itens={VANTAGENS} />
    </>}>
      <h2 className="font-bold leading-tight mb-2" style={{ ...display, fontSize: 'clamp(28px,3vw,34px)' }}>Complete seu cadastro</h2>
      <p className="text-[15px] mb-8" style={{ color: T.mute }}>
        Conta Google: <strong style={{ color: T.ink }}>{sessao.user.email}</strong>
      </p>

      <form onSubmit={salvar} noValidate className="space-y-5">
        <Campo label="Nome completo" icon={User}>
          <input className={campoCls} placeholder="Seu nome e sobrenome" value={nome}
            onChange={e => setNome(e.target.value)} autoComplete="name" />
        </Campo>
        <Campo label="WhatsApp" icon={Phone}>
          <input className={campoCls} placeholder="(00) 00000-0000" value={whats} inputMode="tel" autoFocus
            onChange={e => setWhats(mascaraWhats(e.target.value))} autoComplete="tel" />
        </Campo>

        <div className="space-y-3 pt-1">
          <Caixa marcado={termos} onChange={setTermos}>
            Li e aceito os <a href={`${BASE}/termos`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2" style={{ color: T.ink2 }}>Termos de uso</a> e
            a <a href={`${BASE}/privacidade`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2" style={{ color: T.ink2 }}>Política de privacidade</a>.
          </Caixa>
          <Caixa marcado={marketing} onChange={setMarketing}>
            Quero receber novidades e ofertas da Nexla por e-mail e WhatsApp. <span style={{ color: '#94A3B8' }}>(opcional)</span>
          </Caixa>
        </div>

        <Mensagem erro={erro} aviso="" />

        <button type="submit" disabled={!termos || salvando}
          className="acad-btn w-full h-12 rounded-[10px] inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white">
          {salvando ? 'Salvando…' : <>Começar <ArrowRight size={17} strokeWidth={2} className="acad-arrow" /></>}
        </button>
      </form>

      <p className="text-[14px] text-center mt-7" style={{ color: T.mute }}>
        Não é a sua conta?{' '}
        <button onClick={() => supabase.auth.signOut({ scope: 'local' })} className="font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
          Sair e usar outra
        </button>
      </p>
    </AuthLayout>
  );
}
