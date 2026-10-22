-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — esconder a grade do curso de quem não comprou (rodar depois do 019)
-- Pode rodar de novo sem erro.
--
-- Antes: qualquer pessoa lia pela API os nomes de todos os módulos e aulas dos cursos publicados
-- (dava para copiar a estrutura e estudar por fora).
-- Agora:
--   • Módulos: só admin e quem tem matrícula ativa no curso.
--   • Aulas: só quem pode assistir (comprou, aula de amostra para quem está logado, ou admin).
--   • Vitrine e página de vendas recebem só NÚMEROS (módulos, aulas, duração) e a aula de amostra,
--     pela função academy_resumo_cursos().
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "módulos: publicados" on public.academy_modules;
drop policy if exists "módulos: matriculados" on public.academy_modules;
create policy "módulos: matriculados" on public.academy_modules for select using (
  exists (select 1 from public.academy_enrollments e
          where e.course_id = academy_modules.course_id and e.user_id = auth.uid() and e.ativo));
-- (o admin continua vendo tudo pela política "admin: módulos" do 007)

drop policy if exists "aulas: publicadas" on public.academy_lessons;
drop policy if exists "aulas: quem pode assistir" on public.academy_lessons;
create policy "aulas: quem pode assistir" on public.academy_lessons for select using (public.academy_pode_assistir(id));

-- Resumo público por curso publicado: só números + a aula de amostra (1ª aula)
create or replace function public.academy_resumo_cursos()
returns table (course_id uuid, modulos int, aulas int, segundos int, amostra_id uuid, amostra_titulo text, amostra_duracao int)
language sql stable security definer set search_path = public as $$
  select c.id,
         (select count(*)::int from academy_modules m where m.course_id = c.id),
         (select count(*)::int from academy_lessons l join academy_modules m on m.id = l.module_id where m.course_id = c.id),
         (select coalesce(sum(l.duracao_seg), 0)::int from academy_lessons l join academy_modules m on m.id = l.module_id where m.course_id = c.id),
         a.id, a.titulo, a.duracao_seg
  from academy_courses c
  left join lateral (
    select l.id, l.titulo, l.duracao_seg from academy_lessons l join academy_modules m on m.id = l.module_id
    where m.course_id = c.id order by m.ordem, l.ordem limit 1
  ) a on true
  where c.publicado or public.academy_eh_admin();
$$;
grant execute on function public.academy_resumo_cursos() to anon, authenticated;
