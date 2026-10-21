import { useCallback, useEffect, useState } from 'react';
import { Copy, Mail, RotateCcw, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { T, display } from '../ui';
import { BarraProgresso } from '../AppLayout';
import { supabase, pct } from '../supabase';
import { inputCls, botaoPrimario } from './comum';

type Aluno = { user_id: string; nome: string | null; email: string; whatsapp: string | null; ativo: boolean; desde: string; concluidas: number; total: number };
type Convite = { email: string; criado_em: string };

const fmtWhats = (w: string | null) => {
  const d = (w ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : '';
};
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const LINK_CADASTRO = 'https://www.nexla.com.br/academy/criar-conta';

/* Aba Alunos: liberar acesso por e-mail (matrícula na hora ou convite), listar, remover e reativar */
export default function AbaAlunos({ cursoId }: { cursoId: string }) {
  const [alunos, setAlunos] = useState<Aluno[] | null>(null);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' });
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    const [a, c] = await Promise.all([
      supabase.rpc('academy_admin_alunos', { p_course: cursoId }),
      supabase.from('academy_convites').select('email, criado_em').eq('course_id', cursoId).order('criado_em', { ascending: false }),
    ]);
    if (a.error) setMsg({ erro: 'Não foi possível carregar os alunos. Confira se o 013_matricula_manual.sql foi rodado no Supabase.', ok: '' });
    setAlunos((a.data ?? []) as Aluno[]);
    setConvites((c.data ?? []) as Convite[]);
  }, [cursoId]);
  useEffect(() => { carregar(); }, [carregar]);

  const liberar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(v)) return setMsg({ erro: 'Informe um e-mail válido.', ok: '' });
    setEnviando(true); setMsg({ erro: '', ok: '' });
    const { data, error } = await supabase.rpc('academy_admin_liberar', { p_email: v, p_course: cursoId });
    setEnviando(false);
    if (error) return setMsg({ erro: 'Não foi possível liberar o acesso. Tente de novo.', ok: '' });
    setEmail('');
    setMsg({
      erro: '',
      ok: data === 'convite'
        ? `${v} ainda não tem conta. O acesso fica guardado e libera sozinho quando a pessoa se cadastrar com esse e-mail.`
        : `Acesso liberado para ${v}. O curso já aparece em "Meus cursos".`,
    });
    carregar();
  };

  const definirAcesso = async (a: Aluno, ativo: boolean) => {
    if (!ativo && !window.confirm(`Remover o acesso de ${a.nome || a.email} a este curso? O progresso fica guardado caso o acesso seja liberado de novo.`)) return;
    const { error } = await supabase.rpc('academy_admin_definir_acesso', { p_user: a.user_id, p_course: cursoId, p_ativo: ativo });
    if (error) return setMsg({ erro: 'Não foi possível alterar o acesso.', ok: '' });
    carregar();
  };

  const cancelarConvite = async (c: Convite) => {
    if (!window.confirm(`Cancelar o acesso guardado para ${c.email}?`)) return;
    await supabase.from('academy_convites').delete().eq('email', c.email).eq('course_id', cursoId);
    carregar();
  };

  const copiarLink = async () => {
    await navigator.clipboard.writeText(LINK_CADASTRO).catch(() => undefined);
    setCopiado(true); setTimeout(() => setCopiado(false), 2000);
  };

  const ativos = (alunos ?? []).filter(a => a.ativo);
  const removidos = (alunos ?? []).filter(a => !a.ativo);

  return (
    <div className="space-y-5">
      {/* Liberar acesso */}
      <section className="rounded-2xl p-6 md:p-7" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
        <h3 className="font-bold text-[16.5px]" style={display}>Liberar acesso</h3>
        <p className="text-[13.5px] mt-1 mb-4" style={{ color: T.mute }}>
          Para quem comprou fora da plataforma (ex.: link de pagamento). Se a pessoa ainda não tem conta, o acesso libera sozinho quando ela se cadastrar com o mesmo e-mail.
        </p>
        <form onSubmit={liberar} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.mute }} />
            <input type="email" className={`${inputCls} pl-10`} placeholder="email@docliente.com.br" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={enviando} className={botaoPrimario}><UserPlus size={16} strokeWidth={2} /> {enviando ? 'Liberando…' : 'Liberar acesso'}</button>
        </form>
        {msg.erro && <p className="mt-3 text-[13.5px]" style={{ color: '#B91C1C' }}>{msg.erro}</p>}
        {msg.ok && <p className="mt-3 text-[13.5px]" style={{ color: '#15803D' }}>{msg.ok}</p>}
        <button onClick={copiarLink} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline underline-offset-4" style={{ color: T.accent }}>
          <Copy size={13} /> {copiado ? 'Link copiado!' : 'Copiar link de cadastro para enviar ao aluno'}
        </button>
      </section>

      {/* Alunos com acesso */}
      <section className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.rule}` }}>
          <h3 className="font-bold text-[16.5px]" style={display}>Alunos com acesso</h3>
          <span className="text-[13px]" style={{ color: T.mute }}>{ativos.length}</span>
        </div>
        {alunos === null && <p className="p-5 text-[14px]" style={{ color: T.mute }}>Carregando…</p>}
        {alunos && ativos.length === 0 && (
          <div className="p-8 text-center">
            <Users size={26} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
            <p className="text-[14px] mt-2" style={{ color: T.mute }}>Nenhum aluno neste curso ainda.</p>
          </div>
        )}
        {ativos.map((a, i) => {
          const p = pct(a.concluidas, a.total);
          return (
            <div key={a.user_id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 px-5 py-3.5" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14.5px] truncate">{a.nome || 'Sem nome'}</p>
                <p className="text-[12.5px] truncate" style={{ color: T.mute }}>{a.email}{fmtWhats(a.whatsapp) && ` · ${fmtWhats(a.whatsapp)}`}</p>
              </div>
              <div className="flex items-center gap-2 md:w-48">
                <div className="flex-1"><BarraProgresso valor={p} /></div>
                <span className="text-[12.5px] w-9 text-right">{p}%</span>
              </div>
              <span className="text-[12.5px] md:w-28" style={{ color: T.mute }}>desde {fmtData(a.desde)}</span>
              <button onClick={() => definirAcesso(a, false)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium hover:bg-red-50 self-start md:self-auto"
                style={{ color: '#B91C1C', border: '1px solid rgba(185,28,28,0.25)' }}>
                <UserMinus size={14} /> Remover acesso
              </button>
            </div>
          );
        })}
      </section>

      {/* Aguardando cadastro */}
      {convites.length > 0 && (
        <section className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.rule}` }}>
            <h3 className="font-bold text-[16.5px]" style={display}>Aguardando cadastro</h3>
            <p className="text-[13px]" style={{ color: T.mute }}>O acesso libera sozinho quando a pessoa criar a conta com este e-mail.</p>
          </div>
          {convites.map((c, i) => (
            <div key={c.email} className="flex items-center gap-4 px-5 py-3" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
              <Mail size={16} strokeWidth={1.75} style={{ color: '#B45309' }} />
              <span className="flex-1 min-w-0 text-[14px] truncate">{c.email}</span>
              <span className="text-[12.5px] hidden sm:block" style={{ color: T.mute }}>{fmtData(c.criado_em)}</span>
              <button onClick={() => cancelarConvite(c)} aria-label={`Cancelar ${c.email}`} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-red-50" style={{ color: '#B91C1C' }}>
                <X size={15} />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Acesso removido */}
      {removidos.length > 0 && (
        <section className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.rule}` }}>
            <h3 className="font-bold text-[16.5px]" style={display}>Acesso removido</h3>
          </div>
          {removidos.map((a, i) => (
            <div key={a.user_id} className="flex items-center gap-4 px-5 py-3" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] truncate" style={{ color: T.mute }}>{a.nome || 'Sem nome'} · {a.email}</p>
              </div>
              <button onClick={() => definirAcesso(a, true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold hover:bg-slate-50"
                style={{ color: T.accent, border: '1px solid rgba(79,70,229,0.3)' }}>
                <RotateCcw size={14} /> Reativar
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
