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
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const STATUS: Record<string, string> = {
  approved: 'pago',
  authorized: 'pendente', pending: 'pendente', in_process: 'pendente', in_mediation: 'pendente',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'reembolsado', charged_back: 'reembolsado',
};

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
