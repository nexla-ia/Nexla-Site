-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — a 1ª aula de cada curso é a amostra (rodar depois do 014)
-- Pode rodar de novo sem erro.
--
-- Regra nova: quem NÃO comprou vê a página do curso com só o 1º vídeo (amostra).
-- Quem comprou (matrícula ativa, criada pelo pagamento) vê o curso completo.
-- A 1ª aula = 1º módulo (menor ordem) → 1ª aula dele (menor ordem).
-- Aulas marcadas como "gratuita" continuam liberadas também (compatibilidade).
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.academy_eh_amostra(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_lesson = (
    select l.id from academy_lessons l
    join academy_modules m on m.id = l.module_id
    where m.course_id = (select m2.course_id from academy_lessons l2 join academy_modules m2 on m2.id = l2.module_id where l2.id = p_lesson)
    order by m.ordem, l.ordem
    limit 1
  );
$$;

create or replace function public.academy_pode_assistir(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.academy_eh_admin()
    or public.academy_eh_amostra(p_lesson)
    or exists (
      select 1 from academy_lessons l
      join academy_modules m on m.id = l.module_id
      left join academy_enrollments e on e.course_id = m.course_id and e.user_id = auth.uid() and e.ativo
      where l.id = p_lesson and (l.gratuita or e.user_id is not null)
    );
$$;
