// ═══════════════════════════════════════════════════════════════════
// Nexla Academy — webhook do Mercado Pago (notificações de pagamento)
//
// O Mercado Pago avisa que algo mudou num pagamento. Por segurança, NÃO confiamos no corpo do aviso:
// buscamos o pagamento direto na API do Mercado Pago (com o nosso token) e só então agimos.
//   aprovado              → pedido "pago" + matrícula ativa (+ 1 uso no cupom)
//   reembolsado / estorno → pedido "reembolsado" + matrícula desativada
//   recusado / cancelado  → pedido "recusado" / "cancelado"
// Idempotente: o mesmo aviso recebido várias vezes não duplica nada (só age quando o status muda).
//
// Publicar SEM verificação de JWT (o Mercado Pago não manda login):
//   npx supabase functions deploy academy-webhook-mp --no-verify-jwt
// Segredos: MP_ACCESS_TOKEN (obrigatório) e MP_WEBHOOK_SECRET (opcional: assinatura secreta do webhook,
// em Suas integrações → Webhooks; se definido, avisos sem assinatura válida são recusados).
// Meta (opcional): META_CAPI_TOKEN liga o envio da compra à API de Conversões do Pixel;
// META_PIXEL_ID troca o Pixel padrão; META_TEST_EVENT_CODE manda para "Testar eventos" do Gerenciador.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const STATUS: Record<string, string> = {
  approved: 'pago',
  authorized: 'pendente', pending: 'pendente', in_process: 'pendente', in_mediation: 'pendente',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'reembolsado', charged_back: 'reembolsado',
};

const PIXEL_PADRAO = '1410172823723220'; // mesmo Pixel do site (/5x2)

async function sha256(texto: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Envia a compra à API de Conversões do Meta. O event_id é o id do pedido: o mesmo que o navegador
   usa no evento Purchase, então o Meta junta os dois e não conta a venda duas vezes.
   Nunca derruba o webhook: qualquer erro só vai para o log. */
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function compraNoMeta(admin: any, pedido: any, valor: number) {
  const token = Deno.env.get('META_CAPI_TOKEN');
  if (!token || !(valor > 0)) return;
  try {
    const [{ data: perfil }, { data: curso }, { data: conta }] = await Promise.all([
      admin.from('academy_profiles').select('whatsapp').eq('id', pedido.user_id).maybeSingle(),
      admin.from('academy_courses').select('slug, titulo').eq('id', pedido.course_id).maybeSingle(),
      admin.auth.admin.getUserById(pedido.user_id),
    ]);
    const email = String(conta?.user?.email ?? '').trim().toLowerCase();
    const fone = String(perfil?.whatsapp ?? '').replace(/\D/g, '');
    const r = (pedido.rastreio ?? {}) as { fbp?: string; fbc?: string; ip?: string; ua?: string; url?: string };
    const user_data: Record<string, unknown> = { external_id: [await sha256(String(pedido.user_id))] };
    if (email) user_data.em = [await sha256(email)];
    if (fone) user_data.ph = [await sha256(fone)];
    if (r.fbp) user_data.fbp = r.fbp;
    if (r.fbc) user_data.fbc = r.fbc;
    if (r.ip) user_data.client_ip_address = r.ip;
    if (r.ua) user_data.client_user_agent = r.ua;

    const pixel = Deno.env.get('META_PIXEL_ID') || PIXEL_PADRAO;
    const teste = Deno.env.get('META_TEST_EVENT_CODE');
    const ctrl = new AbortController();
    const tempo = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: String(pedido.id),
          action_source: 'website',
          event_source_url: r.url || `https://www.nexla.com.br/academy/comprar/${curso?.slug ?? ''}`,
          user_data,
          custom_data: {
            currency: 'BRL', value: valor, order_id: String(pedido.id),
            content_ids: [curso?.slug ?? String(pedido.course_id)], content_name: curso?.titulo ?? undefined, content_type: 'product',
            num_items: Array.isArray(pedido.itens) ? pedido.itens.length : 1,
          },
        }],
        ...(teste ? { test_event_code: teste } : {}),
      }),
    });
    clearTimeout(tempo);
    if (!resp.ok) console.error('Meta CAPI recusou a compra', pedido.id, resp.status, (await resp.text()).slice(0, 300));
  } catch (e) {
    console.error('Meta CAPI falhou', pedido.id, String(e));
  }
}

async function assinaturaValida(req: Request, dataId: string, segredo: string) {
  const assinatura = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const partes = Object.fromEntries(assinatura.split(',').map(p => p.trim().split('=') as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto));
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === partes.v1;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const url = new URL(req.url);
  let corpo: { type?: string; topic?: string; data?: { id?: string | number } } = {};
  try { corpo = await req.json(); } catch { /* alguns avisos vêm só na URL */ }

  const tipo = corpo.type ?? corpo.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const pagamentoId = String(corpo.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');
  if (tipo !== 'payment' || !pagamentoId) return new Response('ignorado');

  const segredo = Deno.env.get('MP_WEBHOOK_SECRET');
  if (segredo && !(await assinaturaValida(req, pagamentoId, segredo))) return new Response('assinatura inválida', { status: 401 });

  // Consulta o pagamento direto no Mercado Pago
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pagamentoId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
  });
  if (resp.status === 404) return new Response('pagamento não encontrado');
  if (!resp.ok) return new Response('erro ao consultar', { status: 502 }); // o Mercado Pago tenta de novo
  const pagamento = await resp.json();

  const pedidoId = pagamento.external_reference as string | undefined;
  if (!pedidoId) return new Response('sem pedido');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: pedido } = await admin.from('academy_orders').select('*').eq('id', pedidoId).maybeSingle();
  if (!pedido) return new Response('pedido não encontrado');

  const novo = STATUS[pagamento.status as string] ?? 'pendente';
  const agora = new Date().toISOString();
  const base = { mp_payment_id: String(pagamento.id), forma_pagamento: pagamento.payment_type_id ?? null, atualizado_em: agora };

  if (novo === 'pago' && pedido.status !== 'pago' && pedido.status !== 'reembolsado') {
    // Confere o valor pago (proteção extra contra pagamento adulterado)
    if (Number(pagamento.transaction_amount) + 0.01 < Number(pedido.total)) {
      console.error('Valor pago menor que o pedido', pedidoId, pagamento.transaction_amount, pedido.total);
      await admin.from('academy_orders').update({ ...base }).eq('id', pedidoId);
      return new Response('valor divergente');
    }
    await admin.from('academy_orders').update({ ...base, status: 'pago', pago_em: pagamento.date_approved ?? agora }).eq('id', pedidoId);
    await admin.from('academy_enrollments').upsert(
      { user_id: pedido.user_id, course_id: pedido.course_id, ativo: true, order_id: pedidoId },
      { onConflict: 'user_id,course_id' },
    );
    if (pedido.cupom) await admin.rpc('academy_cupom_usar', { p_codigo: pedido.cupom });
    await compraNoMeta(admin, pedido, Number(pedido.total)); // venda para o Pixel (API de Conversões)
  } else if (novo === 'reembolsado' && pedido.status !== 'reembolsado') {
    await admin.from('academy_orders').update({ ...base, status: 'reembolsado' }).eq('id', pedidoId);
    await admin.from('academy_enrollments').update({ ativo: false }).eq('user_id', pedido.user_id).eq('course_id', pedido.course_id).eq('order_id', pedidoId);
  } else if ((novo === 'recusado' || novo === 'cancelado') && pedido.status === 'pendente') {
    await admin.from('academy_orders').update({ ...base, status: novo }).eq('id', pedidoId);
  } else {
    await admin.from('academy_orders').update(base).eq('id', pedidoId); // pendente (Pix/boleto aguardando) ou aviso repetido
  }
  return new Response('ok');
});
