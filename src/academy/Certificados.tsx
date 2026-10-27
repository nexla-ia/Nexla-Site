import { motion } from 'framer-motion';
import type { Session } from '@supabase/supabase-js';
import { T, ease } from './ui';
import { AppLayout, Carregando, TituloPagina } from './AppLayout';
import { useCursosAluno, certificadoLiberado } from './dados';
import { dataPorExtenso } from './certificadoCanvas';
import { Card, GRADE_CURSOS } from './Explorar';

/* Meus certificados: os mesmos cards dos cursos. Os prontos vêm primeiro e abrem o certificado;
   os outros mostram quanto falta e levam de volta ao curso. */
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
          <div className={GRADE_CURSOS}>
            {ordenados.map(c => certificadoLiberado(c) ? (
              <Card key={c.id} para={`/certificado/${c.slug}`} capa={c.capa} titulo={c.titulo}
                linha={`Certificado · ${dataPorExtenso(new Date(c.ultima))}`} />
            ) : (
              <Card key={c.id} para={`/curso/${c.slug}${c.proxima ? `?aula=${c.proxima.id}` : ''}`} capa={c.capa}
                progresso={c.percentual} titulo={c.titulo}
                linha={`Falta${c.faltamCertificado > 1 ? 'm' : ''} ${c.faltamCertificado} aula${c.faltamCertificado > 1 ? 's' : ''} para o certificado`} />
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
