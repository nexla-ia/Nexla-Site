import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, UserMinus, Users } from 'lucide-react';
import { T, display } from '../ui';
import { BarraProgresso } from '../AppLayout';
import { supabase, pct } from '../supabase';

type Aluno = { user_id: string; nome: string | null; email: string; whatsapp: string | null; ativo: boolean; desde: string; concluidas: number; total: number };

const fmtWhats = (w: string | null) => {
  const d = (w ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : '';
};
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/* Aba Alunos: quem comprou o curso (o acesso vem só do pagamento), com o progresso de cada um.
 * "Remover acesso" fica para casos fora do fluxo (ex.: reembolso feito por fora); reembolso pelo
 * Mercado Pago já remove o acesso sozinho. */
export default function AbaAlunos({ cursoId }: { cursoId: string }) {
  const [alunos, setAlunos] = useState<Aluno[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('academy_admin_alunos', { p_course: cursoId });
    if (error) setErro('Não foi possível carregar os alunos. Confira se o 013_matricula_manual.sql foi rodado no Supabase.');
    setAlunos((data ?? []) as Aluno[]);
  }, [cursoId]);
  useEffect(() => { carregar(); }, [carregar]);

  const definirAcesso = async (a: Aluno, ativo: boolean) => {
    if (!ativo && !window.confirm(`Remover o acesso de ${a.nome || a.email} a este curso? O progresso fica guardado.`)) return;
    const { error } = await supabase.rpc('academy_admin_definir_acesso', { p_user: a.user_id, p_course: cursoId, p_ativo: ativo });
    if (error) return setErro('Não foi possível alterar o acesso.');
    carregar();
  };

  const ativos = (alunos ?? []).filter(a => a.ativo);
  const removidos = (alunos ?? []).filter(a => !a.ativo);

  return (
    <div className="space-y-5">
      {erro && <p className="text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: '#B91C1C' }}>{erro}</p>}

      <section className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
        <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${T.rule}` }}>
          <div>
            <h3 className="font-bold text-[16.5px]" style={display}>Alunos com acesso</h3>
            <p className="text-[12.5px]" style={{ color: T.mute }}>O acesso é liberado sozinho quando o pagamento é aprovado no Mercado Pago.</p>
          </div>
          <span className="text-[13px] shrink-0" style={{ color: T.mute }}>{ativos.length}</span>
        </div>
        {alunos === null && <p className="p-5 text-[14px]" style={{ color: T.mute }}>Carregando…</p>}
        {alunos && ativos.length === 0 && (
          <div className="p-8 text-center">
            <Users size={26} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} />
            <p className="text-[14px] mt-2" style={{ color: T.mute }}>Nenhum aluno comprou este curso ainda.</p>
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

      {removidos.length > 0 && (
        <section className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.rule}` }}>
            <h3 className="font-bold text-[16.5px]" style={display}>Acesso removido</h3>
            <p className="text-[12.5px]" style={{ color: T.mute }}>Inclui reembolsos. O progresso fica guardado.</p>
          </div>
          {removidos.map((a, i) => (
            <div key={a.user_id} className="flex items-center gap-4 px-5 py-3" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
              <p className="flex-1 min-w-0 text-[14px] truncate" style={{ color: T.mute }}>{a.nome || 'Sem nome'} · {a.email}</p>
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
