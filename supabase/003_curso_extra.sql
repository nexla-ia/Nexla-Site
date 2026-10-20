-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — 3º curso de exemplo (opcional), para ver a vitrine "Explorar cursos".
-- O usuário de teste NÃO é matriculado nele: aparece como "Para você conhecer",
-- com 1 aula grátis liberada e as demais bloqueadas.
-- Para tirar da vitrine depois: update academy_courses set publicado = false where slug = 'agente-whatsapp';
-- ═══════════════════════════════════════════════════════════════════
insert into public.academy_courses (slug, titulo, subtitulo, publicado, ordem) values
  ('agente-whatsapp', 'Agente de IA no WhatsApp do zero', 'Monte um atendente que responde, qualifica e agenda clientes 24h', true, 3)
on conflict (slug) do nothing;

do $$
declare
  c uuid := (select id from public.academy_courses where slug = 'agente-whatsapp');
  m uuid;
begin
  if not exists (select 1 from public.academy_modules where course_id = c) then
    insert into public.academy_modules (course_id, titulo, ordem) values (c, 'Fundamentos', 1) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg, gratuita) values
      (m, 'O que um agente de IA faz (e o que não faz)', 1, 600, true),
      (m, 'Escolhendo as ferramentas', 2, 780, false);
    insert into public.academy_modules (course_id, titulo, ordem) values (c, 'Construindo o agente', 2) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Conectando o WhatsApp', 1, 960),
      (m, 'Ensinando o agente sobre a sua empresa', 2, 1140),
      (m, 'Agendamento automático', 3, 900);
    insert into public.academy_modules (course_id, titulo, ordem) values (c, 'No ar', 3) returning id into m;
    insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg) values
      (m, 'Testando antes de ligar para os clientes', 1, 720),
      (m, 'Acompanhando as conversas', 2, 660);
  end if;
end $$;
