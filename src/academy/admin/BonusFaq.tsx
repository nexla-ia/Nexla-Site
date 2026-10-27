import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { ArrowUpDown, ChevronDown, Download, GripVertical, Plus, Trash2, Upload } from 'lucide-react';
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

type Bonus = { titulo: string; descricao: string };
type Pergunta = { pergunta: string; resposta: string };
type PerguntaId = Pergunta & { id: number };
type Campo = keyof Pergunta;
type Pegando = { id: number; campo: Campo } | null;

let proximoId = 1;
const comId = (p: Pergunta): PerguntaId => ({ ...p, id: proximoId++ });

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

const botaoIcone = 'w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[color:var(--a-soft)]';

/* Uma pergunta da lista. Fechada mostra só a pergunta e o começo da resposta; clicando, abre para editar.
   A alça à esquerda muda a ordem. Com ela aberta, o nome de cada campo (Pergunta/Resposta) pode ser
   arrastado até outro campo, desta ou de outra pergunta aberta, e os dois textos trocam de lugar. */
function ItemPergunta({ f, n, aberta, abrir, pegando, setPegando, soltar, muda, remover, inverter }: {
  f: PerguntaId; n: number; aberta: boolean; abrir: () => void;
  pegando: Pegando; setPegando: (p: Pegando) => void; soltar: (alvo: { id: number; campo: Campo }) => void;
  muda: (campo: Campo, v: string) => void; remover: () => void; inverter: () => void;
}) {
  const alca = useDragControls();
  const [sobre, setSobre] = useState<Campo | null>(null);
  const incompleta = !f.pergunta.trim() || !f.resposta.trim();

  const campo = (c: Campo) => {
    const eu = pegando?.id === f.id && pegando.campo === c;
    const alvo = !!pegando && !eu && sobre === c;
    return (
      <div onDragOver={e => { if (pegando && !eu) { e.preventDefault(); setSobre(c); } }}
        onDragLeave={() => setSobre(null)}
        onDrop={e => { e.preventDefault(); setSobre(null); soltar({ id: f.id, campo: c }); }}
        className="group/campo rounded-[10px] transition-shadow" style={alvo ? { boxShadow: `0 0 0 2px ${T.accent}` } : undefined}>
        <span draggable title="Arraste até outro campo para trocar os textos"
          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c); setPegando({ id: f.id, campo: c }); }}
          onDragEnd={() => setPegando(null)}
          className="inline-flex items-center gap-1 mb-1 text-[12px] font-medium cursor-grab active:cursor-grabbing select-none" style={{ color: eu ? T.accent : T.mute }}>
          <GripVertical size={12} className="opacity-40 group-hover/campo:opacity-100 transition-opacity" /> {c === 'pergunta' ? 'Pergunta' : 'Resposta'}
        </span>
        {c === 'pergunta'
          ? <input className={inputCls} placeholder="Ex.: Preciso saber programar?" value={f.pergunta} onChange={e => muda('pergunta', e.target.value)} autoFocus={!f.pergunta} />
          : <textarea className="acad-field w-full rounded-[10px] px-3.5 py-2.5 text-[14.5px] leading-relaxed" rows={3} placeholder="Resposta"
              value={f.resposta} onChange={e => muda('resposta', e.target.value)} />}
      </div>
    );
  };

  return (
    <Reorder.Item value={f} dragListener={false} dragControls={alca} className="group relative" style={{ background: T.card }}>
      <div className="flex items-center gap-1 pl-1.5 pr-2 py-1.5">
        <button onPointerDown={e => alca.start(e)} aria-label="Arrastar para mudar a ordem" title="Arraste para mudar a ordem"
          className="w-7 h-9 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: T.mute }}>
          <GripVertical size={16} />
        </button>
        <button onClick={abrir} aria-expanded={aberta} className="flex-1 min-w-0 flex items-center gap-3 text-left py-1.5">
          <span className="text-[12.5px] w-5 shrink-0 tabular-nums" style={{ color: T.mute }}>{n}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium truncate" style={{ color: f.pergunta.trim() ? T.ink : T.mute }}>
              {f.pergunta.trim() || 'Nova pergunta'}
            </span>
            {!aberta && (
              <span className="block text-[12.5px] truncate mt-0.5" style={{ color: incompleta ? 'var(--a-amber)' : T.mute }}>
                {incompleta ? 'Falta preencher a pergunta ou a resposta' : f.resposta}
              </span>
            )}
          </span>
          <ChevronDown size={16} className={`shrink-0 transition-transform ${aberta ? 'rotate-180' : ''}`} style={{ color: T.mute }} />
        </button>
        <button onClick={inverter} aria-label="Trocar pergunta e resposta" title="Trocar pergunta e resposta" className={botaoIcone} style={{ color: T.mute }}>
          <ArrowUpDown size={15} />
        </button>
        <button onClick={remover} aria-label="Remover pergunta" title="Remover pergunta" className={`${botaoIcone} hover:!bg-red-50`} style={{ color: 'var(--a-red)' }}>
          <Trash2 size={15} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pl-[3.75rem] pr-4 pb-4 pt-1 space-y-3">
              {campo('pergunta')}
              {campo('resposta')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// O que vai para o banco: sem linhas vazias (pergunta só entra com pergunta e resposta)
const limpo = (bonus: Bonus[], faq: Pergunta[]) => ({
  bonus: bonus.filter(b => b.titulo.trim()).map(b => ({ titulo: b.titulo.trim(), descricao: b.descricao.trim() })),
  faq: faq.filter(f => f.pergunta.trim() && f.resposta.trim()).map(f => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() })),
});

const botaoTexto = 'inline-flex items-center gap-1 text-[13px] font-medium hover:underline underline-offset-4';

/* Bônus e perguntas frequentes do curso (aparecem na página de vendas pública) */
export function CartaoBonusFaq({ cursoId }: { cursoId: string }) {
  const [bonus, setBonus] = useState<Bonus[]>([]);
  const [faq, setFaq] = useState<PerguntaId[]>([]);
  const [pegando, setPegando] = useState<Pegando>(null);
  const [aberta, setAberta] = useState<number | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const [salvo, setSalvo] = useState(''); // o que está gravado no banco (para saber se mudou)
  const [carregado, setCarregado] = useState(false);
  const [semColuna, setSemColuna] = useState(false);
  const [msg, setMsg] = useState({ erro: '', ok: '' }); // erro ao salvar/importar e o recado da importação

  useEffect(() => {
    supabase.from('academy_courses').select('bonus, faq').eq('id', cursoId).maybeSingle().then(({ data, error }) => {
      if (error) { setSemColuna(true); setCarregado(true); return; }
      const b = ((data?.bonus ?? []) as Bonus[]).map(x => ({ titulo: x.titulo ?? '', descricao: x.descricao ?? '' }));
      const f = ((data?.faq ?? []) as Pergunta[]).map(x => comId({ pergunta: x.pergunta ?? '', resposta: x.resposta ?? '' }));
      setSalvo(JSON.stringify(limpo(b, f)));
      setBonus(b); setFaq(f);
      setCarregado(true);
    });
  }, [cursoId]);

  // Gravado pelo botão Salvar da página (devolve o erro ou null). Pergunta sem resposta não é publicada.
  const dados = limpo(bonus, faq);
  const salvar = async (): Promise<string | null> => {
    const { error } = await supabase.from('academy_courses').update(dados).eq('id', cursoId);
    if (error) { setMsg({ erro: 'Não foi possível salvar os bônus e as perguntas.', ok: '' }); return 'Não foi possível salvar os bônus e as perguntas.'; }
    setSalvo(JSON.stringify(dados));
    setMsg({ erro: '', ok: '' });
    return null;
  };
  useParteSalvavel('bonus-faq', 'bônus e perguntas', carregado && !semColuna && JSON.stringify(dados) !== salvo, salvar);

  const muda = <X,>(lista: X[], set: (l: X[]) => void, i: number, campo: keyof X, v: string) =>
    set(lista.map((x, k) => (k === i ? { ...x, [campo]: v } : x)));

  // Soltou um campo em outro: os dois textos trocam de lugar
  const soltar = (alvo: { id: number; campo: Campo }) => {
    const de = pegando;
    setPegando(null);
    if (!de || (de.id === alvo.id && de.campo === alvo.campo)) return;
    const origem = faq.find(f => f.id === de.id)?.[de.campo] ?? '';
    const destino = faq.find(f => f.id === alvo.id)?.[alvo.campo] ?? '';
    setFaq(faq.map(f => {
      let n = f;
      if (f.id === de.id) n = { ...n, [de.campo]: destino };
      if (f.id === alvo.id) n = { ...n, [alvo.campo]: origem };
      return n;
    }));
  };

  // Planilha: as perguntas entram no fim da lista (as vazias saem); só grava ao clicar em Salvar
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

  return (
    <section className="rounded-2xl p-6 md:p-7 grid md:grid-cols-[14rem_1fr] gap-5 md:gap-8" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
      <div>
        <h3 className="font-bold text-[16.5px]" style={display}>Bônus e perguntas</h3>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.mute }}>Aparecem na página de vendas do curso. As perguntas gerais (acesso, garantia, pagamento) já aparecem sozinhas.</p>
      </div>
      {!carregado ? <p className="text-[14px]" style={{ color: T.mute }}>Carregando…</p> : semColuna ? (
        <p className="text-[14px]" style={{ color: 'var(--a-red)' }}>Rode o <strong>019_bonus_faq.sql</strong> no Supabase para usar esta parte.</p>
      ) : (
        <div className="space-y-8">
          {/* Bônus: título e descrição numa linha */}
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="text-[13px] font-semibold" style={{ color: T.ink2 }}>
                Bônus {bonus.length > 0 && <span className="font-normal" style={{ color: T.mute }}>· {bonus.length}</span>}
              </p>
              <button onClick={() => setBonus([...bonus, { titulo: '', descricao: '' }])} className={botaoTexto} style={{ color: T.accent }}>
                <Plus size={14} /> Adicionar bônus
              </button>
            </div>
            {bonus.length === 0 ? (
              <p className="text-[13px]" style={{ color: T.mute }}>Nenhum bônus. Ex.: pacote de modelos prontos, grupo de alunos, planilha.</p>
            ) : (
              <div className="space-y-2">
                {bonus.map((b, i) => (
                  <div key={i} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                    <input className={inputCls} placeholder="Ex.: Pacote de modelos prontos" value={b.titulo} autoFocus={!b.titulo && i === bonus.length - 1}
                      onChange={e => muda(bonus, setBonus, i, 'titulo', e.target.value)} />
                    <input className={inputCls} placeholder="Descrição curta (opcional)" value={b.descricao} onChange={e => muda(bonus, setBonus, i, 'descricao', e.target.value)} />
                    <button onClick={() => setBonus(bonus.filter((_, k) => k !== i))} aria-label="Remover bônus" title="Remover bônus"
                      className="w-11 h-11 rounded-[10px] flex items-center justify-center hover:bg-red-50" style={{ color: 'var(--a-red)' }}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Perguntas: lista que abre ao clicar */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2">
              <p className="text-[13px] font-semibold" style={{ color: T.ink2 }}>
                Perguntas frequentes {faq.length > 0 && <span className="font-normal" style={{ color: T.mute }}>· {faq.length}</span>}
              </p>
              <div className="flex items-center gap-4">
                <button onClick={baixarModelo} className={botaoTexto} style={{ color: T.mute }}><Download size={14} /> Modelo</button>
                <button onClick={() => arquivo.current?.click()} className={botaoTexto} style={{ color: T.mute }}><Upload size={14} /> Importar planilha</button>
                <button onClick={() => { const nova = comId({ pergunta: '', resposta: '' }); setFaq([...faq, nova]); setAberta(nova.id); }}
                  className={botaoTexto} style={{ color: T.accent }}><Plus size={14} /> Adicionar</button>
                <input ref={arquivo} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => importar(e.target.files?.[0])} />
              </div>
            </div>

            {faq.length === 0 ? (
              <p className="text-[13px]" style={{ color: T.mute }}>
                Nenhuma pergunta. Adicione uma por uma ou importe uma planilha com as colunas Pergunta e Resposta.
              </p>
            ) : (
              <>
                <Reorder.Group axis="y" values={faq} onReorder={setFaq}
                  className="rounded-xl overflow-hidden divide-y divide-[color:var(--a-rule)] border border-[color:var(--a-rule)]">
                  {faq.map((f, i) => (
                    <ItemPergunta key={f.id} f={f} n={i + 1} aberta={aberta === f.id} abrir={() => setAberta(aberta === f.id ? null : f.id)}
                      pegando={pegando} setPegando={setPegando} soltar={soltar}
                      muda={(c, v) => muda(faq, setFaq, i, c, v)} remover={() => setFaq(faq.filter(x => x.id !== f.id))}
                      inverter={() => setFaq(faq.map(x => (x.id === f.id ? { ...x, pergunta: x.resposta, resposta: x.pergunta } : x)))} />
                  ))}
                </Reorder.Group>
                {faq.length > 1 && (
                  <p className="text-[12px] mt-2" style={{ color: T.mute }}>
                    Arraste pela alça ⋮⋮ para mudar a ordem. Com a pergunta aberta, arraste o nome do campo até outro campo para trocar os textos.
                  </p>
                )}
              </>
            )}
          </div>

          {(msg.erro || msg.ok) && <p className="text-[13px]" style={{ color: msg.erro ? 'var(--a-red)' : 'var(--a-amber)' }}>{msg.erro || msg.ok}</p>}
        </div>
      )}
    </section>
  );
}
