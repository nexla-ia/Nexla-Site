import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, MessageCircle, Search } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando } from '../AppLayout';
import { supabase } from '../supabase';
import { reais } from '../Compra';
import { SoAdmin, AdminLayout, TituloAdmin, inputCls, botaoPrimario } from './comum';

type Lead = {
  id: string; nome: string | null; email: string | null; whatsapp: string | null; criado_em: string; marketing: boolean;
  origem: string; campanha: string | null; cursos: string | null; pedidos: number; total: number; ultimo_acesso: string | null;
};

const PERIODOS = [
  { id: '', texto: 'Qualquer data', dias: 0 },
  { id: '7', texto: 'Últimos 7 dias', dias: 7 },
  { id: '30', texto: 'Últimos 30 dias', dias: 30 },
  { id: '90', texto: 'Últimos 90 dias', dias: 90 },
];
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// WhatsApp salvo como 55 + DDD + número → (69) 99999-9999
const whatsTexto = (w: string | null) => {
  const d = (w ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : w ?? '';
};

/* Busca todas as linhas (o Supabase devolve no máximo 1000 por vez) */
async function buscarLeads(): Promise<Lead[]> {
  const todos: Lead[] = [];
  for (let de = 0; ; de += 1000) {
    const { data: lote, error } = await supabase.rpc('academy_leads').range(de, de + 999);
    if (error) throw error;
    todos.push(...((lote ?? []) as Lead[]));
    if (!lote || lote.length < 1000) return todos;
  }
}

/* Planilha CSV que abre certo no Excel em português (separador ";" e acentos) */
function exportar(linhas: Lead[]) {
  const cab = ['Nome', 'E-mail', 'WhatsApp', 'Cadastro', 'Origem', 'Campanha', 'Aceita marketing', 'Cursos', 'Compras pagas', 'Total gasto (R$)', 'Última aula concluída'];
  const campo = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const corpo = linhas.map(l => [
    l.nome, l.email, whatsTexto(l.whatsapp), data(l.criado_em), l.origem, l.campanha, l.marketing ? 'Sim' : 'Não',
    l.cursos, l.pedidos, Number(l.total).toFixed(2).replace('.', ','), data(l.ultimo_acesso),
  ].map(campo).join(';'));
  const blob = new Blob(['﻿' + [cab.map(campo).join(';'), ...corpo].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leads-nexla-academy-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Tela({ nome }: { nome: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [origem, setOrigem] = useState('');
  const [marketing, setMarketing] = useState('');
  const [periodo, setPeriodo] = useState('');

  useEffect(() => {
    buscarLeads().then(setLeads).catch(() => { setLeads([]); setErro('Não foi possível carregar os leads. Confira se o 023_metricas_leads.sql foi rodado no Supabase.'); });
  }, []);

  const origens = useMemo(() => [...new Set((leads ?? []).map(l => l.origem))].sort(), [leads]);
  const lista = useMemo(() => {
    const termo = normal(busca.trim());
    const dias = PERIODOS.find(p => p.id === periodo)?.dias ?? 0;
    const desde = dias ? Date.now() - dias * 86400000 : 0;
    return (leads ?? []).filter(l =>
      (!termo || normal(`${l.nome ?? ''} ${l.email ?? ''} ${l.whatsapp ?? ''}`).includes(termo)) &&
      (!situacao || (situacao === 'comprou' ? l.pedidos > 0 : l.pedidos === 0)) &&
      (!origem || l.origem === origem) &&
      (!marketing || (marketing === 'sim' ? l.marketing : !l.marketing)) &&
      (!desde || new Date(l.criado_em).getTime() >= desde));
  }, [leads, busca, situacao, origem, marketing, periodo]);

  const compraram = lista.filter(l => l.pedidos > 0).length;
  const aceitam = lista.filter(l => l.marketing).length;

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloAdmin titulo="Leads" sub="Todas as pessoas que criaram conta, compraram ou não, com a origem de cada uma."
          acao={<button onClick={() => exportar(lista)} disabled={!lista.length} className={`${botaoPrimario} inline-flex items-center gap-2`}>
            <Download size={16} strokeWidth={2} /> Exportar planilha ({lista.length})
          </button>} />

        {/* Filtros */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-3 mb-4">
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.mute }} />
            <input className={`${inputCls} pl-10`} placeholder="Nome, e-mail ou WhatsApp" value={busca} onChange={e => setBusca(e.target.value)} />
          </label>
          <select className={inputCls} value={situacao} onChange={e => setSituacao(e.target.value)} aria-label="Situação">
            <option value="">Comprou ou não</option>
            <option value="comprou">Compraram</option>
            <option value="nao">Não compraram</option>
          </select>
          <select className={inputCls} value={origem} onChange={e => setOrigem(e.target.value)} aria-label="Origem">
            <option value="">Todas as origens</option>
            {origens.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className={inputCls} value={marketing} onChange={e => setMarketing(e.target.value)} aria-label="Marketing">
            <option value="">Marketing: todos</option>
            <option value="sim">Aceitam marketing</option>
            <option value="nao">Não aceitam</option>
          </select>
          <select className={inputCls} value={periodo} onChange={e => setPeriodo(e.target.value)} aria-label="Período do cadastro">
            {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
          </select>
        </div>

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {!leads ? <Carregando /> : erro ? null : (
          <>
            <p className="text-[13.5px] mb-3" style={{ color: T.mute }}>
              <strong style={{ color: T.ink }}>{lista.length}</strong> lead{lista.length === 1 ? '' : 's'} · {compraram} compraram ({lista.length ? Math.round((compraram / lista.length) * 100) : 0}%) · {aceitam} aceitam receber marketing
            </p>
            {lista.length === 0 ? (
              <p className="rounded-2xl p-8 text-center text-[14px]" style={{ background: T.card, border: `1px dashed ${T.rule}`, color: T.mute }}>Nenhum lead com esses filtros.</p>
            ) : (
              <div className="rounded-2xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <table className="w-full min-w-[900px] text-[14px]">
                  <thead>
                    <tr className="text-left text-[12px] uppercase tracking-wide" style={{ color: T.mute, borderBottom: `1px solid ${T.rule}` }}>
                      <th className="px-5 py-3 font-semibold">Pessoa</th>
                      <th className="px-3 py-3 font-semibold">WhatsApp</th>
                      <th className="px-3 py-3 font-semibold">Cadastro</th>
                      <th className="px-3 py-3 font-semibold">Origem</th>
                      <th className="px-3 py-3 font-semibold">Cursos</th>
                      <th className="px-3 py-3 font-semibold text-right">Gasto</th>
                      <th className="px-5 py-3 font-semibold">Marketing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((l, i) => (
                      <tr key={l.id} style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                        <td className="px-5 py-3">
                          <span className="block font-semibold">{l.nome || 'Sem nome'}</span>
                          <span className="block text-[12.5px]" style={{ color: T.mute }}>{l.email ?? '—'}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {l.whatsapp ? (
                            <a href={`https://wa.me/${l.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 hover:underline underline-offset-4" style={{ color: T.ink2 }}>
                              <MessageCircle size={14} strokeWidth={1.75} style={{ color: 'var(--a-green)' }} /> {whatsTexto(l.whatsapp)}
                            </a>
                          ) : <span style={{ color: T.mute }}>—</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ color: T.ink2 }}>{data(l.criado_em)}</td>
                        <td className="px-3 py-3">
                          <span className="block">{l.origem}</span>
                          {l.campanha && <span className="block text-[12px] truncate max-w-[10rem]" style={{ color: T.mute }} title={l.campanha}>{l.campanha}</span>}
                        </td>
                        <td className="px-3 py-3 max-w-[16rem]">
                          {l.cursos ? <span className="line-clamp-2" style={{ color: T.ink2 }}>{l.cursos}</span>
                            : <span className="text-[12.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--a-soft)', color: T.mute }}>Não comprou</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap" style={display}>{l.total > 0 ? reais(Number(l.total)) : '—'}</td>
                        <td className="px-5 py-3">
                          <span className="text-[12.5px] font-semibold px-2 py-0.5 rounded-full"
                            style={l.marketing ? { background: 'rgba(34,197,94,0.12)', color: 'var(--a-green)' } : { background: 'var(--a-soft)', color: T.mute }}>
                            {l.marketing ? 'Aceita' : 'Não aceita'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[12px] mt-3" style={{ color: T.mute }}>
              Só use WhatsApp e e-mail para ofertas com quem aceita marketing (LGPD). A planilha exporta a lista filtrada que está na tela.
            </p>
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}

export default function Leads({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Tela nome={nome} />}</SoAdmin>;
}
