-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — leitura para o admin (Visão geral e Comunidade)
-- Rodar no SQL Editor (depois do 010). Pode rodar de novo sem erro.
-- O admin só LÊ estes dados; não altera progresso, avaliação nem perfil de ninguém.
-- (Comentários das aulas o admin já lê desde o 007.)
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "admin: perfis ver"      on public.academy_profiles;
drop policy if exists "admin: progresso ver"   on public.academy_lesson_progress;
drop policy if exists "admin: avaliações ver"  on public.academy_course_reviews;
drop policy if exists "admin: matrículas ver"  on public.academy_enrollments;

create policy "admin: perfis ver"     on public.academy_profiles        for select using (public.academy_eh_admin());
create policy "admin: progresso ver"  on public.academy_lesson_progress for select using (public.academy_eh_admin());
create policy "admin: avaliações ver" on public.academy_course_reviews  for select using (public.academy_eh_admin());
create policy "admin: matrículas ver" on public.academy_enrollments     for select using (public.academy_eh_admin());
