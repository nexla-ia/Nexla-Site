-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — página de vendas do curso (rodar depois do 020)
-- Pode rodar de novo sem erro.
--
--   • ferramentas: o que o aluno vai usar no curso (ex.: WhatsApp, n8n, ChatGPT)
--   • instrutor_bio: apresentação curta de quem dá o curso
--   • academy_mais_vendidos(): quantas matrículas ativas cada curso publicado tem,
--     para a página do curso recomendar "os mais comprados" (só o número, sem dizer quem comprou)
-- ═══════════════════════════════════════════════════════════════════

alter table public.academy_courses
  add column if not exists ferramentas   text[] not null default '{}',
  add column if not exists instrutor_bio text;

create or replace function public.academy_mais_vendidos()
returns table (course_id uuid, total int)
language sql stable security definer set search_path = public as $$
  select e.course_id, count(*)::int
  from academy_enrollments e
  join academy_courses c on c.id = e.course_id and c.publicado
  where e.ativo
  group by e.course_id;
$$;
grant execute on function public.academy_mais_vendidos() to authenticated;
