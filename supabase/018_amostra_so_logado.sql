-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — correção do QA de 22/10/2026 (rodar depois do 017). Pode rodar de novo sem erro.
--
-- Problema: a aula de amostra (e as aulas "gratuita") liberavam comentários e materiais também
-- para quem NÃO está logado, direto pela API — dava para ler os comentários com o nome dos alunos.
-- Correção: amostra e aula grátis exigem estar logado (qualquer conta). Matrícula continua igual.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.academy_pode_assistir(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.academy_eh_admin()
    or (auth.uid() is not null and public.academy_dispositivo_ok() and (
      public.academy_eh_amostra(p_lesson)
      or exists (
        select 1 from academy_lessons l
        join academy_modules m on m.id = l.module_id
        left join academy_enrollments e on e.course_id = m.course_id and e.user_id = auth.uid() and e.ativo
        where l.id = p_lesson and (l.gratuita or e.user_id is not null)
      )));
$$;
