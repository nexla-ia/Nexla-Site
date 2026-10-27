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
// Vale a escolha mais recente: cada mudança guarda o momento (em) aqui e na conta.
// A conta de quem fez a última mudança neste navegador também fica anotada (para não levar
// as escolhas de uma conta para outra quando alguém troca de conta no mesmo computador).
const EM = 'academy-preferencias-em';
const DE_QUEM = 'academy-preferencias-conta';
const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

let conta: string | null = null; // só grava depois de ler o que já estava salvo (para não sobrescrever)
let espera: number | undefined;

const todas = () => ({ tema: lerTema(), ...Object.fromEntries(NOMES.map(p => [p, lerPreferencia(p)])), em: Number(lerLocal(EM) ?? 0) });

const enviar = (uid: string) =>
  supabase.from('academy_profiles').update({ preferencias: todas() }).eq('id', uid).then(() => undefined, () => undefined);

// Mudou algo: anota quando e grava na conta (junta cliques seguidos numa gravação só)
window.addEventListener(EVENTO_PREFERENCIAS, () => {
  gravar(EM, String(Date.now()));
  if (!conta) return;
  const uid = conta;
  gravar(DE_QUEM, uid);
  window.clearTimeout(espera);
  espera = window.setTimeout(() => enviar(uid), 600);
});

/* Ao entrar: junta as preferências da conta com as deste navegador, valendo a mais recente.
   Conta sem nada salvo ainda → leva as deste navegador para a conta. */
export async function sincronizarPreferencias(uid: string | null) {
  conta = null;
  if (!uid) return;
  const { data, error } = await supabase.from('academy_profiles').select('preferencias').eq('id', uid).maybeSingle();
  if (error || !data) return; // sem o 030 no banco: fica só no navegador
  const salvas = (data.preferencias ?? {}) as Record<string, unknown>;
  conta = uid;
  const deQuem = lerLocal(DE_QUEM);
  const localMaisNova = (deQuem === uid || deQuem === null) && Number(lerLocal(EM) ?? 0) > Number(salvas.em ?? 0);
  if (!Object.keys(salvas).length || localMaisNova) {
    gravar(DE_QUEM, uid);
    enviar(uid);
    return;
  }
  NOMES.forEach(p => { if (typeof salvas[p] === 'boolean') gravarLocal(p, salvas[p] as boolean); });
  if (TEMAS.includes(salvas.tema as Tema) && salvas.tema !== lerTema()) salvarTema(salvas.tema as Tema, true);
  gravar(EM, String(Number(salvas.em ?? 0)));
  gravar(DE_QUEM, uid);
  window.dispatchEvent(new Event(EVENTO_CARREGADAS));
}
