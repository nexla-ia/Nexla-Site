import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, ease } from './ui';
import { AppLayout, Carregando, TituloPagina } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, certificadoLiberado } from './dados';

/* Cartão pequeno, sem imagem: nome do curso, uma linha discreta e a ação embaixo.
   No curso em andamento, uma linha fina mostra quanto já foi feito. */
function Cartao({ para, titulo, info, acao, progresso }: { para: string; titulo: string; info: string; acao: string; progresso?: number }) {
  return (
    <Link para={para} className="group flex flex-col rounded-xl p-5 border border-[color:var(--a-rule)] transition-colors hover:border-[color:var(--a-accent)]"
      style={{ background: T.card }}>
      <h3 className="text-[15px] font-semibold leading-snug line-clamp-2" style={{ color: T.ink }}>{titulo}</h3>
      <p className="mt-1 text-[13px]" style={{ color: T.mute }}>{info}</p>
      {progresso !== undefined && (
        <div className="mt-4 h-[3px] rounded-full overflow-hidden" style={{ background: T.rule }}>
          <div className="h-full rounded-full" style={{ width: `${progresso}%`, background: T.accent }} />
        </div>
      )}
      <span className="mt-5 inline-flex items-center gap-1 text-[13.5px] font-medium" style={{ color: T.accent }}>
        {acao} <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

/* Meus certificados: os prontos primeiro (abrem o certificado), depois os cursos em andamento (quanto falta) */
export default function Certificados({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;

  const { nome, cursos, erro } = dados;
  const ordenados = [...cursos].sort((a, b) => Number(certificadoLiberado(b)) - Number(certificadoLiberado(a)));

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <TituloPagina titulo="Meus certificados" sub="Conclua todas as aulas de um curso para liberar o certificado." />

        {erro && <p className="mb-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {cursos.length === 0 ? (
          <p className="text-[14.5px]" style={{ color: T.mute }}>Seus certificados aparecem aqui quando você concluir um curso.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {ordenados.map(c => certificadoLiberado(c) ? (
              <Cartao key={c.id} para={`/certificado/${c.slug}`} titulo={c.titulo}
                info={`Concluído em ${data(c.ultima)}`} acao="Ver certificado" />
            ) : (
              <Cartao key={c.id} para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`} titulo={c.titulo}
                info={`Falta${c.faltamCertificado > 1 ? 'm' : ''} ${c.faltamCertificado} aula${c.faltamCertificado > 1 ? 's' : ''}`}
                progresso={c.percentual} acao="Continuar" />
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
