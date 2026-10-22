import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Clock, Loader2, Lock, ShieldCheck, Tag, XCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, Carregando } from './AppLayout';
import { Link } from './router';
import { supabase } from './supabase';

type Resumo = {
  curso: string; itens: { titulo: string; valor: number }[]; subtotal: number; desconto: number; total: number;
  cupom: string | null; cupom_msg: string; preco_de: number | null; parcelas_max: number;
  oferta_extra: { titulo: string; valor: number; de: number | null } | null;
};

export const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ERROS: Record<string, string> = {
  ja_matriculado: 'Você já tem acesso a este curso.',
  vendas_fechadas: 'As vendas deste curso abrem em breve.',
  sem_preco: 'Este curso ainda não está à venda.',
  curso_nao_encontrado: 'Curso não encontrado.',
  mercado_pago: 'O Mercado Pago não respondeu. Tente de novo em instantes.',
};

/* Chama a função do servidor que calcula o preço (e, ao pagar, cria o pedido no Mercado Pago) */
type RespostaCheckout = Partial<Resumo> & { url?: string; erro?: string; detalhe?: string };
async function checkout(corpo: Record<string, unknown>): Promise<RespostaCheckout> {
  const { data, error } = await supabase.functions.invoke('academy-checkout', { body: corpo });
  if (error) {
    let corpo: { erro?: string; detalhe?: string } = {};
    try { corpo = (await (error as { context?: Response }).context?.json()) ?? {}; } catch { /* sem corpo */ }
    return { erro: corpo.erro ?? 'erro', detalhe: corpo.detalhe };
  }
  return data as RespostaCheckout;
}

/* ─── /comprar/:slug — resumo do pedido, oferta extra, cupom e botão de pagar ── */
export function Comprar({ sessao, slug }: { sessao: Session; slug: string }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');
  const [comOferta, setComOferta] = useState(false);
  const [cupom, setCupom] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState('');
  const [calculando, setCalculando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const nome = (sessao.user.user_metadata?.nome as string | undefined) || sessao.user.email || '';

  const calcular = async (oferta: boolean, codigo: string) => {
    setCalculando(true);
    const r = await checkout({ slug, acao: 'calcular', com_oferta: oferta, cupom: codigo });
    setCalculando(false);
    if (r.erro) { setErro(ERROS[r.erro] ?? 'Não foi possível carregar o pedido. Recarregue a página.'); return; }
    setErro(''); setResumo(r as Resumo);
  };
  useEffect(() => { calcular(false, ''); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternarOferta = () => { const v = !comOferta; setComOferta(v); calcular(v, cupomAplicado); };
  const aplicarCupom = (e: React.FormEvent) => { e.preventDefault(); setCupomAplicado(cupom.trim().toUpperCase()); calcular(comOferta, cupom.trim().toUpperCase()); };

  const pagar = async () => {
    setPagando(true); setErro('');
    const r = await checkout({ slug, acao: 'pagar', com_oferta: comOferta, cupom: resumo?.cupom ?? '' });
    if (r.url) { window.location.href = r.url; return; }
    setPagando(false);
    setErro(r.erro === 'mercado_pago' && r.detalhe
      ? `O Mercado Pago recusou o pagamento: ${r.detalhe}`
      : ERROS[r.erro ?? ''] ?? 'Não foi possível iniciar o pagamento. Tente de novo.');
  };

  if (!resumo && !erro) return <AppLayout nome={nome}><Carregando /></AppLayout>;

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="max-w-3xl mx-auto">
        <Link para={`/curso/${slug}`} className="inline-flex items-center gap-1.5 text-[14px] font-medium mb-5 hover:underline underline-offset-4" style={{ color: T.mute }}>
          <ArrowLeft size={15} strokeWidth={1.75} /> Voltar ao curso
        </Link>
        <h1 className="font-bold leading-tight mb-6" style={{ ...display, fontSize: 'clamp(26px,3.2vw,34px)' }}>Finalizar compra</h1>

        {erro && !resumo && (
          <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
            <p className="font-semibold">{erro}</p>
            <Link para="/painel" className="inline-block mt-4 font-semibold" style={{ color: T.accent }}>Ir para meus cursos</Link>
          </div>
        )}

        {resumo && (
          <div className="grid md:grid-cols-[1fr_20rem] gap-5 items-start">
            <div className="space-y-4">
              {/* Curso */}
              <section className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <p className="text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: T.accent }}>Curso</p>
                <p className="font-bold text-[18px] mt-1" style={display}>{resumo.curso}</p>
                <ul className="mt-3 space-y-1.5 text-[14px]" style={{ color: T.ink2 }}>
                  {['Acesso a todas as aulas, no celular e no computador', 'Materiais para baixar', 'Certificado de conclusão', 'Garantia de 7 dias: não gostou, devolvemos o valor'].map(t => (
                    <li key={t} className="flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" color="#22C55E" /> {t}</li>
                  ))}
                </ul>
              </section>

              {/* Oferta extra */}
              {resumo.oferta_extra && (
                <button type="button" onClick={alternarOferta} disabled={calculando}
                  className="w-full text-left rounded-2xl p-5 flex items-start gap-4 transition-colors"
                  style={{ background: comOferta ? 'rgba(79,70,229,0.06)' : T.card, border: `1.5px ${comOferta ? 'solid' : 'dashed'} ${comOferta ? T.accent : 'rgba(79,70,229,0.4)'}` }}>
                  <span className="mt-0.5 w-5 h-5 rounded-[5px] shrink-0 flex items-center justify-center"
                    style={{ background: comOferta ? T.accent : T.card, border: `1.5px solid ${comOferta ? T.accent : 'rgba(15,23,42,0.25)'}` }}>
                    {comOferta && <CheckCircle2 size={14} color="#FFFFFF" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[12px] font-bold uppercase tracking-wide" style={{ color: '#C2410C' }}>Oferta só nesta tela</span>
                    <span className="block font-semibold text-[15px] mt-0.5">Adicionar {resumo.oferta_extra.titulo}</span>
                    <span className="block text-[14px] mt-1" style={{ color: T.mute }}>
                      por mais <strong style={{ color: T.ink }}>{reais(resumo.oferta_extra.valor)}</strong>
                      {resumo.oferta_extra.de != null && <> <s>{reais(resumo.oferta_extra.de)}</s></>}
                    </span>
                  </span>
                </button>
              )}

              {/* Cupom */}
              <form onSubmit={aplicarCupom} className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <label className="text-[13.5px] font-semibold" htmlFor="cupom">Tem um cupom?</label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.mute }} />
                    <input id="cupom" className="acad-field w-full h-11 rounded-[10px] pl-10 pr-3 text-[14.5px] uppercase" value={cupom}
                      onChange={e => setCupom(e.target.value)} placeholder="CÓDIGO" />
                  </div>
                  <button type="submit" disabled={calculando || !cupom.trim()} className="h-11 px-4 rounded-[10px] text-[14px] font-semibold hover:bg-slate-50 disabled:opacity-50"
                    style={{ color: T.accent, border: '1px solid rgba(79,70,229,0.3)' }}>Aplicar</button>
                </div>
                {resumo.cupom_msg && <p className="text-[13px] mt-2" style={{ color: resumo.cupom ? '#15803D' : '#B91C1C' }}>{resumo.cupom_msg}</p>}
              </form>
            </div>

            {/* Total */}
            <aside className="rounded-2xl p-5 md:sticky md:top-24" style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 20px 44px -28px rgba(79,70,229,0.4)' }}>
              <p className="font-bold text-[16px] mb-3" style={display}>Resumo</p>
              <div className="space-y-2 text-[14px]">
                {resumo.itens.map(i => (
                  <div key={i.titulo} className="flex justify-between gap-3"><span style={{ color: T.ink2 }}>{i.titulo}</span><span>{reais(i.valor)}</span></div>
                ))}
                {resumo.desconto > 0 && (
                  <div className="flex justify-between gap-3" style={{ color: '#15803D' }}><span>Cupom {resumo.cupom}</span><span>− {reais(resumo.desconto)}</span></div>
                )}
              </div>
              <div className="flex justify-between items-baseline mt-4 pt-4" style={{ borderTop: `1px solid ${T.rule}` }}>
                <span className="font-semibold">Total</span>
                <span className="font-bold text-[24px]" style={display}>{calculando ? '…' : reais(resumo.total)}</span>
              </div>
              {resumo.preco_de != null && <p className="text-[12.5px] text-right" style={{ color: T.mute }}>De <s>{reais(resumo.preco_de)}</s></p>}
              <p className="text-[12.5px] mt-1 text-right" style={{ color: T.mute }}>Pix, boleto ou cartão em até {resumo.parcelas_max}x</p>

              {erro && <p className="text-[13.5px] mt-3" style={{ color: '#B91C1C' }}>{erro}</p>}
              <button onClick={pagar} disabled={pagando || calculando}
                className="acad-btn w-full mt-4 h-12 rounded-[10px] inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white">
                {pagando ? <><Loader2 size={17} className="animate-spin" /> Abrindo pagamento…</> : <><Lock size={16} /> Pagar com Mercado Pago</>}
              </button>
              <p className="flex items-start gap-1.5 text-[12px] mt-3" style={{ color: T.mute }}>
                <ShieldCheck size={14} className="shrink-0 mt-px" /> Pagamento processado pelo Mercado Pago. Seus dados de cartão não passam pela Nexla.
              </p>
            </aside>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

/* ─── /compra/:id — retorno do Mercado Pago: acompanha o status do pedido ── */
export function RetornoCompra({ sessao, id }: { sessao: Session; id: string }) {
  type Pedido = { status: string; total: number; forma_pagamento: string | null; academy_courses: { slug: string; titulo: string } | null };
  const [pedido, setPedido] = useState<Pedido | null | 'nao'>(null);
  const nome = (sessao.user.user_metadata?.nome as string | undefined) || sessao.user.email || '';

  useEffect(() => {
    let vivo = true;
    let tentativas = 0;
    const buscar = async () => {
      const { data } = await supabase.from('academy_orders').select('status, total, forma_pagamento, academy_courses(slug, titulo)')
        .eq('id', id).eq('user_id', sessao.user.id).maybeSingle();
      if (!vivo) return;
      setPedido(data ? (data as unknown as Pedido) : 'nao');
      // Enquanto o Mercado Pago não confirma (Pix leva alguns segundos), confere de novo
      if (data?.status === 'pendente' && tentativas++ < 60) setTimeout(buscar, 5000);
    };
    buscar();
    return () => { vivo = false; };
  }, [id, sessao]);

  if (!pedido) return <AppLayout nome={nome}><Carregando /></AppLayout>;
  if (pedido === 'nao') {
    return <AppLayout nome={nome}><p className="text-center py-16">Pedido não encontrado. <Link para="/painel" className="font-semibold" style={{ color: T.accent }}>Ir para meus cursos</Link></p></AppLayout>;
  }

  const curso = pedido.academy_courses;
  const estados: Record<string, { icone: typeof Clock; cor: string; titulo: string; texto: string }> = {
    pago:        { icone: CheckCircle2, cor: '#15803D', titulo: 'Pagamento aprovado!', texto: `Seu acesso a ${curso?.titulo ?? 'o curso'} já está liberado. Bons estudos!` },
    pendente:    { icone: Clock,        cor: '#B45309', titulo: 'Aguardando a confirmação do pagamento',
                   texto: pedido.forma_pagamento === 'ticket' ? 'O boleto pode levar até 3 dias úteis para compensar. Assim que o banco confirmar, o curso libera sozinho e avisamos você.' : 'Assim que o Mercado Pago confirmar, o curso libera sozinho. Pode deixar esta página aberta.' },
    recusado:    { icone: XCircle,      cor: '#B91C1C', titulo: 'Pagamento não aprovado', texto: 'O pagamento foi recusado. Você pode tentar de novo com outro cartão ou pagar com Pix.' },
    cancelado:   { icone: XCircle,      cor: '#B91C1C', titulo: 'Pagamento cancelado', texto: 'Nenhuma cobrança foi feita. Você pode tentar de novo quando quiser.' },
    reembolsado: { icone: XCircle,      cor: T.mute,    titulo: 'Pedido reembolsado', texto: 'O valor foi devolvido e o acesso ao curso foi encerrado.' },
  };
  const e = estados[pedido.status] ?? estados.pendente;

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
        className="max-w-lg mx-auto text-center rounded-2xl p-8 md:p-10" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
        <e.icone size={48} strokeWidth={1.5} className={`mx-auto ${pedido.status === 'pendente' ? 'animate-pulse' : ''}`} style={{ color: e.cor }} />
        <h1 className="font-bold text-[24px] leading-tight mt-4" style={display}>{e.titulo}</h1>
        <p className="text-[15px] mt-2" style={{ color: T.mute }}>{e.texto}</p>
        <p className="text-[13.5px] mt-3" style={{ color: T.mute }}>Valor: <strong style={{ color: T.ink }}>{reais(Number(pedido.total))}</strong></p>
        <div className="mt-7 flex flex-col gap-3">
          {pedido.status === 'pago' && curso && (
            <Link para={`/curso/${curso.slug}`} className="acad-btn inline-flex items-center justify-center gap-2 h-12 rounded-[10px] text-[15px] font-semibold text-white">
              <Award size={17} /> Começar o curso <ArrowRight size={16} />
            </Link>
          )}
          {(pedido.status === 'recusado' || pedido.status === 'cancelado') && curso && (
            <Link para={`/comprar/${curso.slug}`} className="acad-btn inline-flex items-center justify-center gap-2 h-12 rounded-[10px] text-[15px] font-semibold text-white">
              Tentar de novo
            </Link>
          )}
          <Link para="/painel" className="text-[14px] font-semibold" style={{ color: T.accent }}>Ir para meus cursos</Link>
        </div>
      </motion.div>
    </AppLayout>
  );
}
