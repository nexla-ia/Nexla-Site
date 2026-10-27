-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — contas para o lançamento (rodar UMA vez, depois do 027)
--
-- ATENÇÃO: apaga de vez, não tem como desfazer.
--
--   • adm.nexla@gmail.com vira o admin da Academy (cria o perfil se não existir).
--   • Todas as OUTRAS contas perdem tudo da Academy (perfil, progresso, comentários, avaliações,
--     certificados, matrículas, pedidos de teste, sessão e visitas).
--   • O LOGIN dessas contas também é apagado, MENOS quando ele é usado pelo outro sistema da Nexla
--     neste mesmo Supabase:
--       – papel diferente de STUDENT em public.profiles (ex.: adm@nexla.com.br é ADMIN lá), ou
--       – alguma tabela do outro sistema aponta para o perfil dessa pessoa.
--     Nesses casos o login fica, só sem nada da Academy.
-- No fim, mostra a lista de logins que sobraram.
-- ═══════════════════════════════════════════════════════════════════
do $$
declare
  v_admin uuid;
  u       record;
  r       record;
  v_refs  int;
  n       int;
begin
  select id into v_admin from auth.users where lower(email) = 'adm.nexla@gmail.com';
  if v_admin is null then raise exception 'Login adm.nexla@gmail.com não encontrado: nada foi alterado.'; end if;

  -- 1) adm.nexla@gmail.com é o admin da Academy
  insert into public.academy_profiles (id, nome, email, role)
  values (v_admin, 'Nexla', 'adm.nexla@gmail.com', 'admin')
  on conflict (id) do update set role = 'admin';

  -- 2) As outras contas
  for u in
    select au.id, au.email, pr.role as papel_fora
    from auth.users au
    left join public.profiles pr on pr.id = au.id
    where au.id <> v_admin
  loop
    -- Dados da Academy (sempre)
    delete from public.academy_orders          where user_id = u.id;
    delete from public.academy_lesson_comments where user_id = u.id;
    delete from public.academy_lesson_progress where user_id = u.id;
    delete from public.academy_course_reviews  where user_id = u.id;
    delete from public.academy_certificates    where user_id = u.id;
    delete from public.academy_enrollments     where user_id = u.id;
    delete from public.academy_sessoes         where user_id = u.id;
    delete from public.academy_events          where user_id = u.id;
    delete from public.academy_profiles        where id = u.id;

    -- O outro sistema usa esse login? (papel diferente de aluno ou dados dele apontando para o perfil)
    v_refs := 0;
    for r in
      select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass
    loop
      execute format('select count(*) from %s where %I = $1', r.tabela, r.coluna) into n using u.id;
      v_refs := v_refs + n;
    end loop;

    if coalesce(u.papel_fora, 'STUDENT') <> 'STUDENT' or v_refs > 0 then
      continue; -- login mantido
    end if;

    delete from public.profiles where id = u.id;
    delete from auth.users      where id = u.id;
  end loop;
end $$;

-- Quem sobrou
select u.email,
       coalesce(ap.role, '—') as papel_na_academy,
       coalesce(pr.role, '—') as papel_no_outro_sistema
from auth.users u
left join public.academy_profiles ap on ap.id = u.id
left join public.profiles pr on pr.id = u.id
order by u.email;
