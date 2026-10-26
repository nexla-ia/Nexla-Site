/* ─── Meta Pixel na Academy (mesmo Pixel da /5x2) ────────────────
   Eventos: PageView (cada página), ViewContent (página do curso), InitiateCheckout (tela de compra),
   CompleteRegistration (conta criada) e Purchase (pagamento aprovado).
   A compra também sai pelo servidor (API de Conversões, no webhook do Mercado Pago) com o mesmo
   event_id (id do pedido): o Meta junta os dois e não conta a venda duas vezes.
   Quem é admin não é rastreado. */
import { lerOrigem } from './rastreio';

export const META_PIXEL_ID = '1410172823723220';

declare global { interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown } }

let iniciado = false;
const chamar = (...args: unknown[]) => window.fbq?.(...args);

/* Carrega o Pixel uma vez. Com a conta conhecida, manda e-mail e id para o Meta casar melhor
   o visitante com quem viu o anúncio (o próprio Pixel criptografa antes de enviar). */
export function iniciarPixel(conta?: { email?: string | null; id?: string } | null) {
  if (iniciado || !META_PIXEL_ID) return;
  iniciado = true;
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return; const n: any = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement; t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0]; s.parentNode!.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  const dados: Record<string, string> = {};
  if (conta?.email) dados.em = conta.email.trim().toLowerCase();
  if (conta?.id) dados.external_id = conta.id;
  chamar('init', META_PIXEL_ID, dados);
}

export const pixelAtivo = () => iniciado;

export function evento(nome: string, dados?: Record<string, unknown>, eventId?: string) {
  if (!iniciado) return;
  chamar('track', nome, dados ?? {}, eventId ? { eventID: eventId } : undefined);
}

/* Cookies do Pixel (vão junto no pedido para a API de Conversões ligar a compra ao anúncio) */
export function cookiesMeta() {
  const ler = (n: string) => document.cookie.split('; ').find(c => c.startsWith(`${n}=`))?.split('=').slice(1).join('=');
  let fbc = ler('_fbc');
  // Veio de um anúncio (fbclid guardado na primeira visita) e o cookie não existe: monta no formato do Meta
  const o = lerOrigem();
  if (!fbc && o?.fbclid) fbc = `fb.1.${new Date(o.em).getTime() || Date.now()}.${o.fbclid}`;
  return { fbp: ler('_fbp'), fbc };
}
