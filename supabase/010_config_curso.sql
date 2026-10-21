-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — configurações por curso (painel admin → curso → Configurações)
-- Rodar no SQL Editor (depois do 007). Pode rodar de novo sem erro.
-- ═══════════════════════════════════════════════════════════════════

alter table public.academy_courses
  add column if not exists descricao        text,                 -- texto completo "sobre o curso"
  add column if not exists categoria        text,                 -- ex.: Atendimento, Planilhas, Gestão
  add column if not exists nivel            text check (nivel in ('iniciante', 'intermediario', 'avancado')),
  add column if not exists instrutor        text default 'Alisson Amorim',
  add column if not exists aprendizados     text[] not null default '{}',   -- "o que você vai aprender"
  add column if not exists destaque         boolean not null default false, -- aparece primeiro na vitrine
  add column if not exists certificado      boolean not null default true,  -- curso emite certificado?
  add column if not exists carga_horaria_h  int check (carga_horaria_h is null or carga_horaria_h > 0); -- vazio = soma das aulas

-- Admin vê todas as matrículas (para contar alunos por curso no painel)
drop policy if exists "admin: matrículas ver" on public.academy_enrollments;
create policy "admin: matrículas ver" on public.academy_enrollments for select using (public.academy_eh_admin());

-- Fotos de capa: bucket público (qualquer um vê a imagem), só admin envia/troca/apaga
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academy-capas', 'academy-capas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])  -- até 5 MB
on conflict (id) do nothing;

drop policy if exists "academy capas: admin" on storage.objects;
create policy "academy capas: admin" on storage.objects for all
  using (bucket_id = 'academy-capas' and public.academy_eh_admin())
  with check (bucket_id = 'academy-capas' and public.academy_eh_admin());
