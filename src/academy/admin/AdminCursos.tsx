import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Plus, Star } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from '../ui';
import { Carregando } from '../AppLayout';
import { Link } from '../router';
import { supabase } from '../supabase';
import { SoAdmin, AdminLayout, TituloAdmin, botaoPrimario, CAPA_PADRAO } from './comum';

type Bloco = {
  id: string; slug: string; titulo: string; publicado: boolean; ordem: number; capa: string | null;
  destaque: boolean; modulos: number; aulas: number; alunos: number;
};

function Lista({ nome }: { nome: string }) {
  const [cursos, setCursos] = useState<Bloco[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('academy_courses')
        .select('id, slug, titulo, publicado, ordem, capa, destaque, academy_modules(id, academy_lessons(id)), academy_enrollments(user_id, ativo)')
        .order('ordem'),
      supabase.from('academy_profiles').select('id').eq('role', 'admin'),
    ]).then(([{ data, error }, adms]) => {
        const admins = new Set((adms.data ?? []).map(a => a.id as string)); // admin não conta como aluno
        if (error) { setErro('Não foi possível carregar os cursos. Confira se o 007 e o 010 (supabase/) foram rodados.'); setCursos([]); return; }
        setCursos((data ?? []).map(c => {
          const mods = (c.academy_modules ?? []) as { id: string; academy_lessons: { id: string }[] }[];
          return {
            id: c.id as string, slug: c.slug as string, titulo: c.titulo as string, publicado: !!c.publicado,
            ordem: c.ordem as number, capa: c.capa as string | null, destaque: !!c.destaque,
            modulos: mods.length, aulas: mods.reduce((s, m) => s + (m.academy_lessons?.length ?? 0), 0),
            alunos: ((c.academy_enrollments ?? []) as { user_id: string; ativo: boolean }[]).filter(m => m.ativo && !admins.has(m.user_id)).length,
          };
        }));
      });
  }, []);

  return (
    <AdminLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloAdmin titulo="Cursos da plataforma" sub="Clique num curso para gerenciar as aulas e as configurações."
          acao={<Link para="/admin/curso/novo" className={botaoPrimario}><Plus size={17} strokeWidth={2} /> Novo curso</Link>} />

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}
        {!cursos ? <Carregando /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cursos.map(c => (
              <Link key={c.id} para={`/admin/curso/${c.id}`}
                className="group rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-lg"
                style={{ background: T.card, border: `1px solid ${T.rule}` }}>
                <div className="relative aspect-[16/9] overflow-hidden" style={{ background: CAPA_PADRAO }}>
                  {c.capa
                    ? <img src={c.capa} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                    : <span className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(224,231,255,0.5)' }}><ImageIcon size={28} strokeWidth={1.5} /></span>}
                  <span className="absolute top-3 left-3 text-[11.5px] font-bold px-2.5 py-1 rounded-full"
                    style={c.publicado ? { background: 'var(--a-green-bg)', color: 'var(--a-green)' } : { background: 'var(--a-vidro)', color: T.mute }}>
                    {c.publicado ? 'Publicado' : 'Rascunho'}
                  </span>
                  {c.destaque && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FEF3C7', color: 'var(--a-amber)' }}>
                      <Star size={11} strokeWidth={0} fill="#F59E0B" /> Destaque
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h2 className="font-bold text-[17px] leading-snug" style={{ ...display, color: T.ink }}>{c.titulo}</h2>
                  <div className="grid grid-cols-3 gap-2 mt-auto pt-4 text-center">
                    {[{ v: c.modulos, l: 'módulos' }, { v: c.aulas, l: 'aulas' }, { v: c.alunos, l: 'alunos' }].map(n => (
                      <div key={n.l} className="rounded-lg py-2" style={{ background: 'var(--a-soft2)' }}>
                        <div className="font-bold text-[16px]" style={display}>{n.v}</div>
                        <div className="text-[11.5px]" style={{ color: T.mute }}>{n.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}

            <Link para="/admin/curso/novo" className="rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[18rem] transition-colors hover:bg-white"
              style={{ border: '2px dashed rgba(79,70,229,0.3)', color: T.accent }}>
              <Plus size={26} strokeWidth={1.75} />
              <span className="font-semibold text-[15px]">Novo curso</span>
            </Link>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}

export default function AdminCursos({ sessao }: { sessao: Session }) {
  return <SoAdmin sessao={sessao}>{nome => <Lista nome={nome} />}</SoAdmin>;
}
