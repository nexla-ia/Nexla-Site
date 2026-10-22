-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — 1 dispositivo por conta (rodar depois do 016). Pode rodar de novo sem erro.
--
-- Regra: cada conta fica conectada em UM dispositivo por vez. Ao entrar em outro, este passa a ser
-- o dispositivo da conta e o anterior é desconectado (o último login vale).
--
-- Como funciona:
--   • Cada navegador tem um identificador próprio (gerado no site) enviado no cabeçalho "x-dispositivo"
--     de toda chamada ao Supabase.
--   • academy_sessoes guarda qual dispositivo é o atual de cada conta.
--   • O site confere a cada 30 s (e ao voltar para a aba); se outro dispositivo assumiu, desconecta.
--   • O BANCO também confere: aulas, materiais, comentários e progresso só respondem para o
--     dispositivo atual (academy_pode_assistir). Admin não tem essa trava.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.academy_sessoes (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  dispositivo    text not null,
  descricao      text,                         -- ex.: "Chrome · Windows" (para mostrar no futuro)
  atualizado_em  timestamptz not null default now()
);
alter table public.academy_sessoes enable row level security;
-- Sem políticas: só as funções abaixo (security definer) leem e gravam.

-- Identificador do dispositivo que fez a chamada (cabeçalho x-dispositivo)
create or replace function public.academy_dispositivo_atual()
returns text language sql stable as $$
  select nullif(btrim(coalesce(current_setting('request.headers', true), '{}')::json->>'x-dispositivo'), '');
$$;

-- 'ok' = este é o dispositivo da conta · 'livre' = conta ainda sem dispositivo · 'outro' = outro dispositivo assumiu
create or replace function public.academy_sessao_status()
returns text language plpgsql stable security definer set search_path = public as $$
declare v_atual text;
begin
  if auth.uid() is null then return 'livre'; end if;
  if public.academy_eh_admin() then return 'ok'; end if;
  select dispositivo into v_atual from academy_sessoes where user_id = auth.uid();
  if v_atual is null then return 'livre'; end if;
  return case when v_atual = public.academy_dispositivo_atual() then 'ok' else 'outro' end;
end $$;

-- Este dispositivo passa a ser o da conta (chamado logo após o login)
create or replace function public.academy_assumir_sessao(p_descricao text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_disp text := public.academy_dispositivo_atual();
begin
  if auth.uid() is null then raise exception 'Não logado'; end if;
  if v_disp is null or length(v_disp) > 80 then raise exception 'Dispositivo inválido'; end if;
  insert into academy_sessoes (user_id, dispositivo, descricao, atualizado_em)
  values (auth.uid(), v_disp, left(p_descricao, 120), now())
  on conflict (user_id) do update set dispositivo = excluded.dispositivo, descricao = excluded.descricao, atualizado_em = now();
end $$;

-- Usado nas regras de acesso: o dispositivo da chamada é o atual da conta?
-- (Sem o cabeçalho, ex.: chamadas internas do Storage, não bloqueia; o site sempre envia.)
create or replace function public.academy_dispositivo_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select public.academy_dispositivo_atual() is null
      or not exists (select 1 from academy_sessoes s where s.user_id = auth.uid() and s.dispositivo <> public.academy_dispositivo_atual());
$$;

-- Acesso ao conteúdo agora também exige o dispositivo atual
create or replace function public.academy_pode_assistir(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.academy_eh_admin()
    or (public.academy_dispositivo_ok() and (
      public.academy_eh_amostra(p_lesson)
      or exists (
        select 1 from academy_lessons l
        join academy_modules m on m.id = l.module_id
        left join academy_enrollments e on e.course_id = m.course_id and e.user_id = auth.uid() and e.ativo
        where l.id = p_lesson and (l.gratuita or e.user_id is not null)
      )));
$$;

revoke execute on function public.academy_assumir_sessao(text) from public, anon;
revoke execute on function public.academy_sessao_status()      from public, anon;
grant  execute on function public.academy_assumir_sessao(text) to authenticated;
grant  execute on function public.academy_sessao_status()      to authenticated;
