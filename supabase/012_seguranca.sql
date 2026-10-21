-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — reforços de segurança (revisão de 21/10/2026)
-- Rodar no SQL Editor (depois do 011). Pode rodar de novo sem erro.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Datas sempre do servidor. Antes, o navegador mandava "atualizado_em" e dava para
--    forjar a data de conclusão (que vai impressa no certificado).
create or replace function public.academy_data_servidor()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists academy_progresso_data on public.academy_lesson_progress;
create trigger academy_progresso_data before insert or update on public.academy_lesson_progress
  for each row execute function public.academy_data_servidor();

drop trigger if exists academy_avaliacao_data on public.academy_course_reviews;
create trigger academy_avaliacao_data before insert or update on public.academy_course_reviews
  for each row execute function public.academy_data_servidor();

-- 2) Avaliação só de quem concluiu o curso (100% das aulas). Antes bastava estar matriculado.
create or replace function public.academy_concluiu(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select count(l.id) > 0 and count(l.id) = count(p.lesson_id)
  from academy_lessons l
  join academy_modules m on m.id = l.module_id and m.course_id = p_course
  left join academy_lesson_progress p on p.lesson_id = l.id and p.user_id = auth.uid() and p.concluida;
$$;

drop policy if exists "avaliação: criar a própria"  on public.academy_course_reviews;
drop policy if exists "avaliação: editar a própria" on public.academy_course_reviews;
create policy "avaliação: criar a própria" on public.academy_course_reviews for insert with check (
  user_id = auth.uid() and public.academy_concluiu(course_id)
  and exists (select 1 from public.academy_enrollments e where e.user_id = auth.uid() and e.course_id = academy_course_reviews.course_id and e.ativo));
create policy "avaliação: editar a própria" on public.academy_course_reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.academy_concluiu(course_id));

-- 3) Anti-spam na comunidade: no máximo 5 comentários por minuto por pessoa
create or replace function public.academy_limite_comentarios()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from academy_lesson_comments
      where user_id = new.user_id and criado_em > now() - interval '1 minute') >= 5 then
    raise exception 'Muitos comentários seguidos. Espere um minuto e tente de novo.';
  end if;
  return new;
end $$;

drop trigger if exists academy_comentario_limite on public.academy_lesson_comments;
create trigger academy_comentario_limite before insert on public.academy_lesson_comments
  for each row execute function public.academy_limite_comentarios();

-- 4) O ID do vídeo não precisa ser público: quem não está logado não lê essa coluna.
--    (Quem está logado ainda lê; a proteção de verdade virá dos links assinados do Bunny.)
--    (Tirar só a coluna não funciona se a tabela inteira está liberada: tira a tabela e devolve as colunas.)
revoke select on public.academy_lessons from anon;
grant select (id, module_id, titulo, descricao, ordem, duracao_seg, gratuita) on public.academy_lessons to anon;
