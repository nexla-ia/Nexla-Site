/* Desenha o certificado num <canvas> (A4 deitado). A mesma imagem serve para a prévia na tela,
 * para o PNG e para o PDF — o que o aluno vê é exatamente o que ele baixa. */
import { LOGO } from './ui';

export type DadosCertificado = {
  nome: string;
  curso: string;
  horas: number;
  concluidoEm: Date;
  codigo: string;
  validavel?: boolean; // código registrado no servidor (dá para conferir em /academy/validar)
};

export const CERT_W = 3508; // A4 deitado a 300 dpi
export const CERT_H = 2480;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataPorExtenso = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif";
const TEXTO   = "'Plus Jakarta Sans', system-ui, sans-serif";

let logoCache: Promise<HTMLImageElement> | null = null;
const carregarLogo = () => (logoCache ??= new Promise((ok, falha) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = falha;
  img.src = LOGO;
}));

/* Reduz a fonte até o texto caber na largura */
function caber(ctx: CanvasRenderingContext2D, texto: string, peso: number, tamanho: number, familia: string, largura: number) {
  let t = tamanho;
  do { ctx.font = `${peso} ${t}px ${familia}`; t -= 4; } while (ctx.measureText(texto).width > largura && t > 40);
}

export async function desenharCertificado(canvas: HTMLCanvasElement, d: DadosCertificado) {
  await Promise.all([
    document.fonts.load(`700 120px ${DISPLAY}`),
    document.fonts.load(`600 60px ${DISPLAY}`),
    document.fonts.load(`500 40px ${TEXTO}`),
    document.fonts.load(`700 40px ${TEXTO}`),
  ]).catch(() => undefined);
  const logo = await carregarLogo().catch(() => null);

  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext('2d')!;
  const W = CERT_W, H = CERT_H, cx = W / 2;

  // Fundo e moldura
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const faixa = ctx.createLinearGradient(0, 0, W, 0);
  faixa.addColorStop(0, '#4F46E5'); faixa.addColorStop(1, '#7C3AED');
  ctx.fillStyle = faixa;
  ctx.fillRect(0, 0, W, 36);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 6;
  ctx.strokeRect(120, 156, W - 240, H - 276);

  // Marca
  const topoY = 330;
  if (logo) ctx.drawImage(logo, 230, topoY - 75, 150, 150);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 64px ${DISPLAY}`;
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Nexla', 410, topoY);
  const wNexla = ctx.measureText('Nexla ').width;
  ctx.fillStyle = '#4F46E5';
  ctx.fillText('Academy', 410 + wNexla, topoY);

  ctx.textAlign = 'right';
  ctx.font = `500 36px ${TEXTO}`;
  ctx.fillStyle = '#64748B';
  ctx.fillText('Código de validação', W - 230, topoY - 28);
  ctx.font = `700 44px ${TEXTO}`;
  ctx.fillStyle = '#0F172A';
  ctx.fillText(d.codigo, W - 230, topoY + 32);

  // Corpo
  ctx.textAlign = 'center';
  ctx.font = `700 46px ${TEXTO}`;
  ctx.fillStyle = '#4F46E5';
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '14px';
  ctx.fillText('CERTIFICADO DE CONCLUSÃO', cx, 760);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  ctx.font = `500 50px ${TEXTO}`;
  ctx.fillStyle = '#475569';
  ctx.fillText('Certificamos que', cx, 920);

  caber(ctx, d.nome, 700, 168, DISPLAY, W - 700);
  ctx.fillStyle = '#0F172A';
  ctx.fillText(d.nome, cx, 1100);

  const linha = ctx.createLinearGradient(cx - 420, 0, cx + 420, 0);
  linha.addColorStop(0, 'rgba(79,70,229,0)'); linha.addColorStop(0.5, '#7C3AED'); linha.addColorStop(1, 'rgba(79,70,229,0)');
  ctx.fillStyle = linha;
  ctx.fillRect(cx - 420, 1225, 840, 6);

  ctx.font = `500 50px ${TEXTO}`;
  ctx.fillStyle = '#475569';
  ctx.fillText('concluiu o curso', cx, 1350);

  caber(ctx, d.curso, 700, 92, DISPLAY, W - 800);
  ctx.fillStyle = '#4F46E5';
  ctx.fillText(d.curso, cx, 1480);

  ctx.font = `500 48px ${TEXTO}`;
  ctx.fillStyle = '#475569';
  const horas = `${d.horas} hora${d.horas > 1 ? 's' : ''}`;
  ctx.fillText(`com carga horária de ${horas}, concluído em ${dataPorExtenso(d.concluidoEm)}.`, cx, 1610);

  // Assinatura e emissor
  const baseY = 1990;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(330, baseY - 70, 760, 4);
  ctx.textAlign = 'center';
  ctx.font = `700 46px ${DISPLAY}`;
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Alisson Amorim', 710, baseY);
  ctx.font = `500 36px ${TEXTO}`;
  ctx.fillStyle = '#64748B';
  ctx.fillText('Fundador da Nexla · Instrutor', 710, baseY + 60);

  ctx.textAlign = 'right';
  ctx.font = `700 42px ${TEXTO}`;
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Nexla Automação e IA', W - 330, baseY);
  ctx.font = `500 36px ${TEXTO}`;
  ctx.fillStyle = '#64748B';
  ctx.fillText(d.validavel ? 'Confira em nexla.com.br/academy/validar' : 'Vilhena, RO · nexla.com.br/academy', W - 330, baseY + 60);

  return canvas;
}
