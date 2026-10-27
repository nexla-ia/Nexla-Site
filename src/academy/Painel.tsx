import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { T, LOGO, display, ease } from './ui';
import { AppLayout, BarraProgresso, Carregando } from './AppLayout';
import { Link } from './router';
import { useCursosAluno, primeiroNome, certificadoLiberado } from './dados';
import { CardMeu, CardVitrine, GradeCategorias, GRADE_CURSOS } from './Explorar';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/* Título de seção (o mesmo das categorias no Explorar), com um link opcional à direita */
function Secao({ titulo, link, children }: { titulo: string; link?: { para: string; texto: string }; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="font-bold text-[18px]" style={display}>{titulo}</h2>
        {link && (
          <Link para={link.para} className="group inline-flex items-center gap-1 text-[13.5px] font-medium" style={{ color: T.accent }}>
            {link.texto} <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function Painel({ sessao }: { sessao: Session }) {
  const dados = useCursosAluno(sessao);
  if (!dados) return <AppLayout nome=""><Carregando /></AppLayout>;

  const { nome, cursos, outros, erro } = dados;
  const emAndamento = cursos.filter(c => c.percentual < 100).sort((a, b) => b.ultima - a.ultima)[0];
  const totalFeitas = cursos.reduce((s, c) => s + c.feitas.size, 0);
  const certificados = cursos.filter(certificadoLiberado).length;

  return (
    <AppLayout nome={nome}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        {/* Boas-vindas e um resumo numa linha só */}
        <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(28px,3.4vw,40px)' }}>
          Olá, {primeiroNome(nome)}! <span style={{ color: T.accent }}>Bem-vindo à Nexla Academy</span>.
        </h1>
        <p className="text-[15px] mt-2" style={{ color: T.mute }}>
          {cursos.length
            ? [plural(cursos.length, 'curso', 'cursos'), plural(totalFeitas, 'aula concluída', 'aulas concluídas'), plural(certificados, 'certificado', 'certificados')].join(' · ')
            : 'Assim que você tiver um curso, ele aparece aqui.'}
        </p>

        {erro && <p className="mt-6 text-[14px] rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--a-red)' }}>{erro}</p>}

        {/* Continue de onde parou: a próxima aula do curso mexido por último */}
        {emAndamento?.proxima && (
          <Secao titulo="Continue de onde parou">
            <Link para={`/curso/${emAndamento.slug}?aula=${emAndamento.proxima.id}`}
              className="group flex items-center gap-4 sm:gap-5 rounded-xl p-3 pr-4 sm:pr-5 border border-[color:var(--a-rule)] transition-colors hover:border-[color:var(--a-accent)]"
              style={{ background: T.card }}>
              <div className="relative hidden sm:block w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-cover bg-center"
                style={emAndamento.capa ? { backgroundImage: `url("${emAndamento.capa}")` } : { background: 'var(--a-soft)' }}>
                {!emAndamento.capa && <img src={LOGO} alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 object-contain opacity-90" />}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <p className="text-[13px] truncate" style={{ color: T.mute }}>{emAndamento.titulo}</p>
                <p className="text-[16px] font-semibold leading-snug mt-0.5 line-clamp-2" style={{ color: T.ink }}>{emAndamento.proxima.titulo}</p>
                <div className="flex items-center gap-3 mt-2.5 max-w-xs">
                  <div className="flex-1"><BarraProgresso valor={emAndamento.percentual} /></div>
                  <span className="text-[12.5px]" style={{ color: T.mute }}>{emAndamento.percentual}%</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[14px] font-medium shrink-0" style={{ color: T.accent }}>
                Continuar <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Secao>
        )}

        {/* Sem cursos ainda: mostra direto os cursos disponíveis */}
        {cursos.length === 0 && outros.length > 0 ? (
          <div className="mt-10"><GradeCategorias outros={outros} /></div>
        ) : cursos.length === 0 ? (
          <p className="mt-8 text-[14.5px]" style={{ color: T.mute }}>
            Quando a compra for confirmada, o curso aparece aqui automaticamente.{' '}
            <Link para="/cursos" className="font-medium hover:underline underline-offset-4" style={{ color: T.accent }}>Explorar cursos</Link>
          </p>
        ) : (
          <Secao titulo="Meus cursos">
            <div className={GRADE_CURSOS}>
              {cursos.map(c => (
                <CardMeu key={c.id} c={c} extra={certificadoLiberado(c) && (
                  <Link para={`/certificado/${c.slug}`} className="group inline-flex items-center gap-1 mt-1.5 text-[13px] font-medium" style={{ color: T.accent }}>
                    Ver certificado <ArrowRight size={13} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )} />
              ))}
            </div>
          </Secao>
        )}

        {/* Outros cursos publicados que o aluno ainda não tem */}
        {cursos.length > 0 && outros.length > 0 && (
          <Secao titulo="Você também pode gostar" link={{ para: '/cursos', texto: 'Explorar cursos' }}>
            <div className={GRADE_CURSOS}>
              {outros.slice(0, 3).map(c => <CardVitrine key={c.id} c={c} />)}
            </div>
          </Secao>
        )}
      </motion.div>
    </AppLayout>
  );
}
