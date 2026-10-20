-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — acesso de teste
-- 1) Antes: Authentication → Users → Add user → Create new user
--    E-mail: teste@nexla.com.br · senha à sua escolha · marque "Auto Confirm User"
-- 2) Depois rode este arquivo no SQL Editor.
-- Matricula o usuário nos 2 cursos e deixa um progresso de exemplo:
--   • Escala 5×2: 10 de 11 aulas (91%) → certificado liberado
--   • Planilha no Automático: 2 de 6 aulas (33%) → certificado bloqueado
-- Pode rodar de novo para "zerar" o teste.
-- ═══════════════════════════════════════════════════════════════════
do $$
declare
  u  uuid := (select id from auth.users where email = 'teste@nexla.com.br');
  c5 uuid := (select id from public.academy_courses where slug = 'escala-5x2');
  cp uuid := (select id from public.academy_courses where slug = 'planilha-no-automatico');
begin
  if u is null then
    raise exception 'Crie primeiro o usuário teste@nexla.com.br em Authentication → Users → Add user';
  end if;

  insert into public.academy_profiles (id, nome) values (u, 'Aluno Teste')
  on conflict (id) do update set nome = coalesce(public.academy_profiles.nome, 'Aluno Teste');

  insert into public.academy_enrollments (user_id, course_id) values (u, c5), (u, cp)
  on conflict (user_id, course_id) do update set ativo = true;

  delete from public.academy_lesson_progress where user_id = u;

  -- Escala 5×2: todas as aulas menos a última
  insert into public.academy_lesson_progress (user_id, lesson_id, concluida, atualizado_em)
  select u, l.id, true, now() - ((row_number() over (order by m.ordem desc, l.ordem desc)) * interval '1 hour')
  from public.academy_lessons l join public.academy_modules m on m.id = l.module_id
  where m.course_id = c5
  order by m.ordem, l.ordem
  limit 10;

  -- Planilha no Automático: as 2 primeiras aulas
  insert into public.academy_lesson_progress (user_id, lesson_id, concluida, atualizado_em)
  select u, l.id, true, now() - interval '2 days'
  from public.academy_lessons l join public.academy_modules m on m.id = l.module_id
  where m.course_id = cp
  order by m.ordem, l.ordem
  limit 2;
end $$;
