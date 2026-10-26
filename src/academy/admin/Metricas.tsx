import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Gift, Receipt, RotateCcw, ShoppingBag, TrendingUp } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando } from '../AppLayout';
import { supabase } from '../supabase';
import { reais } from '../Compra';
import { SoAdmin, AdminLayout, TituloAdmin, inputCls } from './comum';

type LinhaOrigem = { origem: string; visitantes: number; cadastros: number; compradores: number; pedidos: number; faturamento: number };
type LinhaAula = { id: string; titulo: string; modulo: string; abriram: number; concluiram: number };
type Dados = {
  visitantes: number; cadastros: number; compradores: number; pedidos_pagos: number; faturamento: number;
  com_oferta: number; gratuitos: number; reembolsos: number; reembolsos_valor: number; vendidos: number;
  pendentes: number; pendentes_valor: number; por_origem: LinhaOrigem[]; origens: string[];
  aulas: LinhaAula[]; matriculados: number | null;
};

const PERIODOS = [
  { id: '7', texto: 'Últimos 7 dias', dias: 7 },
  { id: '30', texto: 'Últimos 30 dias', dias: 30 },
  { id: '90', texto: 'Últimos 90 dias', dias: 90 },
  { id: '365', texto: 'Últimos 12 meses', dias: 365 },
  { id: 'tudo', texto: 'Desde o início', dias: 0 },
];
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const pctTexto = (a: number, b: number) => (b ? `${pct(a, b).toLocaleString('pt-BR')}%` : '—');
const BARRA = 'var(--a-barra)';

/* Barra fina de uma série só (cor única = grandeza); o número fica escrito ao lado, não só na cor */
function Barra({ valor, max, titulo }: { valor: number; max: number; titulo: string }) {
  const w = max ? Math.max(valor ? 1.5 : 0, (valor / max) * 100) : 0;
  return (
    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--a-track)' }} title={titulo}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${w}%`, background: BARRA }} />
    </div>
  );
}

function Cartao({ icone: Icone, valor, rotulo, detalhe }: { icone: typeof Clock; valor: string; rotulo: string; detalhe: string }) {
  return (
    <div className="rounded-2xl p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <Icone size={18} strokeWidth={1.75} style={{ color: T.accent }} />
      <div className="font-bold text-[24px] md:text-[26px] leading-none mt-3" style={display}>{valor}</div>
      <div className="text-[13.5px] font-medium mt-1.5" style={{ color: T.ink2 }}>{rotulo}</div>
      <div className="text-[12px] mt-0.5" style={{ color: T.mute }}>{detalhe}</div>
    </div>
  );
}

const subtitulo = 'text-[13px] font-semibold uppercase tracking-wide mb-3';

function Tela({ nome }: { nome: string }) {
  const [periodo, setPeriodo] = useState('30');
  const [curso, setCurso] = useState('');
  const [origem, setOrigem] = useState('');
  const [cursos, setCursos] = useState<{ id: string; titulo: string }[]>([]);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.from('academy_courses').select('id, titulo').order('ordem').then(({ data }) => setCursos((data ?? []) as { id: string; titulo: string }[]));
  }, []);

  useEffect(() => {
    let vivo = true;
    const dias = PERIODOS.find(p => p.id === periodo)!.dias;
    const desde = dias ? new Date(Date.now() - dias * 86400000).toISOString() : '2020-01-01T00:00:00Z';
    setCarregando(true);
    supabase.rpc('academy_metricas', { p_desde: desde, p_curso: curso || null, p_origem: origem || null }).then(({ data, error }) => {
      if (!vivo) return;
      setCarregando(false);
      if (error) { setErro('Não foi possível calcular as métricas. Confira se o 023_metricas_leads.sql foi rodado no Supabase.'); return; }
      setErro(''); setDados(data as Dados);
    });
    return () => { vivo = false; };
  }, [periodo, curso, origem]);

  const d = dados;
  const etapas = d ? [
    { rotulo: 'Visitantes', detalhe: 'pessoas que abriram a Academy', valor: d.visitantes, conv: null as string | null },
    { rotulo: 'Cadastros', detalhe: 'contas criadas', valor: d.cadastros, conv: `${pctTexto(d.cadastros, d.visitantes)} dos visitantes` },
    { rotulo: 'Compradores', detalhe: 'pessoas com compra paga', valor: d.compradores, conv: `${pctTexto(d.compradores, d.cadastros)} dos cadastros` },
  ] : [];
  const maxFunil = d ? Math.max(d.visitantes, d.cadastros, d.compradores, 1) : 1;

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloAdmin titulo="Métricas" sub="Quanto rende cada etapa do funil: de quem visita até quem compra e conclui as aulas." />

        {/* Filtros (uma linha acima de tudo) */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <select className={inputCls} value={periodo} onChange={e => setPeriodo(e.target.value)} aria-label="Período">
            {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
          </select>
          <select className={inputCls} value={curso} onChange={e => setCurso(e.target.value)} aria-label="Curso">
            <option value="">Todos os cursos</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
          <select className={inputCls} value={origem} onChange={e => setOrigem(e.target.value)} aria-label="Origem">
            <option value="">Todas as origens</option>
            {(d?.origens ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {erro ? (
          <p className="text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>
        ) : !d ? <Carregando /> : (
          <div className={`space-y-10 transition-opacity ${carregando ? 'opacity-60' : ''}`}>
            {/* Funil */}
            <section>
              <h2 className={subtitulo} style={{ color: T.mute }}>Funil</h2>
              <div className="rounded-2xl p-5 md:p-6 space-y-5" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                {etapas.map(e => (
                  <div key={e.rotulo} className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[10rem_1fr_9rem] items-center gap-x-4 gap-y-1.5">
                    <div>
                      <p className="font-semibold text-[14.5px]">{e.rotulo}</p>
                      <p className="text-[12px]" style={{ color: T.mute }}>{e.detalhe}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1"><Barra valor={e.valor} max={maxFunil} titulo={`${e.rotulo}: ${e.valor}${e.conv ? ` (${e.conv})` : ''}`} /></div>
                      <span className="font-bold text-[18px] w-14 text-right" style={display}>{e.valor.toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="col-start-2 sm:col-start-auto text-[12.5px] sm:text-right" style={{ color: T.mute }}>{e.conv ?? ''}</p>
                  </div>
                ))}
                <p className="text-[12px] pt-1" style={{ color: T.mute }}>
                  Visitantes são contados desde que o registro de visitas foi ligado. {curso ? 'Com um curso escolhido, visitantes são os da página desse curso; cadastros contam todos.' : ''}
                </p>
              </div>
            </section>

            {/* Vendas */}
            <section>
              <h2 className={subtitulo} style={{ color: T.mute }}>Vendas</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <Cartao icone={TrendingUp} valor={reais(d.faturamento)} rotulo="Faturamento" detalhe="pedidos pagos no período" />
                <Cartao icone={ShoppingBag} valor={String(d.pedidos_pagos)} rotulo="Pedidos pagos" detalhe={d.gratuitos ? `+ ${d.gratuitos} grátis` : 'sem contar os grátis'} />
                <Cartao icone={Receipt} valor={d.pedidos_pagos ? reais(d.faturamento / d.pedidos_pagos) : '—'} rotulo="Ticket médio" detalhe="faturamento ÷ pedidos" />
                <Cartao icone={Gift} valor={pctTexto(d.com_oferta, d.pedidos_pagos)} rotulo="Oferta extra" detalhe={`${d.com_oferta} pedidos com o pacote`} />
                <Cartao icone={RotateCcw} valor={pctTexto(d.reembolsos, d.vendidos)} rotulo="Reembolsos" detalhe={`${d.reembolsos} pedidos · ${reais(d.reembolsos_valor)}`} />
                <Cartao icone={Clock} valor={String(d.pendentes)} rotulo="Pix e boletos parados" detalhe={`${reais(d.pendentes_valor)} sem pagar`} />
              </div>
            </section>

            {/* Por origem */}
            <section>
              <h2 className={subtitulo} style={{ color: T.mute }}>Vendas por origem</h2>
              {d.por_origem.length === 0 ? (
                <p className="rounded-2xl p-6 text-[14px]" style={{ background: T.card, border: `1px dashed ${T.rule}`, color: T.mute }}>Ainda não há visitas, cadastros ou vendas neste período.</p>
              ) : (
                <div className="rounded-2xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <table className="w-full min-w-[720px] text-[14px]">
                    <thead>
                      <tr className="text-left text-[12px] uppercase tracking-wide" style={{ color: T.mute, borderBottom: `1px solid ${T.rule}` }}>
                        <th className="px-5 py-3 font-semibold">Origem</th>
                        <th className="px-3 py-3 font-semibold text-right">Visitantes</th>
                        <th className="px-3 py-3 font-semibold text-right">Cadastros</th>
                        <th className="px-3 py-3 font-semibold text-right">Compradores</th>
                        <th className="px-3 py-3 font-semibold text-right">Cadastro → compra</th>
                        <th className="px-5 py-3 font-semibold text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.por_origem.map((o, i) => (
                        <tr key={o.origem} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                          <td className="px-5 py-3 font-semibold">{o.origem}</td>
                          <td className="px-3 py-3 text-right">{o.visitantes}</td>
                          <td className="px-3 py-3 text-right">{o.cadastros}</td>
                          <td className="px-3 py-3 text-right">{o.compradores}</td>
                          <td className="px-3 py-3 text-right">{pctTexto(o.compradores, o.cadastros)}</td>
                          <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">{reais(Number(o.faturamento))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[12px] mt-2" style={{ color: T.mute }}>
                A origem vem do link do anúncio (utm_source) na primeira visita. Sem UTM, aparece o site de onde a pessoa veio ou "direto".
              </p>
            </section>

            {/* Onde abandonam */}
            <section>
              <h2 className={subtitulo} style={{ color: T.mute }}>Onde os alunos abandonam</h2>
              {!curso ? (
                <p className="rounded-2xl p-6 text-[14px]" style={{ background: T.card, border: `1px dashed ${T.rule}`, color: T.mute }}>
                  Escolha um curso no filtro acima para ver, aula por aula, quantos alunos chegaram até ela e quantos concluíram.
                </p>
              ) : d.aulas.length === 0 ? (
                <p className="rounded-2xl p-6 text-[14px]" style={{ background: T.card, border: `1px dashed ${T.rule}`, color: T.mute }}>Este curso ainda não tem aulas.</p>
              ) : (
                <div className="rounded-2xl p-5 md:p-6" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                  <p className="text-[13px] mb-4" style={{ color: T.mute }}>
                    {d.matriculados ?? 0} aluno{d.matriculados === 1 ? '' : 's'} com o curso. A barra mostra quantos concluíram cada aula.
                  </p>
                  <ol className="space-y-3.5">
                    {d.aulas.map((a, i) => (
                      <li key={a.id} className="grid sm:grid-cols-[minmax(0,18rem)_1fr_10rem] items-center gap-x-4 gap-y-1.5">
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium truncate" title={a.titulo}>{i + 1}. {a.titulo}</p>
                          <p className="text-[12px] truncate" style={{ color: T.mute }}>{a.modulo}</p>
                        </div>
                        <Barra valor={a.concluiram} max={d.matriculados ?? 0}
                          titulo={`${a.titulo}: ${a.concluiram} de ${d.matriculados ?? 0} concluíram, ${a.abriram} abriram`} />
                        <p className="text-[12.5px] sm:text-right whitespace-nowrap" style={{ color: T.mute }}>
                          <strong style={{ color: T.ink }}>{a.concluiram}</strong> concluíram ({pctTexto(a.concluiram, d.matriculados ?? 0)}) · {a.abriram} abriram
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}

export default function Metricas({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Tela nome={nome} />}</SoAdmin>;
}
