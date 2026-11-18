-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — lançamento do curso com pré-venda (rodar depois do 032)
-- Pode rodar de novo sem erro.
--
-- • lancamento_em:   data e hora em que o curso abre. Antes dela o curso aparece como "Em breve".
-- • prevenda:        se dá para comprar antes da data.
-- • prevenda_preco:  preço especial da pré-venda (vazio = preço normal). Vale até a data.
-- • antecipado_dias: quem já comprou assiste N dias antes da data (0 = só na data).
-- Na data, o curso abre sozinho para todos e o preço volta ao normal (nada precisa ser desligado).
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_courses
  add column if not exists lancamento_em   timestamptz,
  add column if not exists prevenda        boolean not null default false,
  add column if not exists prevenda_preco  numeric(10,2),
  add column if not exists antecipado_dias int not null default 0;

alter table public.academy_courses drop constraint if exists academy_courses_prevenda_preco_ok;
alter table public.academy_courses add constraint academy_courses_prevenda_preco_ok
  check (prevenda_preco is null or prevenda_preco >= 0);
alter table public.academy_courses drop constraint if exists academy_courses_antecipado_ok;
alter table public.academy_courses add constraint academy_courses_antecipado_ok
  check (antecipado_dias between 0 and 60);

-- Quem comprou só assiste a partir do lançamento (menos os dias de acesso antecipado).
-- A aula de amostra e as aulas grátis continuam abertas antes, como vitrine. Admin vê tudo.
-- (Mesma função do 029, com a trava de data no trecho da matrícula.)
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
        where l.id = p_lesson and (
          (l.gratuita and c.publicado)
          or (e.user_id is not null
              and (c.lancamento_em is null or now() >= c.lancamento_em - make_interval(days => c.antecipado_dias)))
        )
      )));
$$;
