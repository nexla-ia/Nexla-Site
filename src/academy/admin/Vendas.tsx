import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Receipt, Tag, Trash2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando } from '../AppLayout';
import { supabase } from '../supabase';
import { SoAdmin, AdminLayout, TituloAdmin, inputCls, Rotulo, Chave, botaoPrimario } from './comum';

const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (v: string) => { const n = Number(v.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const paraCampo = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

/* ─── Bloco "Venda" nas Configurações do curso: preço e oferta extra ─── */
type Produto = { id?: string; tipo: 'curso' | 'oferta_extra'; titulo: string; descricao: string | null; preco: number; preco_promocional: number | null; ativo: boolean };

export function CartaoVenda({ cursoId, tituloCurso }: { cursoId: string; tituloCurso: string }) {
  const [carregado, setCarregado] = useState(false);
  const [semTabela, setSemTabela] = useState(false);
  const [preco, setPreco] = useState('');
  const [promo, setPromo] = useState('');
  const [aVenda, setAVenda] = useState(true);
  const [gratis, setGratis] = useState(false);
  const [extraAtivo, setExtraAtivo] = useState(false);
  const [extraTitulo, setExtraTitulo] = useState('Pacote de modelos prontos');
  const [extraPreco, setExtraPreco] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' });

  useEffect(() => {
    supabase.from('academy_products').select('*').eq('course_id', cursoId).then(({ data, error }) => {
      if (error) { setSemTabela(true); setCarregado(true); return; }
      const c = (data ?? []).find(p => p.tipo === 'curso') as Produto | undefined;
      const e = (data ?? []).find(p => p.tipo === 'oferta_extra') as Produto | undefined;
      if (c) { setPreco(Number(c.preco) === 0 ? '' : paraCampo(c.preco)); setPromo(paraCampo(c.preco_promocional)); setAVenda(c.ativo); setGratis(Number(c.preco) === 0); }
      if (e) { setExtraAtivo(e.ativo); setExtraTitulo(e.titulo); setExtraPreco(paraCampo(e.preco)); }
      setCarregado(true);
    });
  }, [cursoId]);

  const salvar = async () => {
    // Curso gratuito: preço 0 (o servidor libera direto, sem Mercado Pago) e sem oferta extra
    const p = gratis ? 0 : numero(preco); const pr = !gratis && promo.trim() ? numero(promo) : null; const ep = numero(extraPreco);
    if (!gratis && !(p > 0)) return setMsg({ erro: 'Informe o preço do curso (ou marque como gratuito).', ok: '' });
    if (pr !== null && !(pr > 0 && pr < p)) return setMsg({ erro: 'O preço promocional precisa ser menor que o preço normal.', ok: '' });
    if (!gratis && extraAtivo && (!extraTitulo.trim() || !(ep > 0))) return setMsg({ erro: 'Informe o nome e o preço da oferta extra.', ok: '' });
    setSalvando(true); setMsg({ erro: '', ok: '' });
    const linhas = [
      { course_id: cursoId, tipo: 'curso', titulo: tituloCurso, preco: p, preco_promocional: pr, ativo: aVenda },
      ...(extraTitulo.trim() && ep > 0 ? [{ course_id: cursoId, tipo: 'oferta_extra', titulo: extraTitulo.trim(), preco: ep, preco_promocional: null, ativo: extraAtivo && !gratis }] : []),
    ];
    const { error } = await supabase.from('academy_products').upsert(linhas, { onConflict: 'course_id,tipo' });
    setSalvando(false);
    if (error) return setMsg({ erro: 'Não foi possível salvar os preços.', ok: '' });
    setMsg({ erro: '', ok: 'Preços salvos.' });
  };

  return (
    <section className="rounded-2xl p-6 md:p-7 grid md:grid-cols-[14rem_1fr] gap-5 md:gap-8" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div>
        <h3 className="font-bold text-[16.5px]" style={display}>Venda</h3>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.mute }}>Preço cobrado no Mercado Pago (Pix, boleto ou cartão parcelado) e a oferta extra mostrada na tela de compra. Ou deixe o curso gratuito.</p>
      </div>
      {!carregado ? <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p> : semTabela ? (
        <p className="text-[14px]" style={{ color: 'var(--a-red)' }}>Rode o <strong>014_vendas.sql</strong> no Supabase para configurar preços.</p>
      ) : (
        <div className="space-y-5">
          <Chave ligado={aVenda} onChange={setAVenda} texto={aVenda ? (gratis ? 'Disponível (botão "Começar grátis" aparece para quem não tem o curso)' : 'À venda (botão "Comprar" aparece para quem não tem o curso)') : 'Fora de venda'} />
          <Chave ligado={gratis} onChange={setGratis} texto="Curso gratuito (o aluno libera o curso sem pagar nada)" />
          {!gratis && <>
          <div className="grid sm:grid-cols-2 gap-5 max-w-md">
            <Rotulo texto="Preço (R$)"><input className={inputCls} inputMode="decimal" placeholder="49,90" value={preco} onChange={e => setPreco(e.target.value)} /></Rotulo>
            <Rotulo texto="Preço promocional (R$)" dica="Opcional. Aparece com o preço normal riscado.">
              <input className={inputCls} inputMode="decimal" placeholder="29,90" value={promo} onChange={e => setPromo(e.target.value)} />
            </Rotulo>
          </div>
          <div className="pt-5 space-y-4" style={{ borderTop: `1px solid ${T.rule}` }}>
            <Chave ligado={extraAtivo} onChange={setExtraAtivo} texto="Oferta extra na tela de compra" />
            {extraAtivo && (
              <div className="grid sm:grid-cols-[1fr_9rem] gap-5">
                <Rotulo texto="Nome da oferta"><input className={inputCls} value={extraTitulo} onChange={e => setExtraTitulo(e.target.value)} /></Rotulo>
                <Rotulo texto="Preço (R$)"><input className={inputCls} inputMode="decimal" placeholder="19,90" value={extraPreco} onChange={e => setExtraPreco(e.target.value)} /></Rotulo>
              </div>
            )}
          </div>
          </>}
          {msg.erro && <p className="text-[13.5px]" style={{ color: 'var(--a-red)' }}>{msg.erro}</p>}
          {msg.ok && <p className="text-[13.5px]" style={{ color: 'var(--a-green)' }}>{msg.ok}</p>}
          <div><button onClick={salvar} disabled={salvando} className={botaoPrimario}>{salvando ? 'Salvando…' : 'Salvar preços'}</button></div>
        </div>
      )}
    </section>
  );
}

/* ─── Seção Vendas: pedidos + cupons ─────────────────────────────── */
type Pedido = {
  id: string; status: string; total: number; desconto: number; cupom: string | null; com_oferta_extra: boolean;
  forma_pagamento: string | null; criado_em: string; pago_em: string | null; user_id: string; course_id: string;
};
type Cupom = { codigo: string; tipo: 'percentual' | 'valor'; valor: number; course_id: string | null; validade: string | null; limite_usos: number | null; usos: number; ativo: boolean };

const STATUS: Record<string, { t: string; bg: string; c: string }> = {
  pago:        { t: 'Pago',        bg: 'var(--a-green-bg)', c: 'var(--a-green)' },
  pendente:    { t: 'Pendente',    bg: '#FEF3C7', c: 'var(--a-amber)' },
  recusado:    { t: 'Recusado',    bg: '#FEE2E2', c: 'var(--a-red)' },
  cancelado:   { t: 'Cancelado',   bg: 'var(--a-soft)', c: T.mute },
  reembolsado: { t: 'Reembolsado', bg: 'var(--a-soft)', c: T.mute },
};
const FORMA: Record<string, string> = { pix: 'Pix', bank_transfer: 'Pix', credit_card: 'Cartão', debit_card: 'Débito', ticket: 'Boleto', account_money: 'Saldo MP', gratuito: 'Gratuito' };
const data = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function Tela({ nome }: { nome: string }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [cursos, setCursos] = useState<Map<string, string>>(new Map());
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  // novo cupom
  const [nc, setNc] = useState({ codigo: '', tipo: 'percentual' as 'percentual' | 'valor', valor: '', curso: '', validade: '', limite: '' });
  const [msgCupom, setMsgCupom] = useState({ erro: '', ok: '' });

  const carregar = useCallback(async () => {
    const [p, c, cs, pf] = await Promise.all([
      supabase.from('academy_orders').select('*').order('criado_em', { ascending: false }).limit(500),
      supabase.from('academy_coupons').select('*').order('criado_em', { ascending: false }),
      supabase.from('academy_courses').select('id, titulo'),
      supabase.from('academy_profiles').select('id, nome'),
    ]);
    if (p.error) setErro('Não foi possível carregar as vendas. Confira se o 014_vendas.sql foi rodado no Supabase.');
    setPedidos((p.data ?? []) as Pedido[]);
    setCupons((c.data ?? []) as Cupom[]);
    setCursos(new Map((cs.data ?? []).map(x => [x.id as string, x.titulo as string])));
    setNomes(new Map((pf.data ?? []).map(x => [x.id as string, (x.nome as string) || 'Aluno'])));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const lista = useMemo(() => (pedidos ?? []).filter(p => !filtro || p.status === filtro), [pedidos, filtro]);
  const pagos = (pedidos ?? []).filter(p => p.status === 'pago');
  const faturamento = pagos.reduce((s, p) => s + Number(p.total), 0);
  const comOferta = pagos.filter(p => p.com_oferta_extra).length;

  const criarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = nc.codigo.trim().toUpperCase();
    const valor = numero(nc.valor);
    if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) return setMsgCupom({ erro: 'Código com 3 a 30 letras, números, - ou _.', ok: '' });
    if (!(valor > 0) || (nc.tipo === 'percentual' && valor > 100)) return setMsgCupom({ erro: 'Valor do desconto inválido.', ok: '' });
    const { error } = await supabase.from('academy_coupons').insert({
      codigo, tipo: nc.tipo, valor, course_id: nc.curso || null,
      validade: nc.validade ? new Date(`${nc.validade}T23:59:59`).toISOString() : null,
      limite_usos: nc.limite ? Number(nc.limite) : null,
    });
    if (error) return setMsgCupom({ erro: error.code === '23505' ? 'Já existe um cupom com esse código.' : 'Não foi possível criar o cupom.', ok: '' });
    setNc({ codigo: '', tipo: 'percentual', valor: '', curso: '', validade: '', limite: '' });
    setMsgCupom({ erro: '', ok: `Cupom ${codigo} criado.` });
    carregar();
  };
  const alternarCupom = async (c: Cupom) => { await supabase.from('academy_coupons').update({ ativo: !c.ativo }).eq('codigo', c.codigo); carregar(); };
  const apagarCupom = async (c: Cupom) => {
    if (!window.confirm(`Apagar o cupom ${c.codigo}?`)) return;
    await supabase.from('academy_coupons').delete().eq('codigo', c.codigo); carregar();
  };

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloAdmin titulo="Vendas" sub="Pedidos pagos pelo Mercado Pago e cupons de desconto." />
        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {!pedidos ? <Carregando /> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {[
                { v: reais(faturamento), l: 'faturamento', d: 'pedidos pagos' },
                { v: pagos.length, l: 'vendas', d: 'pedidos pagos' },
                { v: pagos.length ? reais(faturamento / pagos.length) : '—', l: 'ticket médio', d: 'por venda' },
                { v: pagos.length ? `${Math.round((comOferta / pagos.length) * 100)}%` : '—', l: 'levaram a oferta extra', d: `${comOferta} de ${pagos.length}` },
              ].map(k => (
                <div key={k.l} className="rounded-2xl p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <div className="font-bold text-[24px] leading-none" style={display}>{k.v}</div>
                  <div className="text-[13.5px] font-medium mt-1.5" style={{ color: T.ink2 }}>{k.l}</div>
                  <div className="text-[12px]" style={{ color: T.mute }}>{k.d}</div>
                </div>
              ))}
            </div>

            {/* Pedidos */}
            <section className="mb-10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: T.mute }}>Pedidos</h2>
                <select className={`${inputCls} w-48`} value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por status">
                  <option value="">Todos</option>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
                </select>
              </div>
              <div className="rounded-2xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                {lista.length === 0 ? (
                  <div className="p-8 text-center"><Receipt size={26} strokeWidth={1.5} className="mx-auto" style={{ color: T.mute }} /><p className="text-[14px] mt-2" style={{ color: T.mute }}>Nenhum pedido.</p></div>
                ) : (
                  <table className="w-full min-w-[760px] text-[14px]">
                    <thead>
                      <tr className="text-left text-[12px] uppercase tracking-wide" style={{ color: T.mute, borderBottom: `1px solid ${T.rule}` }}>
                        <th className="px-5 py-3 font-semibold">Data</th><th className="px-3 py-3 font-semibold">Aluno</th><th className="px-3 py-3 font-semibold">Curso</th>
                        <th className="px-3 py-3 font-semibold">Pagamento</th><th className="px-3 py-3 font-semibold text-right">Total</th><th className="px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((p, i) => {
                        const s = STATUS[p.status] ?? STATUS.pendente;
                        return (
                          <tr key={p.id} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                            <td className="px-5 py-3 whitespace-nowrap" style={{ color: T.mute }}>{data(p.criado_em)}</td>
                            <td className="px-3 py-3">{nomes.get(p.user_id) ?? 'Aluno'}</td>
                            <td className="px-3 py-3">
                              {cursos.get(p.course_id) ?? '—'}
                              {(p.com_oferta_extra || p.cupom) && (
                                <span className="block text-[12px]" style={{ color: T.mute }}>
                                  {p.com_oferta_extra && '+ oferta extra'}{p.com_oferta_extra && p.cupom && ' · '}{p.cupom && `cupom ${p.cupom}`}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3" style={{ color: T.mute }}>{p.forma_pagamento ? (FORMA[p.forma_pagamento] ?? p.forma_pagamento) : '—'}</td>
                            <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{reais(Number(p.total))}</td>
                            <td className="px-5 py-3"><span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.c }}>{s.t}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-[12.5px] mt-2" style={{ color: T.mute }}>Reembolsos são feitos no painel do Mercado Pago. Quando o reembolso acontece, o pedido muda para "Reembolsado" e o acesso ao curso é removido sozinho.</p>
            </section>

            {/* Cupons */}
            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide mb-3" style={{ color: T.mute }}>Cupons de desconto</h2>
              <form onSubmit={criarCupom} className="rounded-2xl p-5 mb-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <Rotulo texto="Código"><input className={`${inputCls} uppercase`} value={nc.codigo} placeholder="LANCAMENTO" onChange={e => setNc({ ...nc, codigo: e.target.value })} /></Rotulo>
                <Rotulo texto="Tipo">
                  <select className={inputCls} value={nc.tipo} onChange={e => setNc({ ...nc, tipo: e.target.value as 'percentual' | 'valor' })}>
                    <option value="percentual">% de desconto</option><option value="valor">R$ de desconto</option>
                  </select>
                </Rotulo>
                <Rotulo texto={nc.tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}><input className={inputCls} inputMode="decimal" value={nc.valor} onChange={e => setNc({ ...nc, valor: e.target.value })} /></Rotulo>
                <Rotulo texto="Curso">
                  <select className={inputCls} value={nc.curso} onChange={e => setNc({ ...nc, curso: e.target.value })}>
                    <option value="">Todos os cursos</option>
                    {[...cursos.entries()].map(([id, t]) => <option key={id} value={id}>{t}</option>)}
                  </select>
                </Rotulo>
                <Rotulo texto="Válido até"><input type="date" className={inputCls} value={nc.validade} onChange={e => setNc({ ...nc, validade: e.target.value })} /></Rotulo>
                <Rotulo texto="Limite de usos"><input type="number" min={1} className={inputCls} placeholder="ilimitado" value={nc.limite} onChange={e => setNc({ ...nc, limite: e.target.value })} /></Rotulo>
                <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap items-center gap-4">
                  <button type="submit" className={botaoPrimario}><Plus size={16} /> Criar cupom</button>
                  {msgCupom.erro && <span className="text-[13.5px]" style={{ color: 'var(--a-red)' }}>{msgCupom.erro}</span>}
                  {msgCupom.ok && <span className="text-[13.5px]" style={{ color: 'var(--a-green)' }}>{msgCupom.ok}</span>}
                </div>
              </form>

              <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                {cupons.length === 0 && <p className="p-6 text-center text-[14px]" style={{ color: T.mute }}>Nenhum cupom criado.</p>}
                {cupons.map((c, i) => {
                  const vencido = c.validade && new Date(c.validade) < new Date();
                  const esgotado = c.limite_usos != null && c.usos >= c.limite_usos;
                  return (
                    <div key={c.codigo} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                      <span className="inline-flex items-center gap-1.5 font-bold text-[14.5px]" style={{ ...display, color: c.ativo && !vencido && !esgotado ? T.ink : T.mute }}>
                        <Tag size={14} /> {c.codigo}
                      </span>
                      <span className="text-[13.5px]">{c.tipo === 'percentual' ? `${Number(c.valor)}%` : reais(Number(c.valor))} off</span>
                      <span className="text-[13px]" style={{ color: T.mute }}>{c.course_id ? cursos.get(c.course_id) ?? 'curso' : 'todos os cursos'}</span>
                      <span className="text-[13px]" style={{ color: T.mute }}>{c.usos}{c.limite_usos ? `/${c.limite_usos}` : ''} usos</span>
                      <span className="text-[13px]" style={{ color: vencido ? 'var(--a-red)' : T.mute }}>
                        {c.validade ? `${vencido ? 'venceu' : 'até'} ${new Date(c.validade).toLocaleDateString('pt-BR')}` : 'sem prazo'}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Chave ligado={c.ativo} onChange={() => alternarCupom(c)} texto={c.ativo ? 'Ativo' : 'Pausado'} />
                        <button onClick={() => apagarCupom(c)} aria-label={`Apagar ${c.codigo}`} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-red-50" style={{ color: 'var(--a-red)' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}

export default function AdminVendas({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Tela nome={nome} />}</SoAdmin>;
}
