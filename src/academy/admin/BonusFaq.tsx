import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { T, display } from '../ui';
import { supabase } from '../supabase';
import { inputCls, botaoPrimario, botaoSecundario } from './comum';

type Bonus = { titulo: string; descricao: string };
type Pergunta = { pergunta: string; resposta: string };

/* Bônus e perguntas frequentes do curso (aparecem na página de vendas pública) */
export function CartaoBonusFaq({ cursoId }: { cursoId: string }) {
  const [bonus, setBonus] = useState<Bonus[]>([]);
  const [faq, setFaq] = useState<Pergunta[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [semColuna, setSemColuna] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' });

  useEffect(() => {
    supabase.from('academy_courses').select('bonus, faq').eq('id', cursoId).maybeSingle().then(({ data, error }) => {
      if (error) { setSemColuna(true); setCarregado(true); return; }
      setBonus(((data?.bonus ?? []) as Bonus[]).map(b => ({ titulo: b.titulo ?? '', descricao: b.descricao ?? '' })));
      setFaq(((data?.faq ?? []) as Pergunta[]).map(f => ({ pergunta: f.pergunta ?? '', resposta: f.resposta ?? '' })));
      setCarregado(true);
    });
  }, [cursoId]);

  const salvar = async () => {
    setSalvando(true); setMsg({ erro: '', ok: '' });
    const { error } = await supabase.from('academy_courses').update({
      bonus: bonus.filter(b => b.titulo.trim()).map(b => ({ titulo: b.titulo.trim(), descricao: b.descricao.trim() })),
      faq: faq.filter(f => f.pergunta.trim() && f.resposta.trim()).map(f => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() })),
    }).eq('id', cursoId);
    setSalvando(false);
    setMsg(error ? { erro: 'Não foi possível salvar.', ok: '' } : { erro: '', ok: 'Bônus e perguntas salvos.' });
  };

  const muda = <X,>(lista: X[], set: (l: X[]) => void, i: number, campo: keyof X, v: string) =>
    set(lista.map((x, k) => (k === i ? { ...x, [campo]: v } : x)));

  return (
    <section className="rounded-2xl p-6 md:p-7 grid md:grid-cols-[14rem_1fr] gap-5 md:gap-8" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div>
        <h3 className="font-bold text-[16.5px]" style={display}>Bônus e perguntas</h3>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.mute }}>Aparecem na página de vendas do curso. As perguntas gerais (acesso, garantia, pagamento) já aparecem sozinhas.</p>
      </div>
      {!carregado ? <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p> : semColuna ? (
        <p className="text-[14px]" style={{ color: 'var(--a-red)' }}>Rode o <strong>019_bonus_faq.sql</strong> no Supabase para usar esta parte.</p>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-[13px] font-semibold mb-2" style={{ color: T.ink2 }}>Bônus</p>
            <div className="space-y-2">
              {bonus.map((b, i) => (
                <div key={i} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                  <input className={inputCls} placeholder="Ex.: Pacote de modelos prontos" value={b.titulo} onChange={e => muda(bonus, setBonus, i, 'titulo', e.target.value)} />
                  <input className={inputCls} placeholder="Descrição curta (opcional)" value={b.descricao} onChange={e => muda(bonus, setBonus, i, 'descricao', e.target.value)} />
                  <button onClick={() => setBonus(bonus.filter((_, k) => k !== i))} aria-label="Remover bônus" className="w-11 h-11 rounded-[10px] flex items-center justify-center hover:bg-red-50" style={{ color: 'var(--a-red)' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setBonus([...bonus, { titulo: '', descricao: '' }])} className={`${botaoSecundario} mt-2`} style={{ color: T.accent, border: '1px dashed rgba(79,70,229,0.4)' }}>
              <Plus size={15} /> Adicionar bônus
            </button>
          </div>

          <div className="pt-5" style={{ borderTop: `1px solid ${T.rule}` }}>
            <p className="text-[13px] font-semibold mb-2" style={{ color: T.ink2 }}>Perguntas frequentes deste curso</p>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <div key={i} className="rounded-xl p-3 space-y-2" style={{ border: `1px solid ${T.rule}` }}>
                  <div className="flex gap-2">
                    <input className={inputCls} placeholder="Pergunta. Ex.: Preciso saber programar?" value={f.pergunta} onChange={e => muda(faq, setFaq, i, 'pergunta', e.target.value)} />
                    <button onClick={() => setFaq(faq.filter((_, k) => k !== i))} aria-label="Remover pergunta" className="w-11 h-11 shrink-0 rounded-[10px] flex items-center justify-center hover:bg-red-50" style={{ color: 'var(--a-red)' }}><Trash2 size={16} /></button>
                  </div>
                  <textarea className="acad-field w-full rounded-[10px] px-3.5 py-2.5 text-[14.5px] leading-relaxed" rows={2} placeholder="Resposta"
                    value={f.resposta} onChange={e => muda(faq, setFaq, i, 'resposta', e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={() => setFaq([...faq, { pergunta: '', resposta: '' }])} className={`${botaoSecundario} mt-2`} style={{ color: T.accent, border: '1px dashed rgba(79,70,229,0.4)' }}>
              <Plus size={15} /> Adicionar pergunta
            </button>
          </div>

          {msg.erro && <p className="text-[13.5px]" style={{ color: 'var(--a-red)' }}>{msg.erro}</p>}
          {msg.ok && <p className="text-[13.5px]" style={{ color: 'var(--a-green)' }}>{msg.ok}</p>}
          <button onClick={salvar} disabled={salvando} className={botaoPrimario}>{salvando ? 'Salvando…' : 'Salvar bônus e perguntas'}</button>
        </div>
      )}
    </section>
  );
}
