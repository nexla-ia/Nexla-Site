-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — painel admin (conteúdo) + materiais para baixar
-- Rodar no SQL Editor (depois do 001). Pode rodar de novo sem erro.
--
-- Depois de rodar, transforme a SUA conta em admin (troque o e-mail):
--   update public.academy_profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'seu-email@nexla.com.br');
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.academy_eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from academy_profiles where id = auth.uid() and role = 'admin');
$$;

-- ── Admin edita todo o conteúdo (inclusive cursos em rascunho) ──────
drop policy if exists "admin: cursos"  on public.academy_courses;
drop policy if exists "admin: módulos" on public.academy_modules;
drop policy if exists "admin: aulas"   on public.academy_lessons;
create policy "admin: cursos"  on public.academy_courses for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());
create policy "admin: módulos" on public.academy_modules for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());
create policy "admin: aulas"   on public.academy_lessons for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());

-- Admin assiste a qualquer aula (para revisar o conteúdo)
create or replace function public.academy_pode_assistir(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.academy_eh_admin() or exists (
    select 1 from academy_lessons l
    join academy_modules m on m.id = l.module_id
    left join academy_enrollments e on e.course_id = m.course_id and e.user_id = auth.uid() and e.ativo
    where l.id = p_lesson and (l.gratuita or e.user_id is not null)
  );
$$;

-- ── Materiais para baixar (planilhas, PDFs) ─────────────────────────
create table if not exists public.academy_lesson_materials (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.academy_lessons(id) on delete cascade,
  nome       text not null,
  arquivo    text not null unique,   -- caminho no bucket academy-materiais
  tamanho    bigint,
  criado_em  timestamptz not null default now()
);
create index if not exists academy_materials_lesson_idx on public.academy_lesson_materials(lesson_id);

alter table public.academy_lesson_materials enable row level security;
drop policy if exists "materiais: ver"   on public.academy_lesson_materials;
drop policy if exists "admin: materiais" on public.academy_lesson_materials;
create policy "materiais: ver"   on public.academy_lesson_materials for select using (public.academy_pode_assistir(lesson_id));
create policy "admin: materiais" on public.academy_lesson_materials for all using (public.academy_eh_admin()) with check (public.academy_eh_admin());

-- Bucket privado: o aluno só baixa por link temporário, e só se puder assistir à aula
insert into storage.buckets (id, name, public, file_size_limit)
values ('academy-materiais', 'academy-materiais', false, 52428800)  -- até 50 MB por arquivo
on conflict (id) do nothing;

drop policy if exists "academy materiais: baixar"  on storage.objects;
drop policy if exists "academy materiais: admin"   on storage.objects;
create policy "academy materiais: baixar" on storage.objects for select using (
  bucket_id = 'academy-materiais'
  and (public.academy_eh_admin() or exists (
    select 1 from public.academy_lesson_materials m
    where m.arquivo = storage.objects.name and public.academy_pode_assistir(m.lesson_id))));
create policy "academy materiais: admin" on storage.objects for all
  using (bucket_id = 'academy-materiais' and public.academy_eh_admin())
  with check (bucket_id = 'academy-materiais' and public.academy_eh_admin());
