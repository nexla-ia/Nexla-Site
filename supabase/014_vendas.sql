-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — vendas (Mercado Pago Checkout Pro)
-- Rodar no SQL Editor (depois do 013). Pode rodar de novo sem erro.
--
-- Como funciona:
--   • Preço e oferta extra ficam em academy_products (admin → curso → Configurações → Venda).
--   • O pedido é criado SÓ pelo servidor (Edge Function academy-checkout), com o preço do banco.
--   • O curso é liberado SÓ pela confirmação do Mercado Pago (Edge Function academy-webhook-mp),
--     nunca pela tela de "obrigado". Reembolso/estorno desativa a matrícula.
--   • O aluno só LÊ os próprios pedidos. Ninguém do navegador cria ou altera pedido.
-- ═══════════════════════════════════════════════════════════════════

-- ── Produtos: o que é vendido de cada curso ─────────────────────────
create table if not exists public.academy_products (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid not null references public.academy_courses(id) on delete cascade,
  tipo               text not null check (tipo in ('curso', 'oferta_extra')),
  titulo             text not null,
  descricao          text,
  preco              numeric(10,2) not null check (preco >= 0),
  preco_promocional  numeric(10,2) check (preco_promocional is null or preco_promocional >= 0),
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  unique (course_id, tipo)   -- 1 preço do curso + 1 oferta extra por curso
);

alter table public.academy_products enable row level security;
drop policy if exists "produtos: ver ativos" on public.academy_products;
drop policy if exists "admin: produtos"      on public.academy_products;
create policy "produtos: ver ativos" on public.academy_products for select using (ativo);
create policy "admin: produtos"      on public.academy_products for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());

-- ── Cupons ──────────────────────────────────────────────────────────
create table if not exists public.academy_coupons (
  codigo        text primary key check (codigo = upper(codigo) and codigo ~ '^[A-Z0-9_-]{3,30}$'),
  tipo          text not null check (tipo in ('percentual', 'valor')),
  valor         numeric(10,2) not null check (valor > 0),
  course_id     uuid references public.academy_courses(id) on delete cascade,  -- vazio = vale para todos
  validade      timestamptz,                                                    -- vazio = sem prazo
  limite_usos   int check (limite_usos is null or limite_usos > 0),             -- vazio = ilimitado
  usos          int not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  check (tipo <> 'percentual' or valor <= 100)
);

-- Cupom não é público (senão dava para listar todos): só admin vê; o checkout valida no servidor
alter table public.academy_coupons enable row level security;
drop policy if exists "admin: cupons" on public.academy_coupons;
create policy "admin: cupons" on public.academy_coupons for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());

-- ── Pedidos ─────────────────────────────────────────────────────────
create table if not exists public.academy_orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  course_id         uuid not null references public.academy_courses(id) on delete restrict,
  itens             jsonb not null,                -- [{produto, titulo, valor}]
  subtotal          numeric(10,2) not null,
  desconto          numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  cupom             text,
  com_oferta_extra  boolean not null default false,
  status            text not null default 'pendente'
                    check (status in ('pendente', 'pago', 'recusado', 'cancelado', 'reembolsado')),
  mp_preference_id  text,
  mp_payment_id     text unique,
  forma_pagamento   text,                          -- pix, credit_card, ticket (boleto)...
  criado_em         timestamptz not null default now(),
  pago_em           timestamptz,
  atualizado_em     timestamptz not null default now()
);
create index if not exists academy_orders_user_idx   on public.academy_orders(user_id, criado_em desc);
create index if not exists academy_orders_status_idx on public.academy_orders(status, criado_em desc);

-- Matrícula aponta para o pedido que a gerou (vazio = liberada manualmente pelo admin)
alter table public.academy_enrollments add column if not exists order_id uuid references public.academy_orders(id) on delete set null;

alter table public.academy_orders enable row level security;
drop policy if exists "pedidos: ver os próprios" on public.academy_orders;
drop policy if exists "admin: pedidos ver"       on public.academy_orders;
create policy "pedidos: ver os próprios" on public.academy_orders for select using (user_id = auth.uid());
create policy "admin: pedidos ver"       on public.academy_orders for select using (public.academy_eh_admin());
-- Sem políticas de insert/update/delete: só o servidor (service_role, nas Edge Functions) grava pedidos.

-- Soma 1 uso ao cupom quando o pagamento é aprovado (só o servidor chama)
create or replace function public.academy_cupom_usar(p_codigo text)
returns void language sql security definer set search_path = public as $$
  update academy_coupons set usos = usos + 1 where codigo = upper(p_codigo);
$$;
revoke execute on function public.academy_cupom_usar(text) from public, anon, authenticated;
