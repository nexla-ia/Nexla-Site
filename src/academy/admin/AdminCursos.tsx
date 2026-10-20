import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Pencil, Plus } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { AppLayout, Carregando } from '../AppLayout';
import { Link } from '../router';
import { supabase } from '../supabase';
import { SoAdmin, botaoPrimario } from './comum';

type Linha = { id: string; slug: string; titulo: string; publicado: boolean; ordem: number; modulos: number; aulas: number };

function Lista({ nome }: { nome: string }) {
  const [cursos, setCursos] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase.from('academy_courses').select('id, slug, titulo, publicado, ordem, academy_modules(id, academy_lessons(id))').order('ordem')
      .then(({ data, error }) => {
        if (error) { setErro('Não foi possível carregar os cursos. Confira se o 007_admin.sql foi rodado.'); setCursos([]); return; }
        setCursos((data ?? []).map(c => {
          const mods = (c.academy_modules ?? []) as { id: string; academy_lessons: { id: string }[] }[];
          return {
            id: c.id as string, slug: c.slug as string, titulo: c.titulo as string, publicado: !!c.publicado, ordem: c.ordem as number,
            modulos: mods.length, aulas: mods.reduce((s, m) => s + (m.academy_lessons?.length ?? 0), 0),
          };
        }));
      });
  }, []);

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: T.accent }}>Painel admin</p>
            <h1 className="font-bold leading-tight mt-1" style={{ ...display, fontSize: 'clamp(26px,3.2vw,36px)' }}>Cursos</h1>
            <p className="text-[15px] mt-1.5" style={{ color: T.mute }}>Crie e edite cursos, módulos, aulas e materiais. Rascunhos não aparecem para os alunos.</p>
          </div>
          <Link para="/admin/curso/novo" className={botaoPrimario}><Plus size={17} strokeWidth={2} /> Novo curso</Link>
        </div>

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: '#B91C1C' }}>{erro}</p>}
        {!cursos ? <Carregando /> : (
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
            {cursos.length === 0 && <p className="p-8 text-center text-[14.5px]" style={{ color: T.mute }}>Nenhum curso ainda. Clique em "Novo curso".</p>}
            {cursos.map((c, i) => (
              <div key={c.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-5 py-4" style={i ? { borderTop: `1px solid ${T.rule}` } : undefined}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[15.5px]" style={{ color: T.ink }}>{c.titulo}</span>
                    <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full"
                      style={c.publicado ? { background: 'rgba(34,197,94,0.1)', color: '#15803D' } : { background: 'rgba(15,23,42,0.06)', color: T.mute }}>
                      {c.publicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-[13px] mt-0.5" style={{ color: T.mute }}>/{c.slug} · {c.modulos} módulos · {c.aulas} aulas · ordem {c.ordem}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link para={`/curso/${c.slug}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13.5px] font-medium hover:bg-slate-50"
                    style={{ color: T.mute, border: `1px solid ${T.rule}` }}><Eye size={15} strokeWidth={1.75} /> Ver como aluno</Link>
                  <Link para={`/admin/curso/${c.id}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13.5px] font-semibold hover:bg-slate-50"
                    style={{ color: T.accent, border: '1px solid rgba(79,70,229,0.3)' }}><Pencil size={14} strokeWidth={2} /> Editar</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

export default function AdminCursos({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Lista nome={nome} />}</SoAdmin>;
}
