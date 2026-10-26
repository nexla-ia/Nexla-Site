import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, SearchX, ShieldCheck } from 'lucide-react';
import { T, LOGO, display, ease } from './ui';
import { Link, navegar } from './router';
import { supabase } from './supabase';
import { BotaoTema } from './tema';
import { dataPorExtenso } from './certificadoCanvas';

type Cert = { codigo: string; nome: string; curso: string; carga_h: number; concluido_em: string; emitido_em: string };
type Estado = { tipo: 'vazio' } | { tipo: 'buscando' } | { tipo: 'ok'; cert: Cert } | { tipo: 'nao' } | { tipo: 'erro' };

// Aceita o código com ou sem traços e em minúsculas: "nx abcd 1234" → "NX-ABCD-1234"
const normalizar = (v: string) => {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^NX/, '');
  return s.length === 8 ? `NX-${s.slice(0, 4)}-${s.slice(4)}` : v.trim().toUpperCase();
};

/* Página pública /validar e /validar/:codigo — confere se um certificado foi emitido pela Nexla Academy */
export default function Validar({ codigo }: { codigo?: string }) {
  const [texto, setTexto] = useState(codigo ?? '');
  const [estado, setEstado] = useState<Estado>({ tipo: 'vazio' });

  useEffect(() => {
    if (!codigo) { setEstado({ tipo: 'vazio' }); return; }
    let vivo = true;
    setTexto(codigo);
    setEstado({ tipo: 'buscando' });
    supabase.rpc('academy_validar_certificado', { p_codigo: normalizar(codigo) }).then(({ data, error }) => {
      if (!vivo) return;
      setEstado(error ? { tipo: 'erro' } : data ? { tipo: 'ok', cert: data as Cert } : { tipo: 'nao' });
    });
    return () => { vivo = false; };
  }, [codigo]);

  const conferir = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizar(texto);
    if (c) navegar(`/validar/${encodeURIComponent(c)}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header style={{ background: 'var(--a-vidro)', borderBottom: `1px solid ${T.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link para="/" className="inline-flex items-center gap-2.5">
            <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
            <span className="text-[17px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
          </Link>
          <BotaoTema />
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 sm:px-8 py-12 md:py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.08)', color: T.accent }}>
            <ShieldCheck size={24} strokeWidth={1.75} />
          </span>
          <h1 className="font-bold leading-tight mt-5" style={{ ...display, fontSize: 'clamp(28px,4vw,38px)' }}>Validar certificado</h1>
          <p className="text-[15px] leading-relaxed mt-2" style={{ color: T.mute }}>
            Digite o código que aparece no certificado (por exemplo, <span className="whitespace-nowrap">NX-1A2B-3C4D</span>) para conferir se ele foi emitido pela Nexla Academy.
          </p>

          <form onSubmit={conferir} className="flex gap-2 mt-6">
            <label className="flex-1">
              <span className="sr-only">Código do certificado</span>
              <input className="acad-field w-full h-12 rounded-[10px] px-4 text-[15.5px] font-semibold tracking-wide uppercase" placeholder="NX-0000-0000"
                value={texto} onChange={e => setTexto(e.target.value)} autoComplete="off" spellCheck={false} />
            </label>
            <button type="submit" disabled={!texto.trim()} className="acad-btn h-12 px-5 rounded-[10px] text-[15px] font-semibold text-white">Conferir</button>
          </form>

          <div className="mt-6">
            {estado.tipo === 'buscando' && (
              <p className="inline-flex items-center gap-2 text-[14px]" style={{ color: T.mute }}><Loader2 size={16} className="animate-spin" /> Conferindo…</p>
            )}
            {estado.tipo === 'ok' && (
              <div className="rounded-2xl p-6" style={{ background: T.card, border: '1px solid rgba(34,197,94,0.35)' }}>
                <p className="inline-flex items-center gap-2 font-semibold text-[15px]" style={{ color: 'var(--a-green)' }}>
                  <BadgeCheck size={20} strokeWidth={2} /> Certificado válido
                </p>
                <dl className="mt-4 space-y-3 text-[14.5px]">
                  {[
                    ['Aluno', estado.cert.nome],
                    ['Curso', estado.cert.curso],
                    ['Carga horária', `${estado.cert.carga_h} hora${estado.cert.carga_h > 1 ? 's' : ''}`],
                    ['Concluído em', dataPorExtenso(new Date(estado.cert.concluido_em))],
                    ['Código', estado.cert.codigo],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3">
                      <dt style={{ color: T.mute }}>{k}</dt>
                      <dd className="font-semibold" style={{ color: T.ink }}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[12.5px] mt-5 pt-4" style={{ color: T.mute, borderTop: `1px solid ${T.rule}` }}>
                  Emitido pela Nexla Automação e Inteligência Artificial Ltda. (CNPJ 59.838.572/0001-97). Certificado de conclusão de curso livre.
                </p>
              </div>
            )}
            {estado.tipo === 'nao' && (
              <div className="rounded-2xl p-6 flex gap-3" style={{ background: T.card, border: '1px solid rgba(239,68,68,0.3)' }}>
                <SearchX size={22} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--a-red)' }} />
                <div>
                  <p className="font-semibold">Não encontramos um certificado com esse código</p>
                  <p className="text-[14px] mt-1" style={{ color: T.mute }}>Confira se digitou igual ao que aparece no certificado. Se o problema continuar, fale com a Nexla.</p>
                </div>
              </div>
            )}
            {estado.tipo === 'erro' && (
              <p className="text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>
                Não foi possível conferir agora. Tente de novo em instantes.
              </p>
            )}
          </div>
        </motion.div>
      </main>

      <footer style={{ borderTop: `1px solid ${T.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]" style={{ color: T.mute }}>
          <p>© 2026 Nexla Automação e Inteligência Artificial Ltda.</p>
          <div className="flex gap-5">
            <Link para="/termos" className="hover:underline underline-offset-4">Termos de uso</Link>
            <Link para="/privacidade" className="hover:underline underline-offset-4">Política de privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
