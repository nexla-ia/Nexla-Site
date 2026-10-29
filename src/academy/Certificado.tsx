import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, Download, FileImage, Linkedin, Lock, Share2, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando } from './AppLayout';
import { Link } from './router';
import { supabase, organizar, pct, CERTIFICADO_MIN, SELECT_CURSO, type Curso as CursoT } from './supabase';
import { desenharCertificado, codigoValidacao, dataPorExtenso, CERT_W, CERT_H, type DadosCertificado } from './certificadoCanvas';

/* LinkedIn: "Adicionar ao perfil" abre o formulário de Licenças e certificados já preenchido (nome do curso,
   Nexla Academy, mês de conclusão, código e o link de validação). "Publicar" compartilha o link de validação,
   que mostra a prévia "Fulano concluiu o curso X" (api/previa.js). */
function NoLinkedIn({ cert }: { cert: DadosCertificado }) {
  const validacao = `https://www.nexla.com.br/academy/validar/${encodeURIComponent(cert.codigo)}`;
  const perfil = 'https://www.linkedin.com/profile/add?' + new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.curso,
    organizationName: 'Nexla Academy',
    issueYear: String(cert.concluidoEm.getFullYear()),
    issueMonth: String(cert.concluidoEm.getMonth() + 1),
    certId: cert.codigo,
    ...(cert.validavel ? { certUrl: validacao } : {}),
  });
  const publicar = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(validacao)}`;
  return (
    <div className="mt-6 pt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4" style={{ borderTop: `1px solid ${T.rule}` }}>
      <p className="text-[14px] font-medium sm:mr-auto" style={{ color: T.ink2 }}>Mostre sua conquista no LinkedIn</p>
      <a href={perfil} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white transition-[filter] hover:brightness-110"
        style={{ background: '#0A66C2' }}>
        <Linkedin size={17} strokeWidth={2} /> Adicionar ao perfil
      </a>
      {cert.validavel && (
        <a href={publicar} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold transition-colors hover:bg-[color:var(--a-soft)]"
          style={{ color: T.ink, border: `1px solid ${T.rule}` }}>
          <Share2 size={16} strokeWidth={2} /> Publicar no LinkedIn
        </a>
      )}
    </div>
  );
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'bloqueado'; nome: string; slug: string; titulo: string; percentual: number; faltam: number; proxima: string | null }
  | { tipo: 'liberado'; nome: string; slug: string; cert: DadosCertificado };

export default function Certificado({ sessao, slug }: { sessao: Session; slug: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [gerando, setGerando] = useState<'' | 'pdf' | 'png'>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const uid = sessao.user.id;
      const { data: c } = await supabase.from('academy_courses').select(SELECT_CURSO).eq('slug', slug).maybeSingle();
      if (!vivo) return;
      if (!c) return setEstado({ tipo: 'nao-encontrado' });
      const curso = organizar(c as unknown as CursoT);
      const [perfil, prog] = await Promise.all([
        supabase.from('academy_profiles').select('nome').eq('id', uid).maybeSingle(),
        supabase.from('academy_lesson_progress').select('lesson_id, atualizado_em').eq('user_id', uid).eq('concluida', true).in('lesson_id', curso.aulas.map(a => a.id)),
      ]);
      if (!vivo) return;
      const nome = (perfil.data?.nome as string | undefined) || (sessao.user.user_metadata?.nome as string | undefined) || sessao.user.email || '';
      const feitas = prog.data ?? [];
      const percentual = pct(feitas.length, curso.aulas.length);

      if (percentual < CERTIFICADO_MIN) {
        const ids = new Set(feitas.map(p => p.lesson_id as string));
        return setEstado({
          tipo: 'bloqueado', nome, slug, titulo: curso.titulo, percentual,
          faltam: Math.max(0, Math.ceil((CERTIFICADO_MIN / 100) * curso.aulas.length) - feitas.length),
          proxima: curso.aulas.find(a => !ids.has(a.id))?.id ?? null,
        });
      }

      // O servidor confere a conclusão, registra o certificado e devolve o código que pode ser validado
      // em /academy/validar. Sem o 024 no banco, segue com o código calculado aqui (só não dá para validar).
      const { data: emitido } = await supabase.rpc('academy_emitir_certificado', { p_course: curso.id });
      if (!vivo) return;
      const srv = emitido as { codigo: string; nome: string; carga_h: number; concluido_em: string } | null;
      const segundos = curso.aulas.reduce((s, a) => s + a.duracao_seg, 0);
      setEstado({
        tipo: 'liberado', nome, slug,
        cert: {
          nome: srv?.nome || nome,
          curso: curso.titulo,
          horas: srv?.carga_h ?? Math.max(1, Math.round(segundos / 3600)),
          concluidoEm: srv ? new Date(srv.concluido_em) : new Date(Math.max(...feitas.map(p => new Date(p.atualizado_em as string).getTime()))),
          codigo: srv?.codigo ?? codigoValidacao(uid, curso.id),
          validavel: !!srv,
        },
      });
    })();
    return () => { vivo = false; };
  }, [sessao, slug]);

  // Desenha a prévia assim que o certificado estiver liberado
  useEffect(() => {
    if (estado.tipo === 'liberado' && canvasRef.current) desenharCertificado(canvasRef.current, estado.cert);
  }, [estado]);

  const baixar = async (formato: 'pdf' | 'png') => {
    if (estado.tipo !== 'liberado' || !canvasRef.current) return;
    setGerando(formato);
    const canvas = await desenharCertificado(canvasRef.current, estado.cert);
    const arquivo = `certificado-nexla-academy-${estado.slug}`;
    if (formato === 'png') {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${arquivo}.png`;
      a.click();
    } else {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
      pdf.setProperties({ title: `Certificado — ${estado.cert.curso}`, author: 'Nexla Academy' });
      pdf.save(`${arquivo}.pdf`);
    }
    setGerando('');
  };

  if (estado.tipo === 'carregando') return <AppLayout nome=""><Carregando /></AppLayout>;

  if (estado.tipo === 'nao-encontrado') {
    return (
      <AppLayout nome="">
        <div className="text-center py-20">
          <p className="font-bold text-[22px]" style={display}>Curso não encontrado</p>
          <Link para="/painel" className="inline-flex items-center gap-1.5 mt-4 font-semibold" style={{ color: T.accent }}>
            <ArrowLeft size={15} /> Voltar para meus cursos
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (estado.tipo === 'bloqueado') {
    return (
      <AppLayout nome={estado.nome}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="max-w-xl mx-auto text-center rounded-2xl p-8 md:p-10" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
          <span className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--a-soft)', color: T.mute }}>
            <Lock size={24} strokeWidth={1.75} />
          </span>
          <h1 className="font-bold text-[24px] md:text-[28px] leading-tight mt-5" style={display}>Seu certificado ainda não foi liberado</h1>
          <p className="text-[15px] mt-2" style={{ color: T.mute }}>
            O certificado de <strong style={{ color: T.ink2 }}>{estado.titulo}</strong> libera quando você concluir todas as aulas.
          </p>
          <div className="flex items-center gap-3 mt-6 text-left">
            <div className="flex-1"><BarraProgresso valor={estado.percentual} grossa /></div>
            <span className="text-[14px] font-semibold">{estado.percentual}%</span>
          </div>
          <p className="text-[14px] mt-2" style={{ color: T.mute }}>
            Falta{estado.faltam > 1 ? 'm' : ''} <strong style={{ color: T.ink }}>{estado.faltam} aula{estado.faltam > 1 ? 's' : ''}</strong> para chegar lá.
          </p>
          <Link para={`/curso/${estado.slug}${estado.proxima ? `?aula=${estado.proxima}` : ''}`}
            className="acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 mt-7 rounded-[10px] text-[15px] font-semibold text-white">
            Continuar o curso <ArrowRight size={17} strokeWidth={2} className="acad-arrow" />
          </Link>
        </motion.div>
      </AppLayout>
    );
  }

  const { cert } = estado;
  return (
    <AppLayout nome={estado.nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full mb-3"
              style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--a-green)' }}>
              <Award size={14} strokeWidth={2} /> Curso concluído
            </span>
            <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(26px,3.2vw,36px)' }}>Parabéns, seu certificado está pronto!</h1>
            <p className="text-[15px] mt-1.5" style={{ color: T.mute }}>{cert.curso} · concluído em {dataPorExtenso(cert.concluidoEm)}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => baixar('png')} disabled={!!gerando}
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[10px] text-[15px] font-semibold transition-colors hover:bg-white disabled:opacity-50"
              style={{ color: T.ink, border: `1px solid ${T.rule}` }}>
              <FileImage size={17} strokeWidth={1.75} /> {gerando === 'png' ? 'Gerando…' : 'Baixar imagem'}
            </button>
            <button onClick={() => baixar('pdf')} disabled={!!gerando}
              className="acad-btn inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] text-[15px] font-semibold text-white">
              <Download size={17} strokeWidth={2} /> {gerando === 'pdf' ? 'Gerando PDF…' : 'Baixar PDF'}
            </button>
          </div>
        </div>

        {/* Prévia: o mesmo desenho que vai para o arquivo */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.rule}`, boxShadow: '0 30px 60px -35px rgba(15,23,42,0.35)' }}>
          <canvas ref={canvasRef} width={CERT_W} height={CERT_H} className="block w-full h-auto"
            aria-label={`Certificado de conclusão de ${cert.curso} emitido para ${cert.nome}`} />
        </div>

        <p className="flex items-start gap-2 text-[13px] mt-4" style={{ color: T.mute }}>
          <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0 mt-px" />
          <span>
            O código <strong style={{ color: T.ink2 }}>{cert.codigo}</strong> identifica este certificado.
            {cert.validavel && <> Qualquer pessoa pode conferir se ele é verdadeiro em{' '}
              <Link para={`/validar/${cert.codigo}`} className="font-medium underline underline-offset-2" style={{ color: T.accent }}>nexla.com.br/academy/validar</Link>.</>}
          </span>
        </p>

        <NoLinkedIn cert={cert} />
      </motion.div>
    </AppLayout>
  );
}
