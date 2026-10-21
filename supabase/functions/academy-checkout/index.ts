// ═══════════════════════════════════════════════════════════════════
// Nexla Academy — checkout (Mercado Pago Checkout Pro)
//
// POST { slug, com_oferta?: boolean, cupom?: string, acao: 'calcular' | 'pagar' }
//   calcular → devolve itens, desconto e total (para a tela de resumo)
//   pagar    → cria o pedido (pendente) e a preferência no Mercado Pago e devolve a URL do checkout
//
// O preço vem SEMPRE do banco (academy_products), nunca do navegador.
// Segredos usados (Supabase → Edge Functions → Secrets): MP_ACCESS_TOKEN.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são fornecidos automaticamente pelo Supabase.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SITE_PADRAO = 'https://www.nexla.com.br';
const ORIGENS_OK = ['https://www.nexla.com.br', 'https://nexla.com.br', 'http://localhost:5173', 'http://localhost:4173'];
const PARCELAS_MAX = 12; // decisão em aberto no briefing (quantas vezes / juros)

const cors = (origem: string | null) => ({
  'Access-Control-Allow-Origin': origem && ORIGENS_OK.includes(origem) ? origem : SITE_PADRAO,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const centavos = (n: number) => Math.round(n * 100) / 100;

Deno.serve(async (req) => {
  const origem = req.headers.get('origin');
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...cors(origem), 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origem) });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Quem está comprando (JWT do aluno logado)
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem } = await admin.auth.getUser(token);
  const usuario = quem?.user;
  if (!usuario) return json({ erro: 'nao_logado' }, 401);

  let entrada: { slug?: string; com_oferta?: boolean; cupom?: string; acao?: string };
  try { entrada = await req.json(); } catch { return json({ erro: 'entrada' }, 400); }
  const slug = String(entrada.slug ?? '');
  const acao = entrada.acao === 'pagar' ? 'pagar' : 'calcular';
  const codigo = String(entrada.cupom ?? '').trim().toUpperCase();

  // Curso e produtos
  const { data: curso } = await admin.from('academy_courses').select('id, slug, titulo, publicado').eq('slug', slug).maybeSingle();
  if (!curso || !curso.publicado) return json({ erro: 'curso_nao_encontrado' }, 404);
  const { data: produtos } = await admin.from('academy_products').select('id, tipo, titulo, preco, preco_promocional, ativo').eq('course_id', curso.id).eq('ativo', true);
  const principal = produtos?.find(p => p.tipo === 'curso');
  const extra = produtos?.find(p => p.tipo === 'oferta_extra');
  if (!principal) return json({ erro: 'sem_preco' }, 409);

  const valorDe = (p: { preco: number; preco_promocional: number | null }) => Number(p.preco_promocional ?? p.preco);
  const itens = [{ produto: principal.id, titulo: curso.titulo, valor: valorDe(principal) }];
  if (entrada.com_oferta && extra) itens.push({ produto: extra.id, titulo: extra.titulo, valor: valorDe(extra) });
  const subtotal = centavos(itens.reduce((s, i) => s + i.valor, 0));

  // Cupom (validado só aqui no servidor)
  let desconto = 0;
  let cupomMsg = '';
  let cupomOk = false;
  if (codigo) {
    const { data: c } = await admin.from('academy_coupons').select('*').eq('codigo', codigo).maybeSingle();
    if (!c || !c.ativo) cupomMsg = 'Cupom inválido.';
    else if (c.course_id && c.course_id !== curso.id) cupomMsg = 'Este cupom não vale para este curso.';
    else if (c.validade && new Date(c.validade) < new Date()) cupomMsg = 'Este cupom expirou.';
    else if (c.limite_usos && c.usos >= c.limite_usos) cupomMsg = 'Este cupom já atingiu o limite de usos.';
    else {
      desconto = centavos(c.tipo === 'percentual' ? subtotal * Number(c.valor) / 100 : Math.min(Number(c.valor), subtotal));
      cupomOk = true;
      cupomMsg = c.tipo === 'percentual' ? `${Number(c.valor)}% de desconto aplicado.` : 'Desconto aplicado.';
    }
  }
  const total = centavos(Math.max(0, subtotal - desconto));
  const resumo = {
    curso: curso.titulo, itens, subtotal, desconto, total,
    cupom: cupomOk ? codigo : null, cupom_msg: cupomMsg,
    oferta_extra: extra ? { titulo: extra.titulo, valor: valorDe(extra), de: extra.preco_promocional != null ? Number(extra.preco) : null } : null,
    preco_de: principal.preco_promocional != null ? Number(principal.preco) : null,
    parcelas_max: PARCELAS_MAX,
  };
  if (acao === 'calcular') return json(resumo);

  // ── Pagar ──
  if (codigo && !cupomOk) return json({ erro: 'cupom', mensagem: cupomMsg }, 422);
  const { data: jaTem } = await admin.from('academy_enrollments').select('ativo').eq('user_id', usuario.id).eq('course_id', curso.id).eq('ativo', true).maybeSingle();
  if (jaTem) return json({ erro: 'ja_matriculado' }, 409);

  const { data: pedido, error: erroPedido } = await admin.from('academy_orders').insert({
    user_id: usuario.id, course_id: curso.id, itens, subtotal, desconto, total,
    cupom: cupomOk ? codigo : null, com_oferta_extra: itens.length > 1, status: 'pendente',
  }).select('id').single();
  if (erroPedido || !pedido) return json({ erro: 'pedido' }, 500);

  // Curso de graça (ex.: cupom de 100%): libera direto, sem passar pelo Mercado Pago
  if (total === 0) {
    await admin.from('academy_orders').update({ status: 'pago', pago_em: new Date().toISOString(), forma_pagamento: 'gratuito' }).eq('id', pedido.id);
    await admin.from('academy_enrollments').upsert({ user_id: usuario.id, course_id: curso.id, ativo: true, order_id: pedido.id }, { onConflict: 'user_id,course_id' });
    if (cupomOk) await admin.rpc('academy_cupom_usar', { p_codigo: codigo });
    return json({ url: `${origem && ORIGENS_OK.includes(origem) ? origem : SITE_PADRAO}/academy/compra/${pedido.id}`, pedido: pedido.id });
  }

  const site = origem && ORIGENS_OK.includes(origem) ? origem : SITE_PADRAO;
  const retorno = `${site}/academy/compra/${pedido.id}`;
  // O Mercado Pago recusa o retorno automático para endereços http://localhost (só aceita em https)
  const local = site.startsWith('http://localhost');
  const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': pedido.id,
    },
    body: JSON.stringify({
      items: [{
        id: curso.slug,
        title: itens.length > 1 ? `${curso.titulo} + ${extra?.titulo}` : curso.titulo,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: total,
      }],
      payer: { email: usuario.email },
      external_reference: pedido.id,
      metadata: { pedido: pedido.id, curso: curso.slug },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/academy-webhook-mp`,
      back_urls: { success: retorno, pending: retorno, failure: retorno },
      ...(local ? {} : { auto_return: 'approved' }),
      payment_methods: { installments: PARCELAS_MAX },
      statement_descriptor: 'NEXLA ACADEMY',
    }),
  });
  const preferencia = await mp.json();
  if (!mp.ok || !preferencia.init_point) {
    console.error('Mercado Pago recusou a preferência', mp.status, JSON.stringify(preferencia));
    await admin.from('academy_orders').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', pedido.id);
    const detalhe = String(preferencia?.message ?? preferencia?.error ?? `HTTP ${mp.status}`).slice(0, 200);
    return json({ erro: 'mercado_pago', detalhe }, 502);
  }
  await admin.from('academy_orders').update({ mp_preference_id: preferencia.id, atualizado_em: new Date().toISOString() }).eq('id', pedido.id);
  return json({ url: preferencia.init_point, pedido: pedido.id });
});
