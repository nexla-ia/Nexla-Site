-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — correções da revisão de segurança de 27/10/2026 (rodar depois do 028)
-- Pode rodar de novo sem erro.
--
-- 1) Perfil: o aluno só altera nome, WhatsApp, consentimento de marketing e a origem (UTM).
--    Antes dava para trocar o e-mail do perfil (usado nos e-mails do n8n e nos leads) e a data de cadastro.
-- 2) Aula concluída só depois de assistir: o banco soma o tempo assistido a partir das posições que o
--    player grava (no máximo 2,1× o tempo real, para quem assiste acelerado, e 2 min por gravação —
--    assim não adianta abrir a aula, voltar no dia seguinte e pular para o fim) e só aceita "concluída"
--    com pelo menos 70% da duração cadastrada da aula. Aula sem vídeo ou sem duração não é conferida.
--    Antes dava para marcar todas as aulas na hora e tirar o certificado sem assistir.
-- 3) Amostra e aula gratuita só valem em curso publicado (rascunho fica fechado; quem comprou continua vendo).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Perfil ───────────────────────────────────────────────────────
revoke update on public.academy_profiles from anon, authenticated;
grant update (nome, whatsapp, consentimento_marketing, utm) on public.academy_profiles to authenticated;

-- ── 2. Tempo assistido ──────────────────────────────────────────────
alter table public.academy_lesson_progress add column if not exists assistido_seg int not null default 0;

create or replace function public.academy_progresso_assistido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dur    int;
  v_video  text;
  v_avanco int;
begin
  -- O tempo assistido é calculado só aqui (o valor mandado pelo navegador é ignorado)
  if tg_op = 'INSERT' then
    new.assistido_seg := 0;
  else
    new.assistido_seg := old.assistido_seg;
    v_avanco := new.posicao_seg - old.posicao_seg;
    if v_avanco > 0 then
      new.assistido_seg := old.assistido_seg
        + least(v_avanco, ceil(extract(epoch from (now() - old.atualizado_em)) * 2.1)::int, 120);
    end if;
  end if;

  -- Marcar como concluída exige ter assistido.
  -- O site marca com "upsert": num INSERT de uma linha que já existe, quem confere é o UPDATE logo em seguida
  -- (aqui o tempo assistido ainda estaria zerado).
  if new.concluida and (tg_op = 'INSERT' or not old.concluida) and not public.academy_eh_admin()
     and not (tg_op = 'INSERT' and exists (
       select 1 from academy_lesson_progress p where p.user_id = new.user_id and p.lesson_id = new.lesson_id)) then
    select duracao_seg, nullif(btrim(video_id), '') into v_dur, v_video from academy_lessons where id = new.lesson_id;
    if v_video is not null and coalesce(v_dur, 0) > 0 and new.assistido_seg < v_dur * 0.7 then
      raise exception 'assista_aula';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists academy_progresso_assistido on public.academy_lesson_progress;
create trigger academy_progresso_assistido before insert or update on public.academy_lesson_progress
  for each row execute function public.academy_progresso_assistido();

-- ── 3. Amostra e aula gratuita só em curso publicado ────────────────
create or replace function public.academy_eh_amostra(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_lessons l
    join academy_modules m on m.id = l.module_id
    join academy_courses c on c.id = m.course_id and c.publicado
    where l.id = p_lesson
  ) and p_lesson = (
    select l.id from academy_lessons l
    join academy_modules m on m.id = l.module_id
    where m.course_id = (select m2.course_id from academy_lessons l2 join academy_modules m2 on m2.id = l2.module_id where l2.id = p_lesson)
    order by m.ordem, l.ordem
    limit 1
  );
$$;

create or replace function public.academy_pode_assistir(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.academy_eh_admin()
    or (auth.uid() is not null and public.academy_dispositivo_ok() and (
      public.academy_eh_amostra(p_lesson)
      or exists (
        select 1 from academy_lessons l
        join academy_modules m on m.id = l.module_id
        join academy_courses c on c.id = m.course_id
        left join academy_enrollments e on e.course_id = m.course_id and e.user_id = auth.uid() and e.ativo
        where l.id = p_lesson and ((l.gratuita and c.publicado) or e.user_id is not null)
      )));
$$;
