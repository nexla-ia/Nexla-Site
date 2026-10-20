-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — avaliação dos cursos (estrelas + comentário curto)
-- Rodar no SQL Editor (depois do 001). Pode rodar de novo sem erro.
--
-- Regras:
--   • 1 linha por aluno + curso. Só avalia quem tem matrícula ativa no curso.
--   • Se o aluno fechar o pedido no X, grava dispensado = true e o pedido não aparece mais.
--   • A média pública vem da função academy_media_cursos() (só números, sem expor quem avaliou).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.academy_course_reviews (
  user_id        uuid not null references auth.users(id) on delete cascade,
  course_id      uuid not null references public.academy_courses(id) on delete cascade,
  estrelas       int check (estrelas between 1 and 5),
  comentario     text check (comentario is null or char_length(comentario) <= 500),
  dispensado     boolean not null default false,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.academy_course_reviews enable row level security;

drop policy if exists "avaliação: ver a própria"    on public.academy_course_reviews;
drop policy if exists "avaliação: criar a própria"  on public.academy_course_reviews;
drop policy if exists "avaliação: editar a própria" on public.academy_course_reviews;
create policy "avaliação: ver a própria" on public.academy_course_reviews for select using (user_id = auth.uid());
create policy "avaliação: criar a própria" on public.academy_course_reviews for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.academy_enrollments e where e.user_id = auth.uid() and e.course_id = academy_course_reviews.course_id and e.ativo));
create policy "avaliação: editar a própria" on public.academy_course_reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Média e quantidade de avaliações por curso (pública: só os números)
create or replace function public.academy_media_cursos()
returns table (course_id uuid, media numeric, total int)
language sql stable security definer set search_path = public as $$
  select r.course_id, round(avg(r.estrelas)::numeric, 1), count(*)::int
  from academy_course_reviews r
  join academy_courses c on c.id = r.course_id and c.publicado
  where r.estrelas is not null
  group by r.course_id;
$$;
grant execute on function public.academy_media_cursos() to anon, authenticated;
