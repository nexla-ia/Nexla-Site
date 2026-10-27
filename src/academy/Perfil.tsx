import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronRight, Eye, EyeOff, Lock, LogOut, Mail, MessageCircle, Monitor, Moon, Phone, Receipt, Sun, Trash2, User } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease, campoCls, Campo, Mensagem, soDigitos, mascaraWhats, Avatar, fotoDaConta } from './ui';
import { AppLayout, Carregando, TituloPagina } from './AppLayout';
import { supabase, erroAuth, provedoresDa, descricaoDispositivo } from './supabase';
import { reais } from './Compra';
import { lerPreferencia, salvarPreferencia, type Preferencia } from './preferencias';
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

/* Forma de entrar, para mostrar na tela */
const formaDeEntrar = (sessao: Session) => {
  const p = provedoresDa(sessao);
  return p.includes('google') && p.includes('email') ? 'Google ou e-mail e senha' : p.includes('google') ? 'Google' : 'E-mail e senha';
};

const botaoClaro = 'inline-flex items-center gap-2 h-11 px-4 rounded-[10px] text-[14px] font-semibold transition-colors hover:bg-slate-100 disabled:opacity-50';

/* Este aparelho e "sair de todos" (a conta já fica conectada em 1 aparelho por vez) */
function Acesso({ sessao }: { sessao: Session }) {
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState('');
  const sairDeTodos = async () => {
    setSaindo(true); setErro('');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) { setSaindo(false); return setErro('Não foi possível sair agora. Tente de novo.'); }
    navegar('/', { substituir: true });
  };
  const linhas = [
    { icone: Monitor, titulo: 'Este aparelho', texto: `${descricaoDispositivo() || 'Navegador'} · conectado agora` },
    { icone: Lock, titulo: 'Forma de entrar', texto: formaDeEntrar(sessao) },
  ];
  return (
    <div className="space-y-4">
      <ul className="rounded-xl" style={{ border: `1px solid ${T.rule}` }}>
        {linhas.map((l, i) => (
          <li key={l.titulo} className="flex items-center gap-3 px-4 py-3.5" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
            <l.icone size={18} strokeWidth={1.75} className="shrink-0" style={{ color: T.mute }} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: T.ink }}>{l.titulo}</p>
              <p className="text-[13px]" style={{ color: T.mute }}>{l.texto}</p>
            </div>
          </li>
        ))}
      </ul>
      <Mensagem erro={erro} aviso="" />
      <button onClick={sairDeTodos} disabled={saindo} className={botaoClaro} style={{ color: T.ink2, border: `1px solid ${T.rule}` }}>
        <LogOut size={16} strokeWidth={1.75} /> {saindo ? 'Saindo…' : 'Sair de todos os aparelhos'}
      </button>
    </div>
  );
}

type Pedido = { id: string; itens: { titulo?: string }[] | null; total: number; status: string; forma_pagamento: string | null; criado_em: string };
const STATUS_PEDIDO: Record<string, { texto: string; cor: string }> = {
  pago: { texto: 'Pago', cor: 'var(--a-green)' },
  pendente: { texto: 'Aguardando pagamento', cor: 'var(--a-amber)' },
  recusado: { texto: 'Recusado', cor: 'var(--a-red)' },
  reembolsado: { texto: 'Reembolsado', cor: T.mute },
};
const FORMA: Record<string, string> = { pix: 'Pix', bank_transfer: 'Pix', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', ticket: 'Boleto', account_money: 'Saldo Mercado Pago', gratuito: 'Gratuito' };
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/* Histórico de compras do aluno (pedidos abandonados antes de pagar não aparecem) */
function MinhasCompras({ sessao }: { sessao: Session }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  useEffect(() => {
    supabase.from('academy_orders').select('id, itens, total, status, forma_pagamento, criado_em')
      .eq('user_id', sessao.user.id).order('criado_em', { ascending: false })
      .then(({ data }) => setPedidos(((data ?? []) as Pedido[])
        .filter(p => p.status !== 'cancelado' && !(p.status === 'pendente' && !p.forma_pagamento))));
  }, [sessao]);

  if (pedidos === null) return <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p>;
  if (!pedidos.length) {
    return (
      <p className="text-[14px] leading-relaxed" style={{ color: T.ink2 }}>
        Você ainda não fez nenhuma compra.{' '}
        <Link para="/cursos" className="font-medium underline underline-offset-2" style={{ color: T.accent }}>Explorar cursos</Link>
      </p>
    );
  }
  return (
    <ul className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.rule}` }}>
      {pedidos.map((p, i) => {
        const st = STATUS_PEDIDO[p.status] ?? { texto: p.status, cor: T.mute };
        const itens = p.itens ?? [];
        const titulo = (itens[0]?.titulo ?? 'Curso') + (itens.length > 1 ? ` + ${itens.length - 1} bônus` : '');
        return (
          <li key={p.id} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
            <Link para={`/compra/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50">
              <Receipt size={18} strokeWidth={1.75} className="shrink-0" style={{ color: T.mute }} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold truncate" style={{ color: T.ink }}>{titulo}</p>
                <p className="text-[13px]" style={{ color: T.mute }}>
                  {dataCurta(p.criado_em)}{p.forma_pagamento && ` · ${FORMA[p.forma_pagamento] ?? p.forma_pagamento}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-semibold" style={{ color: T.ink }}>{reais(Number(p.total))}</p>
                <p className="text-[12.5px] font-medium" style={{ color: st.cor }}>{st.texto}</p>
              </div>
              <ChevronRight size={16} strokeWidth={1.75} className="shrink-0" style={{ color: T.mute }} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* Preferências de estudo (salvas neste navegador; o curso e o player leem na hora) */
const PREFERENCIAS: { id: Preferencia; texto: string; sub: string }[] = [
  { id: 'concluirAuto', texto: 'Concluir a aula sozinha', sub: 'Ao terminar o vídeo, a aula é marcada como concluída.' },
  { id: 'proximaAuto', texto: 'Próxima aula automática', sub: 'Depois de concluir, a próxima aula começa em 5 segundos.' },
  { id: 'retomar', texto: 'Continuar de onde parei', sub: 'O vídeo volta no ponto em que você parou da última vez.' },
  { id: 'teatro', texto: 'Abrir as aulas no modo teatro', sub: 'Vídeo maior, sem a lista de aulas ao lado (atalho: tecla T).' },
];

function PreferenciasEstudo() {
  const [valores, setValores] = useState(() => Object.fromEntries(PREFERENCIAS.map(p => [p.id, lerPreferencia(p.id)])) as Record<Preferencia, boolean>);
  const mudar = (id: Preferencia, v: boolean) => { salvarPreferencia(id, v); setValores(atual => ({ ...atual, [id]: v })); };
  return (
    <ul>
      {PREFERENCIAS.map((p, i) => (
        <li key={p.id} className={i ? 'pt-4 mt-4' : ''} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
          <Interruptor ligado={valores[p.id]} onChange={v => mudar(p.id, v)}>
            <span className="block font-semibold" style={{ color: T.ink }}>{p.texto}</span>
            <span className="block text-[13px]" style={{ color: T.mute }}>{p.sub}</span>
          </Interruptor>
        </li>
      ))}
    </ul>
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
  const comSenha = provedoresDa(sessao).includes('email');
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
  const soGoogle = !provedoresDa(sessao).includes('email'); // conta do Google pode definir uma senha também

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
    setMsgSenha({ erro: '', aviso: soGoogle ? 'Senha definida. Agora você também pode entrar com seu e-mail e esta senha.' : 'Senha alterada com sucesso.' });
  };

  if (!carregado) return <AppLayout nome=""><Carregando /></AppLayout>;

  const desde = new Date(sessao.user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const botao = 'acad-btn inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white';

  return (
    <AppLayout nome={nomeSalvo}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Meu perfil" sub="Seus dados de acesso e de contato." />

        <div className="space-y-5">
          <section className="rounded-2xl p-6 md:p-8 flex items-center gap-4 md:gap-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
            <Avatar grande foto={fotoDaConta(sessao)} nome={nomeSalvo} email={sessao.user.email ?? ''} fundo={`linear-gradient(135deg, ${T.accent}, ${T.violet})`} />
            <div className="min-w-0">
              <p className="font-bold text-[20px] truncate" style={display}>{nomeSalvo || sessao.user.email}</p>
              <p className="text-[13.5px] mt-0.5 truncate" style={{ color: T.mute }}>{sessao.user.email}</p>
              <p className="text-[13px] mt-1" style={{ color: T.mute }}>Aluno desde {desde}</p>
            </div>
          </section>

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

          <Secao titulo="Preferências de estudo" sub="Como as aulas funcionam para você. Vale para este navegador.">
            <PreferenciasEstudo />
          </Secao>

          <Secao titulo="Senha" sub={soGoogle
            ? 'Você entra pelo Google. Se quiser, defina uma senha para também entrar com e-mail e senha.'
            : 'Use pelo menos 8 caracteres, misturando letras e números.'}>
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
                {trocando ? 'Salvando…' : soGoogle ? 'Definir senha' : 'Alterar senha'}
              </button>
            </form>
          </Secao>

          <Secao titulo="Acesso" sub="Sua conta fica conectada em um aparelho por vez: ao entrar em outro, este é desconectado.">
            <Acesso sessao={sessao} />
          </Secao>

          <Secao titulo="Minhas compras" sub="Seus pedidos e pagamentos. Clique em um pedido para ver os detalhes.">
            <MinhasCompras sessao={sessao} />
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
