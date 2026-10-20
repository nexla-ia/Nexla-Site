-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — estrutura inicial (cursos, aulas, matrículas, progresso)
-- Rodar no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem erro.
--
-- As tabelas usam o prefixo academy_ para não conflitar com outros sistemas
-- que já usem este mesmo projeto Supabase.
-- Regra de acesso (briefing): quem decide se o aluno vê um curso é só a tabela
-- academy_enrollments. Aulas marcadas como gratuitas ficam liberadas para qualquer conta.
-- ═══════════════════════════════════════════════════════════════════

-- ── Perfis (1 por usuário do Auth) ──────────────────────────────────
create table if not exists public.academy_profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  nome                     text,
  whatsapp                 text,
  role                     text not null default 'aluno' check (role in ('aluno', 'admin')),
  consentimento_marketing  boolean not null default false,
  utm                      jsonb,
  criado_em                timestamptz not null default now()
);

-- ── Conteúdo ────────────────────────────────────────────────────────
create table if not exists public.academy_courses (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  titulo     text not null,
  subtitulo  text,
  capa       text,
  publicado  boolean not null default false,
  ordem      int not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists public.academy_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.academy_courses(id) on delete cascade,
  titulo     text not null,
  ordem      int not null default 0
);

create table if not exists public.academy_lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.academy_modules(id) on delete cascade,
  titulo       text not null,
  descricao    text,
  ordem        int not null default 0,
  duracao_seg  int not null default 0,
  gratuita     boolean not null default false,
  video_id     text            -- id do vídeo no Bunny Stream (preenchido depois)
);

-- ── Matrículas e progresso ──────────────────────────────────────────
create table if not exists public.academy_enrollments (
  user_id    uuid not null references auth.users(id) on delete cascade,
  course_id  uuid not null references public.academy_courses(id) on delete cascade,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.academy_lesson_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  lesson_id      uuid not null references public.academy_lessons(id) on delete cascade,
  concluida      boolean not null default false,
  posicao_seg    int not null default 0,
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists academy_modules_course_idx on public.academy_modules(course_id);
create index if not exists academy_lessons_module_idx on public.academy_lessons(module_id);

-- ── Perfil criado automaticamente no cadastro ───────────────────────
create or replace function public.academy_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.academy_profiles (id, nome, whatsapp, consentimento_marketing)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'whatsapp',
    coalesce((new.raw_user_meta_data->>'consentimento_marketing')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists academy_on_auth_user_created on auth.users;
create trigger academy_on_auth_user_created
  after insert on auth.users
  for each row execute function public.academy_novo_usuario();

-- ── Segurança (RLS): cada aluno só vê e altera o que é dele ─────────
alter table public.academy_profiles        enable row level security;
alter table public.academy_courses         enable row level security;
alter table public.academy_modules         enable row level security;
alter table public.academy_lessons         enable row level security;
alter table public.academy_enrollments     enable row level security;
alter table public.academy_lesson_progress enable row level security;

drop policy if exists "perfil: ler o próprio"      on public.academy_profiles;
drop policy if exists "perfil: editar o próprio"   on public.academy_profiles;
create policy "perfil: ler o próprio"    on public.academy_profiles for select using (id = auth.uid());
create policy "perfil: editar o próprio" on public.academy_profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'aluno');

-- Vitrine pública: cursos publicados, seus módulos e a lista de aulas (sem vídeo liberado — o link do vídeo virá de uma Edge Function)
drop policy if exists "cursos: publicados"  on public.academy_courses;
drop policy if exists "módulos: publicados" on public.academy_modules;
drop policy if exists "aulas: publicadas"   on public.academy_lessons;
create policy "cursos: publicados" on public.academy_courses for select using (publicado);
create policy "módulos: publicados" on public.academy_modules for select using (
  exists (select 1 from public.academy_courses c where c.id = course_id and c.publicado));
create policy "aulas: publicadas" on public.academy_lessons for select using (
  exists (select 1 from public.academy_modules m join public.academy_courses c on c.id = m.course_id
          where m.id = module_id and c.publicado));

drop policy if exists "matrículas: ver as próprias" on public.academy_enrollments;
create policy "matrículas: ver as próprias" on public.academy_enrollments for select using (user_id = auth.uid());

-- Progresso: só nas aulas de cursos em que o aluno tem matrícula ativa, ou em aulas gratuitas
create or replace function public.academy_pode_assistir(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_lessons l
    join academy_modules m on m.id = l.module_id
    left join academy_enrollments e on e.course_id = m.course_id and e.user_id = auth.uid() and e.ativo
    where l.id = p_lesson and (l.gratuita or e.user_id is not null)
  );
$$;

drop policy if exists "progresso: ver o próprio"     on public.academy_lesson_progress;
drop policy if exists "progresso: criar o próprio"   on public.academy_lesson_progress;
drop policy if exists "progresso: editar o próprio"  on public.academy_lesson_progress;
create policy "progresso: ver o próprio"    on public.academy_lesson_progress for select using (user_id = auth.uid());
create policy "progresso: criar o próprio"  on public.academy_lesson_progress for insert
  with check (user_id = auth.uid() and public.academy_pode_assistir(lesson_id));
create policy "progresso: editar o próprio" on public.academy_lesson_progress for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.academy_pode_assistir(lesson_id));

-- ── Cursos de exemplo (conteúdo provisório, pode editar depois) ─────
insert into public.academy_courses (slug, titulo, subtitulo, publicado, ordem) values
  ('escala-5x2', 'IA na prática para a escala 5×2', 'Automação e atendimento com IA para atravessar a mudança sem contratar', true, 1),
  ('planilha-no-automatico', 'Planilha no Automático', 'Planilhas e relatórios que se atualizam sozinhos', true, 2)
on conflict (slug) do nothing;

do $$
declare
  c5 uuid := (select id from public.academy_courses where slug = 'escala-5x2');
  cp uuid := (select id from public.academy_courses where slug = 'planilha-no-automatico');
  m uuid;
begin
  if not exists (select 1 from public.academy_modules where course_id = c5) then
    insert into public.academy_modules (course_id, titulo, ordem) values (c5, 'Mapeie as horas que vão faltar', 1) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg, gratuita) values
      (m, 'O que muda com a escala 5×2', 1, 540, true),
      (m, 'Calculando as horas que sua empresa vai perder', 2, 720, false),
      (m, 'Onde está o trabalho repetitivo', 3, 660, false);
    insert into public.academy_modules (course_id, titulo, ordem) values (c5, 'Atendimento com IA no WhatsApp', 2) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Como funciona um agente de atendimento', 1, 600),
      (m, 'Montando o agente com o jeito da sua empresa', 2, 1080),
      (m, 'Agendamentos e confirmações automáticas', 3, 900);
    insert into public.academy_modules (course_id, titulo, ordem) values (c5, 'Rotinas de escritório no automático', 3) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Planilhas que se atualizam sozinhas', 1, 840),
      (m, 'Relatórios prontos no WhatsApp', 2, 780),
      (m, 'IA lendo documentos por você', 3, 720);
    insert into public.academy_modules (course_id, titulo, ordem) values (c5, 'Seu plano de transição para a 5×2', 4) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Reorganizando escalas e processos', 1, 660),
      (m, 'Seu plano de 30 dias', 2, 600);
  end if;

  if not exists (select 1 from public.academy_modules where course_id = cp) then
    insert into public.academy_modules (course_id, titulo, ordem) values (cp, 'Primeiros passos', 1) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg, gratuita) values
      (m, 'O que dá para automatizar numa planilha', 1, 480, true),
      (m, 'Organizando os dados do jeito certo', 2, 720, false);
    insert into public.academy_modules (course_id, titulo, ordem) values (cp, 'Automações na prática', 2) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Fórmulas que trabalham por você', 1, 900),
      (m, 'Importando dados automaticamente', 2, 840),
      (m, 'Relatório semanal no automático', 3, 780);
    insert into public.academy_modules (course_id, titulo, ordem) values (cp, 'Bônus: modelos prontos', 3) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Como usar os modelos', 1, 420);
  end if;
end $$;
