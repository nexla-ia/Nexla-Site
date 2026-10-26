-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — certificados com validação pública (rodar depois do 023)
-- Pode rodar de novo sem erro.
--
--   • academy_certificates: um certificado por aluno e curso, com código único.
--   • academy_emitir_certificado(curso): o servidor confere se o aluno tem o curso e
--     concluiu pelo menos 90% das aulas; só então registra e devolve o código.
--   • academy_validar_certificado(código): página pública /academy/validar mostra
--     nome, curso, carga horária e data — sem e-mail nem outros dados.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.academy_certificates (
  codigo        text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_id     uuid not null references public.academy_courses(id) on delete cascade,
  nome          text not null,
  curso         text not null,
  carga_h       int  not null,
  concluido_em  timestamptz not null,
  emitido_em    timestamptz not null default now(),
  unique (user_id, course_id)
);
alter table public.academy_certificates enable row level security;

drop policy if exists "certificado: ver os próprios" on public.academy_certificates;
drop policy if exists "admin: certificados ver"      on public.academy_certificates;
create policy "certificado: ver os próprios" on public.academy_certificates for select using (user_id = auth.uid());
create policy "admin: certificados ver"      on public.academy_certificates for select using (public.academy_eh_admin());
-- Ninguém grava direto: só pela função abaixo

create or replace function public.academy_emitir_certificado(p_course uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_total int; v_feitas int; v_ultima timestamptz; v_seg int;
  v_curso record; v_nome text; v_codigo text; r record;
begin
  if v_uid is null then raise exception 'nao_logado'; end if;
  select id, titulo, certificado, carga_horaria_h into v_curso from academy_courses where id = p_course;
  if v_curso.id is null then raise exception 'curso_nao_encontrado'; end if;
  if not coalesce(v_curso.certificado, true) then raise exception 'sem_certificado'; end if;
  if not exists (select 1 from academy_enrollments where user_id = v_uid and course_id = p_course and ativo) then
    raise exception 'sem_matricula';
  end if;

  select count(l.id), count(p.lesson_id), max(p.atualizado_em), coalesce(sum(l.duracao_seg), 0)
    into v_total, v_feitas, v_ultima, v_seg
  from academy_lessons l
  join academy_modules m on m.id = l.module_id and m.course_id = p_course
  left join academy_lesson_progress p on p.lesson_id = l.id and p.user_id = v_uid and p.concluida;
  if v_total = 0 or v_feitas * 100 < v_total * 90 then raise exception 'incompleto'; end if;

  select coalesce(nullif(btrim(nome), ''), email) into v_nome from academy_profiles where id = v_uid;

  -- Código curto e único: NX-XXXX-XXXX (letras A–F e números)
  loop
    v_codigo := upper('NX-' || substr(md5(gen_random_uuid()::text), 1, 4) || '-' || substr(md5(gen_random_uuid()::text), 1, 4));
    exit when not exists (select 1 from academy_certificates where codigo = v_codigo);
  end loop;

  insert into academy_certificates (codigo, user_id, course_id, nome, curso, carga_h, concluido_em)
  values (v_codigo, v_uid, p_course, coalesce(v_nome, 'Aluno'), v_curso.titulo,
          coalesce(v_curso.carga_horaria_h, greatest(1, round(v_seg / 3600.0)::int)), coalesce(v_ultima, now()))
  on conflict (user_id, course_id) do update
    set nome = excluded.nome, curso = excluded.curso, carga_h = excluded.carga_h   -- mantém código e data de emissão
  returning codigo, nome, curso, carga_h, concluido_em, emitido_em into r;

  return to_jsonb(r);
end $$;
grant execute on function public.academy_emitir_certificado(uuid) to authenticated;

-- Validação pública: qualquer pessoa com o código confere se o certificado é verdadeiro
create or replace function public.academy_validar_certificado(p_codigo text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('codigo', codigo, 'nome', nome, 'curso', curso, 'carga_h', carga_h,
                            'concluido_em', concluido_em, 'emitido_em', emitido_em)
  from academy_certificates where codigo = upper(btrim(p_codigo));
$$;
grant execute on function public.academy_validar_certificado(text) to anon, authenticated;
