import { supabase } from './supabase';
import { lerTema, salvarTema, EVENTO_PREFERENCIAS, type Tema } from './tema';

/* Preferências de estudo do aluno. Ficam salvas na conta (academy_profiles.preferencias, SQL 030), junto
 * com o tema, e acompanham o aluno em qualquer aparelho; o navegador guarda uma cópia para ler na hora.
 *   proximaAuto  → ao concluir a aula, a próxima começa sozinha depois de 5 s
 *   retomar      → o vídeo continua de onde parou na última vez
 *   teatro       → as aulas abrem com o vídeo grande, sem a lista de aulas ao lado (tecla T no curso)
 *   concluirAuto → ao terminar o vídeo, a aula é marcada como concluída sozinha */
export type Preferencia = 'proximaAuto' | 'retomar' | 'teatro' | 'concluirAuto';

const CHAVE: Record<Preferencia, string> = {
  proximaAuto: 'academy-proxima-auto', retomar: 'academy-retomar', teatro: 'academy-teatro', concluirAuto: 'academy-concluir-auto',
};
const PADRAO: Record<Preferencia, boolean> = { proximaAuto: true, retomar: true, teatro: false, concluirAuto: true };
const NOMES = Object.keys(CHAVE) as Preferencia[];
const TEMAS: Tema[] = ['claro', 'escuro', 'sistema'];

/* Avisado depois que as preferências da conta chegam (a tela de perfil relê os valores) */
export const EVENTO_CARREGADAS = 'academy-preferencias-carregadas';

export function lerPreferencia(p: Preferencia) {
  try {
    const v = localStorage.getItem(CHAVE[p]);
    return v === null ? PADRAO[p] : v === '1';
  } catch { return PADRAO[p]; }
}

const gravarLocal = (p: Preferencia, ligado: boolean) => {
  try { localStorage.setItem(CHAVE[p], ligado ? '1' : '0'); } catch { /* sem armazenamento: só não lembra */ }
};

export function salvarPreferencia(p: Preferencia, ligado: boolean) {
  gravarLocal(p, ligado);
  window.dispatchEvent(new Event(EVENTO_PREFERENCIAS));
}

/* ─── Na conta ───────────────────────────────────────────────────── */
let conta: string | null = null; // só grava depois de ler o que já estava salvo (para não sobrescrever)
let espera: number | undefined;

const todas = () => ({ tema: lerTema(), ...Object.fromEntries(NOMES.map(p => [p, lerPreferencia(p)])) });

// Mudou algo: grava na conta (junta cliques seguidos numa gravação só)
window.addEventListener(EVENTO_PREFERENCIAS, () => {
  if (!conta) return;
  const uid = conta;
  window.clearTimeout(espera);
  espera = window.setTimeout(() => {
    supabase.from('academy_profiles').update({ preferencias: todas() }).eq('id', uid).then(() => undefined, () => undefined);
  }, 600);
});

/* Ao entrar: traz as preferências da conta para este navegador.
   Conta sem nada salvo ainda → leva as deste navegador para a conta. */
export async function sincronizarPreferencias(uid: string | null) {
  conta = null;
  if (!uid) return;
  const { data, error } = await supabase.from('academy_profiles').select('preferencias').eq('id', uid).maybeSingle();
  if (error || !data) return; // sem o 030 no banco: fica só no navegador
  const salvas = (data.preferencias ?? {}) as Record<string, unknown>;
  conta = uid;
  if (!Object.keys(salvas).length) {
    window.dispatchEvent(new Event(EVENTO_PREFERENCIAS));
    return;
  }
  NOMES.forEach(p => { if (typeof salvas[p] === 'boolean') gravarLocal(p, salvas[p] as boolean); });
  if (TEMAS.includes(salvas.tema as Tema) && salvas.tema !== lerTema()) salvarTema(salvas.tema as Tema, true);
  window.dispatchEvent(new Event(EVENTO_CARREGADAS));
}
