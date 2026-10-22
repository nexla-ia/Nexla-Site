import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, MessageCircle, Monitor, Moon, Phone, Sun, User } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease, campoCls, Campo, Mensagem, soDigitos, mascaraWhats } from './ui';
import { AppLayout, Carregando, TituloPagina } from './AppLayout';
import { supabase, erroAuth } from './supabase';
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

          <Secao titulo="Seus dados (LGPD)" sub="Você pode pedir a exclusão da sua conta e dos seus dados a qualquer momento.">
            <p className="text-[14px] leading-relaxed mb-4" style={{ color: T.ink2 }}>
              Ao excluir a conta, você perde o acesso aos cursos, ao progresso e aos certificados. Para pedir a exclusão, fale com a gente.
            </p>
            <a href={`https://wa.me/${WHATSAPP_NEXLA}?text=${encodeURIComponent(`Olá! Quero excluir minha conta da Nexla Academy (${sessao.user.email}).`)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] text-[14px] font-semibold transition-colors hover:bg-red-50"
              style={{ color: 'var(--a-red)', border: '1px solid rgba(185,28,28,0.25)' }}>
              <MessageCircle size={16} strokeWidth={1.75} /> Pedir exclusão da conta
            </a>
          </Secao>
        </div>
      </motion.div>
    </AppLayout>
  );
}
