/* Preferências de estudo do aluno (ficam salvas neste navegador, como o tema).
 *   proximaAuto → ao concluir a aula, a próxima começa sozinha depois de 5 s
 *   retomar     → o vídeo continua de onde parou na última vez
 *   teatro      → as aulas abrem com o vídeo grande, sem a lista de aulas ao lado (tecla T no curso)
 *   concluirAuto → ao terminar o vídeo, a aula é marcada como concluída sozinha */
export type Preferencia = 'proximaAuto' | 'retomar' | 'teatro' | 'concluirAuto';

const CHAVE: Record<Preferencia, string> = {
  proximaAuto: 'academy-proxima-auto', retomar: 'academy-retomar', teatro: 'academy-teatro', concluirAuto: 'academy-concluir-auto',
};
const PADRAO: Record<Preferencia, boolean> = { proximaAuto: true, retomar: true, teatro: false, concluirAuto: true };

export function lerPreferencia(p: Preferencia) {
  try {
    const v = localStorage.getItem(CHAVE[p]);
    return v === null ? PADRAO[p] : v === '1';
  } catch { return PADRAO[p]; }
}

export function salvarPreferencia(p: Preferencia, ligado: boolean) {
  try { localStorage.setItem(CHAVE[p], ligado ? '1' : '0'); } catch { /* sem armazenamento: só não lembra */ }
}
