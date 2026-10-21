-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — liberar acesso manualmente (admin → curso → Alunos)
-- Rodar no SQL Editor (depois do 012). Pode rodar de novo sem erro.
--
-- Uso: quem comprou fora da plataforma (ex.: link de pagamento do Asaas, Fase 0).
--   • E-mail com conta  → matrícula ativa na hora.
--   • E-mail sem conta  → convite guardado; o curso libera sozinho quando a pessoa
--                         se cadastrar com esse e-mail.
--   • Remover acesso    → matrícula fica inativa (o progresso é mantido).
-- Tudo passa por funções que conferem se quem chama é admin.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.academy_convites (
  email      text not null,
  course_id  uuid not null references public.academy_courses(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (email, course_id)
);
alter table public.academy_convites enable row level security;
drop policy if exists "admin: convites" on public.academy_convites;
create policy "admin: convites" on public.academy_convites for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());

-- Cadastro novo: cria o perfil (como antes) e transforma convites desse e-mail em matrículas
create or replace function public.academy_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.academy_profiles (id, nome, whatsapp, consentimento_marketing)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'whatsapp',
    coalesce((new.raw_user_meta_data->>'consentimento_marketing')::boolean, false)
  )
  on conflict (id) do nothing;

  insert into public.academy_enrollments (user_id, course_id)
  select new.id, c.course_id from public.academy_convites c where c.email = lower(btrim(new.email))
  on conflict (user_id, course_id) do update set ativo = true;
  delete from public.academy_convites where email = lower(btrim(new.email));
  return new;
end $$;

-- Liberar acesso por e-mail. Retorna 'matriculado' ou 'convite'.
create or replace function public.academy_admin_liberar(p_email text, p_course uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(p_email));
  v_user  uuid;
begin
  if not public.academy_eh_admin() then raise exception 'Apenas admin'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;

  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    insert into academy_convites (email, course_id) values (v_email, p_course) on conflict do nothing;
    return 'convite';
  end if;

  insert into academy_profiles (id) values (v_user) on conflict (id) do nothing;
  insert into academy_enrollments (user_id, course_id) values (v_user, p_course)
  on conflict (user_id, course_id) do update set ativo = true;
  return 'matriculado';
end $$;

-- Remover / reativar acesso (mantém o progresso)
create or replace function public.academy_admin_definir_acesso(p_user uuid, p_course uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.academy_eh_admin() then raise exception 'Apenas admin'; end if;
  update academy_enrollments set ativo = p_ativo where user_id = p_user and course_id = p_course;
end $$;

-- Lista de alunos do curso com e-mail e progresso (o e-mail vem do Auth, que o site não lê direto)
create or replace function public.academy_admin_alunos(p_course uuid)
returns table (user_id uuid, nome text, email text, whatsapp text, ativo boolean, desde timestamptz, concluidas int, total int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.academy_eh_admin() then raise exception 'Apenas admin'; end if;
  return query
    with aulas as (
      select l.id from academy_lessons l join academy_modules m on m.id = l.module_id where m.course_id = p_course
    )
    select e.user_id, p.nome, u.email::text, p.whatsapp, e.ativo, e.criado_em,
           (select count(*)::int from academy_lesson_progress lp where lp.user_id = e.user_id and lp.concluida and lp.lesson_id in (select id from aulas)),
           (select count(*)::int from aulas)
    from academy_enrollments e
    join auth.users u on u.id = e.user_id
    left join academy_profiles p on p.id = e.user_id
    where e.course_id = p_course and coalesce(p.role, 'aluno') <> 'admin'
    order by e.ativo desc, e.criado_em desc;
end $$;

revoke execute on function public.academy_admin_liberar(text, uuid)                   from public, anon;
revoke execute on function public.academy_admin_definir_acesso(uuid, uuid, boolean)   from public, anon;
revoke execute on function public.academy_admin_alunos(uuid)                          from public, anon;
grant  execute on function public.academy_admin_liberar(text, uuid)                   to authenticated;
grant  execute on function public.academy_admin_definir_acesso(uuid, uuid, boolean)   to authenticated;
grant  execute on function public.academy_admin_alunos(uuid)                          to authenticated;
