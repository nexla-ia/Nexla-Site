-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — comunidade: comentários e respostas em cada aula
-- Rodar no SQL Editor (depois do 001). Pode rodar de novo sem erro.
--
-- Regras:
--   • Vê e comenta quem pode assistir à aula (matrícula ativa ou aula grátis).
--   • Nome do autor e selo de instrutor são preenchidos pelo banco (o aluno não consegue falsificar).
--   • Só quem escreveu pode apagar o próprio comentário (nem admin apaga o de outra pessoa).
--   • Respostas: 1 nível (resposta de comentário), sempre na mesma aula.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.academy_lesson_comments (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.academy_lessons(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  parent_id    uuid references public.academy_lesson_comments(id) on delete cascade,
  texto        text not null check (char_length(btrim(texto)) between 1 and 2000),
  autor_nome   text,
  autor_admin  boolean not null default false,
  criado_em    timestamptz not null default now()
);
create index if not exists academy_comments_lesson_idx on public.academy_lesson_comments(lesson_id, criado_em);

create or replace function public.academy_eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from academy_profiles where id = auth.uid() and role = 'admin');
$$;

-- Preenche autor e valida a resposta antes de gravar
create or replace function public.academy_comentario_antes()
returns trigger language plpgsql security definer set search_path = public as $$
declare pai record;
begin
  select coalesce(nullif(btrim(p.nome), ''), 'Aluno'), p.role = 'admin'
    into new.autor_nome, new.autor_admin
    from academy_profiles p where p.id = new.user_id;
  new.autor_nome  := coalesce(new.autor_nome, 'Aluno');
  new.autor_admin := coalesce(new.autor_admin, false);
  new.texto       := btrim(new.texto);
  new.criado_em   := now();

  if new.parent_id is not null then
    select lesson_id, parent_id into pai from academy_lesson_comments where id = new.parent_id;
    if pai is null or pai.lesson_id <> new.lesson_id then
      raise exception 'Resposta precisa ser na mesma aula do comentário';
    end if;
    if pai.parent_id is not null then
      new.parent_id := pai.parent_id;  -- resposta de resposta vira resposta do comentário principal
    end if;
  end if;
  return new;
end $$;

drop trigger if exists academy_comentario_antes on public.academy_lesson_comments;
create trigger academy_comentario_antes
  before insert on public.academy_lesson_comments
  for each row execute function public.academy_comentario_antes();

alter table public.academy_lesson_comments enable row level security;

drop policy if exists "comentários: ver"      on public.academy_lesson_comments;
drop policy if exists "comentários: publicar" on public.academy_lesson_comments;
drop policy if exists "comentários: apagar"   on public.academy_lesson_comments;
create policy "comentários: ver" on public.academy_lesson_comments for select
  using (public.academy_pode_assistir(lesson_id));
create policy "comentários: publicar" on public.academy_lesson_comments for insert
  with check (user_id = auth.uid() and public.academy_pode_assistir(lesson_id));
create policy "comentários: apagar" on public.academy_lesson_comments for delete
  using (user_id = auth.uid());

-- Comentários de exemplo na 1ª aula da escala 5×2 (só se o usuário de teste existir e ainda não houver comentários)
do $$
declare
  u  uuid := (select id from auth.users where email = 'teste@nexla.com.br');
  l  uuid := (select l.id from public.academy_lessons l
              join public.academy_modules m on m.id = l.module_id
              join public.academy_courses c on c.id = m.course_id
              where c.slug = 'escala-5x2' order by m.ordem, l.ordem limit 1);
  c1 uuid;
begin
  if u is null or l is null or exists (select 1 from public.academy_lesson_comments where lesson_id = l) then return; end if;
  insert into public.academy_lesson_comments (lesson_id, user_id, texto)
    values (l, u, 'Fiz a conta aqui na loja: com 6 funcionários são 24 horas a menos por semana. Ajudou muito a enxergar o tamanho do problema.')
    returning id into c1;
  insert into public.academy_lesson_comments (lesson_id, user_id, parent_id, texto)
    values (l, u, c1, 'Alguém já começou pelo atendimento no WhatsApp? Quero saber por onde vale mais a pena começar.');
end $$;
