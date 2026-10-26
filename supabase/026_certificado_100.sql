-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — certificado só com 100% do curso (rodar depois do 025)
-- Pode rodar de novo sem erro.
--
-- Antes o certificado saía com 90% das aulas concluídas; agora só com todas.
-- Certificados que já foram emitidos continuam válidos.
-- ═══════════════════════════════════════════════════════════════════

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
  if v_total = 0 or v_feitas < v_total then raise exception 'incompleto'; end if;   -- só com todas as aulas

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
