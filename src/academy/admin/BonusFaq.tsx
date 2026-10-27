import { useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowUpDown, Download, GripVertical, Plus, Trash2, Upload } from 'lucide-react';
import { T, display } from '../ui';
import { supabase } from '../supabase';
import { inputCls, useParteSalvavel } from './comum';

/* Ferramentas usadas no curso e apresentação do instrutor (aparecem na página de vendas) */
export function CartaoInstrutor({ cursoId }: { cursoId: string }) {
  const [ferramentas, setFerramentas] = useState('');
  const [bio, setBio] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [semColuna, setSemColuna] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(''); // o que está gravado (para saber se mudou)

  useEffect(() => {
    supabase.from('academy_courses').select('ferramentas, instrutor_bio').eq('id', cursoId).maybeSingle().then(({ data, error }) => {
      if (error) { setSemColuna(true); setCarregado(true); return; }
      const fs = ((data?.ferramentas ?? []) as string[]).join('\n');
      const b = (data?.instrutor_bio as string | null) ?? '';
      setFerramentas(fs); setBio(b); setSalvo(JSON.stringify([fs, b]));
      setCarregado(true);
    });
  }, [cursoId]);

  // Gravado pelo botão Salvar da página (devolve o erro ou null)
  const atual = JSON.stringify([ferramentas, bio]);
  const salvar = async (): Promise<string | null> => {
    const { error } = await supabase.from('academy_courses').update({
      ferramentas: [...new Set(ferramentas.split('\n').map(f => f.trim()).filter(Boolean))],
      instrutor_bio: bio.trim() || null,
    }).eq('id', cursoId);
    const problema = error ? 'Não foi possível salvar as ferramentas e o instrutor.' : '';
    setErro(problema);
    if (problema) return problema;
    setSalvo(atual);
    return null;
  };
  useParteSalvavel('instrutor', 'ferramentas e instrutor', carregado && !semColuna && atual !== salvo, salvar);

  return (
    <section className="rounded-2xl p-6 md:p-7 grid md:grid-cols-[14rem_1fr] gap-5 md:gap-8" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div>
        <h3 className="font-bold text-[16.5px]" style={display}>Ferramentas e instrutor</h3>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.mute }}>Aparecem na página de vendas. O nome do instrutor fica em Informações.</p>
      </div>
      {!carregado ? <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p> : semColuna ? (
        <p className="text-[14px]" style={{ color: 'var(--a-red)' }}>Rode o <strong>021_pagina_curso.sql</strong> no Supabase para usar esta parte.</p>
      ) : (
        <div className="space-y-5">
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1.5" style={{ color: T.ink2 }}>Ferramentas que o aluno vai usar (uma por linha)</span>
            <textarea className="acad-field w-full rounded-[10px] px-3.5 py-2.5 text-[14.5px] leading-relaxed" rows={4}
              placeholder={'WhatsApp Business\nn8n\nChatGPT'} value={ferramentas} onChange={e => setFerramentas(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1.5" style={{ color: T.ink2 }}>Sobre o instrutor</span>
            <textarea className="acad-field w-full rounded-[10px] px-3.5 py-2.5 text-[14.5px] leading-relaxed" rows={4}
              placeholder="Quem é, experiência e por que entende do assunto (2 a 4 linhas)." value={bio} onChange={e => setBio(e.target.value)} />
          </label>
          {erro && <p className="text-[13.5px]" style={{ color: 'var(--a-red)' }}>{erro}</p>}
        </div>
      )}
    </section>
  );
}


/* Moldura dos cartões desta tela: título e explicação à esquerda, conteúdo à direita */
function Moldura({ titulo, sub, acoes, children }: { titulo: string; sub: string; acoes?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6 md:p-7 grid md:grid-cols-[14rem_1fr] gap-5 md:gap-8" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div>
        <h3 className="font-bold text-[16.5px]" style={display}>{titulo}</h3>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.mute }}>{sub}</p>
        {acoes && <div className="mt-4 flex flex-col items-start gap-2">{acoes}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const botaoTexto = 'inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline underline-offset-4';
const botaoIcone = 'w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[color:var(--a-soft)]';
// Célula da tabela: parece texto, vira campo ao passar o mouse ou clicar
const celula = 'w-full bg-transparent rounded-lg px-2.5 py-2 text-[14px] leading-snug outline-none transition-colors hover:bg-[color:var(--a-soft)] focus:bg-[color:var(--a-card)] focus:ring-2 focus:ring-indigo-500/30 placeholder:text-[color:var(--a-mute)] placeholder:opacity-60';

/* ─── Bônus ──────────────────────────────────────────────────────── */
type Bonus = { titulo: string; descricao: string };
const bonusLimpo = (bonus: Bonus[]) => bonus.filter(b => b.titulo.trim()).map(b => ({ titulo: b.titulo.trim(), descricao: b.descricao.trim() }));

/* Bônus: aparecem na página de vendas em "Bônus inclusos". A entrega é pelas aulas (ex.: módulo Bônus com o material anexado). */
export function CartaoBonus({ cursoId }: { cursoId: string }) {
  const [bonus, setBonus] = useState<Bonus[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [semColuna, setSemColuna] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState('');

  useEffect(() => {
    supabase.from('academy_courses').select('bonus').eq('id', cursoId).maybeSingle().then(({ data, error }) => {
      if (error) { setSemColuna(true); setCarregado(true); return; }
      const b = ((data?.bonus ?? []) as Bonus[]).map(x => ({ titulo: x.titulo ?? '', descricao: x.descricao ?? '' }));
      setBonus(b); setSalvo(JSON.stringify(bonusLimpo(b)));
      setCarregado(true);
    });
  }, [cursoId]);

  // Gravado pelo botão Salvar da página (devolve o erro ou null)
  const dados = bonusLimpo(bonus);
  const salvar = async (): Promise<string | null> => {
    const { error } = await supabase.from('academy_courses').update({ bonus: dados }).eq('id', cursoId);
    setErro(error ? 'Não foi possível salvar os bônus.' : '');
    if (error) return 'Não foi possível salvar os bônus.';
    setSalvo(JSON.stringify(dados));
    return null;
  };
  useParteSalvavel('bonus', 'bônus', carregado && !semColuna && JSON.stringify(dados) !== salvo, salvar);
  const muda = (i: number, campo: keyof Bonus, v: string) => setBonus(bonus.map((b, k) => (k === i ? { ...b, [campo]: v } : b)));

  return (
    <Moldura titulo="Bônus" sub='Aparecem na página de vendas em "Bônus inclusos". Para o aluno receber, anexe o material numa aula (por exemplo, num módulo chamado Bônus).'>
      {!carregado ? <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p> : semColuna ? (
        <p className="text-[14px]" style={{ color: 'var(--a-red)' }}>Rode o <strong>019_bonus_faq.sql</strong> no Supabase para usar esta parte.</p>
      ) : (
        <div className="space-y-2">
          {bonus.length === 0 && <p className="text-[13.5px]" style={{ color: T.mute }}>Nenhum bônus. Ex.: pacote de modelos prontos, planilha, grupo de alunos.</p>}
          {bonus.map((b, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
              <input className={inputCls} placeholder="Nome. Ex.: Pacote de modelos prontos" value={b.titulo} autoFocus={!b.titulo && i === bonus.length - 1}
                onChange={e => muda(i, 'titulo', e.target.value)} />
              <input className={inputCls} placeholder="Descrição curta (opcional)" value={b.descricao} onChange={e => muda(i, 'descricao', e.target.value)} />
              <button onClick={() => setBonus(bonus.filter((_, k) => k !== i))} aria-label="Remover bônus" title="Remover bônus"
                className="w-11 h-11 rounded-[10px] flex items-center justify-center hover:bg-red-50" style={{ color: 'var(--a-red)' }}><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setBonus([...bonus, { titulo: '', descricao: '' }])} className={`${botaoTexto} pt-1`} style={{ color: T.accent }}>
            <Plus size={14} /> Adicionar bônus
          </button>
          {erro && <p className="text-[13px]" style={{ color: 'var(--a-red)' }}>{erro}</p>}
        </div>
      )}
    </Moldura>
  );
}

/* ─── Perguntas frequentes ───────────────────────────────────────── */
type Pergunta = { pergunta: string; resposta: string };
type PerguntaId = Pergunta & { id: number };

let proximoId = 1;
const comId = (p: Pergunta): PerguntaId => ({ ...p, id: proximoId++ });
const faqLimpo = (faq: Pergunta[]) =>
  faq.filter(f => f.pergunta.trim() && f.resposta.trim()).map(f => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() }));

/* ─── Planilha de perguntas ──────────────────────────────────────── */
// Lê .xlsx (Excel) ou .csv e devolve as linhas como texto
async function lerPlanilha(arquivo: File): Promise<string[][]> {
  if (/\.(csv|txt)$/i.test(arquivo.name)) {
    const texto = (await arquivo.text()).replace(/^\u{FEFF}/u, '');
    const primeira = texto.split(/\r?\n/)[0] ?? '';
    const sep = [';', '\t', ','].sort((a, b) => primeira.split(b).length - primeira.split(a).length)[0];
    return lerCsv(texto, sep);
  }
  const { readSheet } = await import('read-excel-file/browser');
  const linhas = await readSheet(arquivo);
  return linhas.map(l => l.map(c => (c === null || c === undefined ? '' : String(c))));
}

// CSV simples: aceita "texto entre aspas; com separador" e quebra de linha dentro das aspas
function lerCsv(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

// Acha as colunas "Pergunta" e "Resposta" pelo cabeçalho; sem cabeçalho, usa a 1ª e a 2ª coluna
function paraPerguntas(linhas: string[][]): Pergunta[] {
  const cheias = linhas.filter(l => l.some(c => c.trim()));
  if (!cheias.length) return [];
  const cab = cheias[0].map(c => c.trim().toLowerCase());
  let p = cab.findIndex(c => c.startsWith('pergunt'));
  let r = cab.findIndex(c => c.startsWith('respost'));
  const temCabecalho = p >= 0 || r >= 0;
  if (p < 0) p = r === 0 ? 1 : 0;
  if (r < 0) r = p === 0 ? 1 : 0;
  return (temCabecalho ? cheias.slice(1) : cheias)
    .map(l => ({ pergunta: (l[p] ?? '').trim(), resposta: (l[r] ?? '').trim() }))
    .filter(f => f.pergunta || f.resposta);
}

// Modelo para preencher no Excel (CSV com ; e acentos certos)
function baixarModelo() {
  const csv = '\u{FEFF}Pergunta;Resposta\nPreciso saber programar?;Não. O curso começa do zero e mostra tudo passo a passo.\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'modelo-perguntas.csv' });
  a.click();
  URL.revokeObjectURL(url);
}


// Grade das linhas: alça | pergunta | resposta | ações (no celular a resposta desce para baixo da pergunta)
const GRADE = 'grid grid-cols-[1.75rem_1fr_auto] sm:grid-cols-[1.75rem_1fr_1.3fr_auto] gap-x-2 items-start';
// A resposta cresce com o texto (navegadores que não sabem fazer isso ficam com 2 linhas)
const cresce = { fieldSizing: 'content', minHeight: '2.5rem' } as React.CSSProperties;

/* Uma linha da tabela. A alça muda a ordem; a linha vazia do fim (nova) não tem alça nem ações:
   é só começar a digitar nela que ela vira uma pergunta e aparece outra vazia embaixo. */
function Linha({ f, nova, muda, remover, inverter }: {
  f: PerguntaId; nova: boolean; muda: (campo: keyof Pergunta, v: string) => void; remover: () => void; inverter: () => void;
}) {
  const alca = useDragControls();
  return (
    <Reorder.Item value={f} dragListener={false} dragControls={alca} className={`${GRADE} py-1.5 px-1.5`} style={{ background: T.card }}>
      <div className="row-span-2 sm:row-span-1 h-10 flex items-center justify-center">
        {!nova && (
          <button onPointerDown={e => alca.start(e)} aria-label="Arrastar para mudar a ordem" title="Arraste para mudar a ordem"
            className="w-7 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none opacity-40 hover:opacity-100 transition-opacity" style={{ color: T.mute }}>
            <GripVertical size={16} />
          </button>
        )}
      </div>
      <input className={`${celula} font-medium`} style={{ color: T.ink }} value={f.pergunta} aria-label="Pergunta"
        placeholder={nova ? 'Escreva uma nova pergunta…' : 'Pergunta'} onChange={e => muda('pergunta', e.target.value)} />
      <textarea rows={2} className={`${celula} resize-none col-start-2 row-start-2 sm:col-start-3 sm:row-start-1`} style={{ ...cresce, color: T.ink }}
        value={f.resposta} aria-label="Resposta" placeholder={nova ? 'e a resposta' : 'Resposta'} onChange={e => muda('resposta', e.target.value)} />
      <div className="col-start-3 row-start-1 sm:col-start-4 flex h-10 items-center">
        {!nova && <>
          <button onClick={inverter} aria-label="Trocar pergunta e resposta" title="Trocar pergunta e resposta" className={botaoIcone} style={{ color: T.mute }}><ArrowUpDown size={15} /></button>
          <button onClick={remover} aria-label="Remover pergunta" title="Remover pergunta" className={`${botaoIcone} hover:!bg-red-50`} style={{ color: 'var(--a-red)' }}><Trash2 size={15} /></button>
        </>}
        {nova && <span className="w-16" />}
      </div>
    </Reorder.Item>
  );
}

/* Perguntas frequentes do curso (aparecem na página de vendas, antes das perguntas gerais) */
export function CartaoPerguntas({ cursoId }: { cursoId: string }) {
  const [faq, setFaq] = useState<PerguntaId[]>([]);
  const [nova, setNova] = useState<PerguntaId>(() => comId({ pergunta: '', resposta: '' }));
  const [carregado, setCarregado] = useState(false);
  const [semColuna, setSemColuna] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' });
  const [salvo, setSalvo] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('academy_courses').select('faq').eq('id', cursoId).maybeSingle().then(({ data, error }) => {
      if (error) { setSemColuna(true); setCarregado(true); return; }
      const f = ((data?.faq ?? []) as Pergunta[]).map(x => comId({ pergunta: x.pergunta ?? '', resposta: x.resposta ?? '' }));
      setFaq(f); setSalvo(JSON.stringify(faqLimpo(f)));
      setCarregado(true);
    });
  }, [cursoId]);

  // Gravado pelo botão Salvar da página (devolve o erro ou null). Só entra pergunta com resposta.
  const dados = faqLimpo(faq);
  const salvar = async (): Promise<string | null> => {
    const { error } = await supabase.from('academy_courses').update({ faq: dados }).eq('id', cursoId);
    if (error) { setMsg({ erro: 'Não foi possível salvar as perguntas.', ok: '' }); return 'Não foi possível salvar as perguntas.'; }
    setSalvo(JSON.stringify(dados));
    setMsg({ erro: '', ok: '' });
    return null;
  };
  useParteSalvavel('faq', 'perguntas', carregado && !semColuna && JSON.stringify(dados) !== salvo, salvar);

  const muda = (id: number, campo: keyof Pergunta, v: string) => {
    // Digitou na linha vazia do fim: ela vira pergunta (mesmo id, o cursor continua no campo) e surge outra vazia
    if (id === nova.id) { setFaq([...faq, { ...nova, [campo]: v }]); setNova(comId({ pergunta: '', resposta: '' })); return; }
    setFaq(faq.map(f => (f.id === id ? { ...f, [campo]: v } : f)));
  };

  // Planilha: as perguntas entram no fim da lista; só grava ao clicar em Salvar
  const importar = async (arq: File | undefined) => {
    if (!arq) return;
    setMsg({ erro: '', ok: '' });
    try {
      const novas = paraPerguntas(await lerPlanilha(arq));
      if (!novas.length) { setMsg({ erro: 'Não achamos perguntas nessa planilha. Use as colunas Pergunta e Resposta (baixe o modelo).', ok: '' }); return; }
      setFaq([...faq.filter(f => f.pergunta.trim() || f.resposta.trim()), ...novas.map(comId)]);
      setMsg({ erro: '', ok: `${novas.length} pergunta${novas.length > 1 ? 's' : ''} da planilha. Confira e clique em Salvar, embaixo da página.` });
    } catch {
      setMsg({ erro: 'Não foi possível ler a planilha. Envie um arquivo .xlsx ou .csv.', ok: '' });
    } finally {
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  const incompletas = faq.filter(f => (f.pergunta.trim() || f.resposta.trim()) && !(f.pergunta.trim() && f.resposta.trim())).length;

  return (
    <Moldura titulo="Perguntas frequentes" sub="Aparecem na página de vendas, antes das perguntas gerais (acesso, garantia, pagamento), que já aparecem sozinhas."
      acoes={carregado && !semColuna && <>
        <button onClick={() => arquivo.current?.click()} className={botaoTexto} style={{ color: T.accent }}><Upload size={14} /> Importar planilha</button>
        <button onClick={baixarModelo} className={botaoTexto} style={{ color: T.mute }}><Download size={14} /> Baixar modelo da planilha</button>
        <input ref={arquivo} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => importar(e.target.files?.[0])} />
      </>}>
      {!carregado ? <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p> : semColuna ? (
        <p className="text-[14px]" style={{ color: 'var(--a-red)' }}>Rode o <strong>019_bonus_faq.sql</strong> no Supabase para usar esta parte.</p>
      ) : (
        <div>
          <div className="rounded-xl border border-[color:var(--a-rule)] overflow-hidden">
            <div className={`${GRADE} hidden sm:grid px-1.5 py-2 text-[12px] font-semibold uppercase tracking-wide border-b border-[color:var(--a-rule)]`}
              style={{ color: T.mute, background: 'var(--a-soft2)' }}>
              <span />
              <span className="px-2.5">Pergunta</span>
              <span className="px-2.5">Resposta</span>
              <span className="w-16" />
            </div>
            <Reorder.Group axis="y" values={[...faq, nova]} onReorder={l => setFaq(l.filter(x => x.id !== nova.id))}
              className="divide-y divide-[color:var(--a-rule)]">
              {[...faq, nova].map(f => (
                <Linha key={f.id} f={f} nova={f.id === nova.id} muda={(c, v) => muda(f.id, c, v)}
                  remover={() => setFaq(faq.filter(x => x.id !== f.id))}
                  inverter={() => setFaq(faq.map(x => (x.id === f.id ? { ...x, pergunta: x.resposta, resposta: x.pergunta } : x)))} />
              ))}
            </Reorder.Group>
          </div>
          <p className="text-[12px] mt-2" style={{ color: msg.erro ? 'var(--a-red)' : msg.ok || incompletas ? 'var(--a-amber)' : T.mute }}>
            {msg.erro || msg.ok || (incompletas
              ? `${incompletas} pergunta${incompletas > 1 ? 's' : ''} sem pergunta ou sem resposta não ${incompletas > 1 ? 'aparecem' : 'aparece'} na página até ser completada.`
              : 'Clique no texto para editar. Arraste pela alça ⋮⋮ para mudar a ordem; ⇅ troca pergunta e resposta.')}
          </p>
        </div>
      )}
    </Moldura>
  );
}
