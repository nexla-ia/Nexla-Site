-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — métricas do funil e lista de leads (rodar depois do 022)
-- Pode rodar de novo sem erro.
--
--   1. Perfil guarda o e-mail (para a lista de leads) e a origem do cadastro (UTM).
--      Corrige também o cadastro: a função antiga ainda lia a tabela academy_convites,
--      apagada no 016 — com o 016 rodado, criar conta dava erro.
--   2. Tabela academy_events: visitas às páginas e aulas abertas (alimenta o funil).
--   3. academy_metricas(): todos os números do painel, calculados no servidor (só admin).
--   4. academy_leads(): uma linha por pessoa cadastrada, com compras e origem (só admin).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Perfil: e-mail e origem ─────────────────────────────────────
alter table public.academy_profiles add column if not exists email text;
update public.academy_profiles p set email = lower(u.email)
  from auth.users u where u.id = p.id and p.email is distinct from lower(u.email);

-- Cadastro novo: cria o perfil com nome, WhatsApp, consentimento, e-mail e a origem (UTM) da primeira visita
create or replace function public.academy_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.academy_profiles (id, nome, whatsapp, consentimento_marketing, email, utm)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'whatsapp',
    coalesce((new.raw_user_meta_data->>'consentimento_marketing')::boolean, false),
    lower(new.email),
    case when jsonb_typeof(new.raw_user_meta_data->'utm') = 'object' then new.raw_user_meta_data->'utm' end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

-- Trocou o e-mail no login → atualiza no perfil
create or replace function public.academy_email_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.academy_profiles set email = lower(new.email) where id = new.id;
  return new;
end $$;
drop trigger if exists academy_on_auth_email_changed on auth.users;
create trigger academy_on_auth_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.academy_email_mudou();

-- ── 2. Eventos (visitas e aulas abertas) ───────────────────────────
create table if not exists public.academy_events (
  id         bigint generated always as identity primary key,
  visitante  text not null check (char_length(visitante) between 8 and 64), -- id anônimo do navegador
  user_id    uuid references auth.users(id) on delete set null,
  tipo       text not null check (tipo in ('visita', 'aula')),
  pagina     text check (char_length(pagina) <= 200),
  course_id  uuid references public.academy_courses(id) on delete set null,
  lesson_id  uuid references public.academy_lessons(id) on delete set null,
  utm        jsonb check (utm is null or pg_column_size(utm) < 2000),
  criado_em  timestamptz not null default now()
);
create index if not exists academy_events_data on public.academy_events (criado_em);
create index if not exists academy_events_aula on public.academy_events (lesson_id) where tipo = 'aula';
alter table public.academy_events enable row level security;

-- Qualquer visitante registra eventos (sem login, user_id vazio); ninguém lê, só o admin
drop policy if exists "eventos: registrar" on public.academy_events;
drop policy if exists "admin: eventos ver" on public.academy_events;
create policy "eventos: registrar" on public.academy_events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy "admin: eventos ver" on public.academy_events for select using (public.academy_eh_admin());
grant insert on public.academy_events to anon, authenticated;

-- ── 3. Métricas do painel ──────────────────────────────────────────
-- Origem = utm.origem (utm_source) da primeira visita; sem UTM, conta como 'direto'.
create or replace function public.academy_metricas(p_desde timestamptz, p_ate timestamptz default now(),
                                                   p_curso uuid default null, p_origem text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_slug text;
  r jsonb;
begin
  if not public.academy_eh_admin() then raise exception 'acesso negado'; end if;
  select slug into v_slug from academy_courses where id = p_curso;

  with
  ev as (
    select e.* from academy_events e
    where e.criado_em >= p_desde and e.criado_em < p_ate and e.tipo = 'visita'
      and (p_origem is null or coalesce(e.utm->>'origem', 'direto') = p_origem)
      and (p_curso is null or e.pagina like '/curso/' || v_slug || '%' or e.pagina like '/comprar/' || v_slug || '%')
  ),
  cad as (
    select p.* from academy_profiles p
    where p.role = 'aluno' and p.criado_em >= p_desde and p.criado_em < p_ate
      and (p_origem is null or coalesce(p.utm->>'origem', 'direto') = p_origem)
  ),
  ped as (
    select o.*, coalesce(p.utm->>'origem', 'direto') as origem
    from academy_orders o left join academy_profiles p on p.id = o.user_id
    where o.criado_em >= p_desde and o.criado_em < p_ate
      and (p_curso is null or o.course_id = p_curso)
      and (p_origem is null or coalesce(p.utm->>'origem', 'direto') = p_origem)
  ),
  vendidos as (select * from ped where status in ('pago', 'reembolsado') and total > 0)
  select jsonb_build_object(
    'visitantes',      (select count(distinct visitante) from ev),
    'cadastros',       (select count(*) from cad),
    'compradores',     (select count(distinct user_id) from ped where status = 'pago' and total > 0),
    'pedidos_pagos',   (select count(*) from ped where status = 'pago' and total > 0),
    'faturamento',     (select coalesce(sum(total), 0) from ped where status = 'pago'),
    'com_oferta',      (select count(*) from ped where status = 'pago' and total > 0 and com_oferta_extra),
    'gratuitos',       (select count(*) from ped where status = 'pago' and total = 0),
    'reembolsos',      (select count(*) from ped where status = 'reembolsado'),
    'reembolsos_valor',(select coalesce(sum(total), 0) from ped where status = 'reembolsado'),
    'vendidos',        (select count(*) from vendidos),
    'pendentes',       (select count(*) from ped where status = 'pendente' and forma_pagamento is not null),
    'pendentes_valor', (select coalesce(sum(total), 0) from ped where status = 'pendente' and forma_pagamento is not null),
    'por_origem', coalesce((
      select jsonb_agg(x order by x.faturamento desc, x.cadastros desc) from (
        select o.origem,
               (select count(distinct visitante) from ev where coalesce(ev.utm->>'origem', 'direto') = o.origem) as visitantes,
               (select count(*) from cad where coalesce(cad.utm->>'origem', 'direto') = o.origem) as cadastros,
               (select count(distinct user_id) from ped where ped.origem = o.origem and status = 'pago' and total > 0) as compradores,
               (select count(*) from ped where ped.origem = o.origem and status = 'pago' and total > 0) as pedidos,
               (select coalesce(sum(total), 0) from ped where ped.origem = o.origem and status = 'pago') as faturamento
        from (
          select coalesce(utm->>'origem', 'direto') as origem from ev
          union select coalesce(utm->>'origem', 'direto') from cad
          union select origem from ped
        ) o
      ) x
    ), '[]'::jsonb),
    'origens', coalesce((
      select jsonb_agg(distinct o) from (
        select coalesce(utm->>'origem', 'direto') as o from academy_profiles where role = 'aluno'
        union select coalesce(utm->>'origem', 'direto') from academy_events
      ) t
    ), '[]'::jsonb),
    -- Onde os alunos abandonam: por aula do curso escolhido (todos os tempos)
    'aulas', case when p_curso is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'titulo', l.titulo, 'modulo', m.titulo,
               'abriram', (select count(distinct e.user_id) from academy_events e
                           where e.tipo = 'aula' and e.lesson_id = l.id and e.user_id in (select user_id from academy_enrollments where course_id = p_curso and ativo)),
               'concluiram', (select count(*) from academy_lesson_progress lp
                              where lp.lesson_id = l.id and lp.concluida and lp.user_id in (select user_id from academy_enrollments where course_id = p_curso and ativo))
             ) order by m.ordem, l.ordem)
      from academy_lessons l join academy_modules m on m.id = l.module_id
      where m.course_id = p_curso
    ), '[]'::jsonb) end,
    'matriculados', case when p_curso is null then null
                    else (select count(*) from academy_enrollments where course_id = p_curso and ativo) end
  ) into r;
  return r;
end $$;
grant execute on function public.academy_metricas(timestamptz, timestamptz, uuid, text) to authenticated;

-- ── 4. Leads: uma linha por pessoa cadastrada ──────────────────────
create or replace function public.academy_leads()
returns table (id uuid, nome text, email text, whatsapp text, criado_em timestamptz, marketing boolean,
               origem text, campanha text, cursos text, pedidos int, total numeric, ultimo_acesso timestamptz)
language sql stable security definer set search_path = public as $$
  -- Só o admin recebe linhas (para os outros a lista volta vazia)
  select p.id, p.nome, p.email, p.whatsapp, p.criado_em, p.consentimento_marketing,
         coalesce(p.utm->>'origem', 'direto'), p.utm->>'campanha',
         (select string_agg(c.titulo, ', ' order by c.titulo) from academy_enrollments e join academy_courses c on c.id = e.course_id
           where e.user_id = p.id and e.ativo),
         (select count(*)::int from academy_orders o where o.user_id = p.id and o.status = 'pago' and o.total > 0),
         (select coalesce(sum(o.total), 0) from academy_orders o where o.user_id = p.id and o.status = 'pago'),
         (select max(lp.atualizado_em) from academy_lesson_progress lp where lp.user_id = p.id)
  from academy_profiles p
  where p.role = 'aluno' and public.academy_eh_admin()
  order by p.criado_em desc;
$$;
grant execute on function public.academy_leads() to authenticated;
