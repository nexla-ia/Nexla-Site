import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, Mail, MessageCircle, Monitor, Moon, Phone, Sun, Trash2, User } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease, campoCls, Campo, Mensagem, soDigitos, mascaraWhats } from './ui';
import { AppLayout, Carregando, TituloPagina } from './AppLayout';
import { supabase, erroAuth } from './supabase';
import { Link, navegar } from './router';
import { useTema, type Tema } from './tema';

const WHATSAPP_NEXLA = '556999300101';

/* "5569999112233" → "(69) 99911-2233" */
const whatsParaTela = (w: string | null) => {
  const d = soDigitos(w ?? '');
  return mascaraWhats(d.length > 11 && d.startsWith('55') ? d.slice(2) : d);
};

function Secao({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6 md:p-8 grid md:grid-cols-[15rem_1fr] gap-6 md:gap-10" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div>
        <h2 className="font-bold text-[18px]" style={display}>{titulo}</h2>
        <p className="text-[13.5px] mt-1 leading-relaxed" style={{ color: T.mute }}>{sub}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Interruptor({ ligado, onChange, children }: { ligado: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onChange(!ligado)}
      className="w-full flex items-start justify-between gap-4 text-left">
      <span className="text-[14px] leading-relaxed" style={{ color: T.ink2 }}>{children}</span>
      <span className="relative w-11 h-6 rounded-full shrink-0 transition-colors" style={{ background: ligado ? '#4F46E5' : 'var(--a-track)' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-[left]" style={{ left: ligado ? 22 : 2 }} />
      </span>
    </button>
  );
}

const TEMAS: { id: Tema; texto: string; sub: string; icone: typeof Sun }[] = [
  { id: 'claro',   texto: 'Claro',      sub: 'Fundo claro',                      icone: Sun },
  { id: 'escuro',  texto: 'Escuro',     sub: 'Mais confortável à noite',          icone: Moon },
  { id: 'sistema', texto: 'Automático', sub: 'Igual ao seu celular ou computador', icone: Monitor },
];

/* Escolha do tema da Academy (fica salva neste navegador) */
function Aparencia() {
  const { tema, salvar } = useTema();
  return (
    <div role="radiogroup" aria-label="Tema" className="grid sm:grid-cols-3 gap-3">
      {TEMAS.map(t => {
        const ativo = tema === t.id;
        return (
          <button key={t.id} type="button" role="radio" aria-checked={ativo} onClick={() => salvar(t.id)}
            className="rounded-xl p-4 text-left transition-colors hover:bg-slate-50"
            style={{ border: `1.5px solid ${ativo ? '#4F46E5' : T.rule}`, background: ativo ? 'rgba(79,70,229,0.07)' : undefined }}>
            <t.icone size={20} strokeWidth={1.75} style={{ color: ativo ? T.accent : T.mute }} />
            <p className="font-semibold text-[14.5px] mt-2.5" style={{ color: T.ink }}>{t.texto}</p>
            <p className="text-[12.5px] mt-0.5" style={{ color: T.mute }}>{t.sub}</p>
          </button>
        );
      })}
    </div>
  );
}

/* Excluir a própria conta (LGPD): confirma com a senha e digitando EXCLUIR */
function ExcluirConta({ sessao }: { sessao: Session }) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [palavra, setPalavra] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');
  // Conta criada pelo Google não tem senha: o servidor pede só que a pessoa tenha entrado há pouco
  const comSenha = ((sessao.user.app_metadata?.providers as string[] | undefined) ?? [sessao.user.app_metadata?.provider]).includes('email');
  const pode = (!comSenha || senha.length > 0) && palavra.trim().toUpperCase() === 'EXCLUIR' && !excluindo;

  const excluir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pode) return;
    setErro(''); setExcluindo(true);
    // O servidor confere a senha (ou, na conta do Google, se a pessoa entrou há pouco) antes de apagar
    const { data, error } = await supabase.functions.invoke('academy-excluir-conta', { body: { confirmacao: 'EXCLUIR', senha } });
    if (error || !data?.ok) {
      let codigo = '';
      try { codigo = ((await (error as { context?: Response })?.context?.json()) ?? {}).erro ?? ''; } catch { /* sem corpo */ }
      setExcluindo(false);
      return setErro(
        codigo === 'senha' ? 'Senha incorreta.'
        : codigo === 'reautenticar' ? 'Por segurança, saia da conta, entre de novo com o Google e volte aqui para excluir (vale por 15 minutos).'
        : codigo === 'admin' ? 'Contas de administrador não podem ser excluídas por aqui.'
        : 'Não foi possível excluir a conta agora. Tente de novo ou fale com a gente pelo WhatsApp.');
    }
    try { sessionStorage.setItem('nexla_conta_excluida', '1'); } catch { /* sem armazenamento */ }
    await supabase.auth.signOut({ scope: 'local' });
    navegar('/', { substituir: true });
  };

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] text-[14px] font-semibold transition-colors hover:bg-red-50"
        style={{ color: 'var(--a-red)', border: '1px solid rgba(185,28,28,0.25)' }}>
        <Trash2 size={16} strokeWidth={1.75} /> Excluir minha conta
      </button>
    );
  }

  return (
    <form onSubmit={excluir} noValidate className="rounded-2xl p-5 space-y-4" style={{ border: '1px solid rgba(185,28,28,0.3)', background: 'rgba(239,68,68,0.05)' }}>
      <p className="inline-flex items-center gap-2 font-semibold text-[15px]" style={{ color: 'var(--a-red)' }}>
        <AlertTriangle size={18} strokeWidth={2} /> Isso não pode ser desfeito
      </p>
      <ul className="space-y-1.5 text-[14px] leading-relaxed" style={{ color: T.ink2 }}>
        <li>• Você perde o acesso a <strong>todos os cursos</strong>, inclusive os comprados.</li>
        <li>• Seu progresso, comentários, avaliações e certificados são apagados (os códigos de validação deixam de valer).</li>
        <li>• Excluir a conta não gera reembolso. Se comprou há menos de 7 dias e quer o dinheiro de volta, peça o reembolso antes pelo WhatsApp.</li>
        <li>• Os registros de compra ficam guardados sem os seus dados pessoais, porque a lei exige.</li>
      </ul>
      {comSenha && (
        <Campo label="Sua senha" icon={Lock}>
          <input type="password" className={campoCls} value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" placeholder="Para confirmar que é você" />
        </Campo>
      )}
      <label className="block">
        <span className="block text-[13.5px] font-semibold mb-1.5" style={{ color: T.ink2 }}>Digite <strong>EXCLUIR</strong> para confirmar</span>
        <input className="acad-field w-full h-12 rounded-[10px] px-4 text-[15px] uppercase" value={palavra} onChange={e => setPalavra(e.target.value)} placeholder="EXCLUIR" autoComplete="off" />
      </label>
      <Mensagem erro={erro} aviso="" />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!pode}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: '#DC2626' }}>
          <Trash2 size={16} strokeWidth={2} /> {excluindo ? 'Excluindo…' : 'Excluir minha conta para sempre'}
        </button>
        <button type="button" onClick={() => { setAberto(false); setSenha(''); setPalavra(''); setErro(''); }}
          className="h-11 px-4 rounded-[10px] text-[14px] font-medium transition-colors hover:bg-slate-100" style={{ color: T.ink2 }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Perfil({ sessao }: { sessao: Session }) {
  const [carregado, setCarregado] = useState(false);
  const [nomeSalvo, setNomeSalvo] = useState('');
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msgDados, setMsgDados] = useState({ erro: '', aviso: '' });

  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [msgSenha, setMsgSenha] = useState({ erro: '', aviso: '' });

  useEffect(() => {
    supabase.from('academy_profiles').select('nome, whatsapp, consentimento_marketing').eq('id', sessao.user.id).maybeSingle()
      .then(({ data }) => {
        const n = (data?.nome as string | null) ?? (sessao.user.user_metadata?.nome as string | undefined) ?? '';
        setNome(n); setNomeSalvo(n);
        setWhats(whatsParaTela(data?.whatsapp as string | null));
        setMarketing(!!data?.consentimento_marketing);
        setCarregado(true);
      });
  }, [sessao]);

  const salvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().split(/\s+/).length < 2) return setMsgDados({ erro: 'Informe seu nome e sobrenome.', aviso: '' });
    if (whats && soDigitos(whats).length < 10) return setMsgDados({ erro: 'Informe um WhatsApp válido com DDD.', aviso: '' });
    setSalvando(true); setMsgDados({ erro: '', aviso: '' });
    const { error } = await supabase.from('academy_profiles').update({
      nome: nome.trim(),
      whatsapp: whats ? `55${soDigitos(whats)}` : null,
      consentimento_marketing: marketing,
    }).eq('id', sessao.user.id);
    setSalvando(false);
    if (error) return setMsgDados({ erro: 'Não foi possível salvar agora. Tente de novo.', aviso: '' });
    setNomeSalvo(nome.trim());
    setMsgDados({ erro: '', aviso: 'Dados salvos. Seu nome nos certificados já foi atualizado.' });
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return setMsgSenha({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.', aviso: '' });
    if (senha !== senha2) return setMsgSenha({ erro: 'As duas senhas não são iguais.', aviso: '' });
    setTrocando(true); setMsgSenha({ erro: '', aviso: '' });
    const { error } = await supabase.auth.updateUser({ password: senha });
    setTrocando(false);
    if (error) return setMsgSenha({ erro: error.message.toLowerCase().includes('different') ? 'A nova senha precisa ser diferente da atual.' : erroAuth(error.message), aviso: '' });
    setSenha(''); setSenha2('');
    setMsgSenha({ erro: '', aviso: 'Senha alterada com sucesso.' });
  };

  if (!carregado) return <AppLayout nome=""><Carregando /></AppLayout>;

  const botao = 'acad-btn inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white';

  return (
    <AppLayout nome={nomeSalvo}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Meu perfil" sub="Seus dados de acesso e de contato." />

        <div className="space-y-5">
          <Secao titulo="Dados pessoais" sub="O nome completo é o que aparece nos seus certificados.">
            <form onSubmit={salvarDados} noValidate className="space-y-5">
              <Campo label="Nome completo" icon={User}>
                <input className={campoCls} value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" placeholder="Seu nome e sobrenome" />
              </Campo>
              <Campo label="E-mail" icon={Mail}>
                <input className={`${campoCls} opacity-70 cursor-not-allowed`} value={sessao.user.email ?? ''} readOnly />
              </Campo>
              <Campo label="WhatsApp" icon={Phone}>
                <input className={campoCls} value={whats} inputMode="tel" placeholder="(00) 00000-0000"
                  onChange={e => setWhats(mascaraWhats(e.target.value))} autoComplete="tel" />
              </Campo>
              <div className="pt-2" style={{ borderTop: `1px solid ${T.rule}` }}>
                <div className="pt-4">
                  <Interruptor ligado={marketing} onChange={setMarketing}>
                    Quero receber novidades e ofertas da Nexla por e-mail e WhatsApp.
                  </Interruptor>
                </div>
              </div>
              <Mensagem erro={msgDados.erro} aviso={msgDados.aviso} />
              <button type="submit" disabled={salvando} className={botao}>
                {salvando ? 'Salvando…' : <><CheckCircle2 size={17} strokeWidth={2} /> Salvar alterações</>}
              </button>
            </form>
          </Secao>

          <Secao titulo="Aparência" sub="Escolha entre o modo claro e o escuro. Vale para este navegador.">
            <Aparencia />
          </Secao>

          <Secao titulo="Senha" sub="Use pelo menos 8 caracteres, misturando letras e números.">
            <form onSubmit={trocarSenha} noValidate className="space-y-5">
              <Campo label="Nova senha" icon={Lock}>
                <input type={verSenha ? 'text' : 'password'} className={`${campoCls} pr-12`} value={senha}
                  onChange={e => setSenha(e.target.value)} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" />
                <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: T.mute }}>
                  {verSenha ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                </button>
              </Campo>
              <Campo label="Confirmar nova senha" icon={Lock}>
                <input type={verSenha ? 'text' : 'password'} className={campoCls} value={senha2}
                  onChange={e => setSenha2(e.target.value)} autoComplete="new-password" placeholder="Repita a nova senha" />
              </Campo>
              <Mensagem erro={msgSenha.erro} aviso={msgSenha.aviso} />
              <button type="submit" disabled={trocando || !senha} className={botao}>
                {trocando ? 'Alterando…' : 'Alterar senha'}
              </button>
            </form>
          </Secao>

          <Secao titulo="Seus dados (LGPD)" sub="Você pode excluir a sua conta e os seus dados a qualquer momento.">
            <p className="text-[14px] leading-relaxed mb-4" style={{ color: T.ink2 }}>
              Ao excluir a conta, você perde o acesso aos cursos, ao progresso e aos certificados.
              {' '}Veja como cuidamos dos seus dados na <Link para="/privacidade" className="font-medium underline underline-offset-2" style={{ color: T.accent }}>Política de privacidade</Link>.
            </p>
            <ExcluirConta sessao={sessao} />
            <a href={`https://wa.me/${WHATSAPP_NEXLA}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre os meus dados na Nexla Academy (${sessao.user.email}).`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 mt-4 text-[13.5px] font-medium hover:underline underline-offset-4" style={{ color: T.mute }}>
              <MessageCircle size={15} strokeWidth={1.75} /> Prefere falar com a gente? WhatsApp
            </a>
          </Secao>
        </div>
      </motion.div>
    </AppLayout>
  );
}
