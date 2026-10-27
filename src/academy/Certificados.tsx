import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, ease } from './ui';
import { AppLayout, Carregando, TituloPagina } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, certificadoLiberado } from './dados';
import { dataPorExtenso } from './certificadoCanvas';

/* Lista simples: um título pequeno e as linhas separadas por um traço fino */
function Lista({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 max-w-3xl">
      <h2 className="text-[13px] font-medium mb-2" style={{ color: T.mute }}>{titulo}</h2>
      <ul style={{ borderTop: `1px solid ${T.rule}` }}>{children}</ul>
    </section>
  );
}

/* Uma linha: nome do curso, uma informação discreta e a ação à direita (a linha inteira é o link) */
function Linha({ para, titulo, info, acao }: { para: string; titulo: string; info: string; acao: string }) {
  return (
    <li style={{ borderBottom: `1px solid ${T.rule}` }}>
      <Link para={para} className="group flex items-center gap-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold truncate" style={{ color: T.ink }}>{titulo}</p>
          <p className="text-[13px] mt-0.5" style={{ color: T.mute }}>{info}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13.5px] font-medium shrink-0" style={{ color: T.accent }}>
          {acao} <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

/* Meus certificados: os prontos para baixar e os cursos em andamento (quanto falta) */
export default function Certificados({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;

  const { nome, cursos, erro } = dados;
  const liberados = cursos.filter(certificadoLiberado);
  const pendentes = cursos.filter(c => !certificadoLiberado(c));

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Meus certificados"
          sub="O certificado de cada curso libera quando você conclui todas as aulas." />

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {cursos.length === 0 && (
          <p className="text-[14.5px]" style={{ color: T.mute }}>
            Você ainda não tem cursos. Seus certificados aparecem aqui quando você concluir um curso.
          </p>
        )}

        {liberados.length > 0 && (
          <Lista titulo="Prontos para baixar">
            {liberados.map(c => (
              <Linha key={c.id} para={`/certificado/${c.slug}`} titulo={c.titulo}
                info={`Concluído em ${dataPorExtenso(new Date(c.ultima))}`} acao="Ver certificado" />
            ))}
          </Lista>
        )}

        {pendentes.length > 0 && (
          <Lista titulo="Em andamento">
            {pendentes.map(c => (
              <Linha key={c.id} para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`} titulo={c.titulo}
                info={`${c.percentual}% · falta${c.faltamCertificado > 1 ? 'm' : ''} ${c.faltamCertificado} aula${c.faltamCertificado > 1 ? 's' : ''}`}
                acao="Continuar" />
            ))}
          </Lista>
        )}
      </motion.div>
    </AppLayout>
  );
}
