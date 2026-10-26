-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — LIMPEZA DOS DADOS DE TESTE (antes de abrir para alunos reais)
--
-- ATENÇÃO: apaga de vez, não tem como desfazer. Rode uma vez só, no SQL Editor do Supabase.
--
-- Apaga:
--   • todos os cursos (os 2 do briefing com aulas de exemplo e os 8 de demonstração),
--     com módulos, aulas, materiais, comentários, avaliações e progresso
--   • todas as matrículas e todos os pedidos (compras de teste do Mercado Pago)
--   • todos os preços (produtos) e cupons
--
-- NÃO apaga:
--   • as contas (logins) e os perfis — inclusive quem é admin continua admin
--   • as tabelas, regras de segurança e funções (a estrutura fica pronta para os cursos reais)
--   • os arquivos no Storage (fotos de capa e materiais): apague pelo painel,
--     Storage → buckets "academy-capas" e "academy-materiais" → selecionar tudo → Delete
--     (o Supabase não deixa apagar arquivos do Storage por SQL)
-- ═══════════════════════════════════════════════════════════════════

begin;

-- Atividade dos alunos
delete from public.academy_lesson_comments;
delete from public.academy_lesson_progress;
delete from public.academy_course_reviews;

-- Acesso e vendas (pedido precisa sair antes do curso)
delete from public.academy_enrollments;
delete from public.academy_orders;
delete from public.academy_coupons;
delete from public.academy_products;

-- Conteúdo
delete from public.academy_lesson_materials;
delete from public.academy_lessons;
delete from public.academy_modules;
delete from public.academy_courses;

-- Visitas registradas durante os testes (a tabela só existe depois do 023)
do $$ begin
  if to_regclass('public.academy_events') is not null then delete from public.academy_events; end if;
end $$;

commit;

-- Conferência: tudo deve voltar 0
select 'cursos' as tabela, count(*) from public.academy_courses
union all select 'aulas',       count(*) from public.academy_lessons
union all select 'matrículas',  count(*) from public.academy_enrollments
union all select 'pedidos',     count(*) from public.academy_orders
union all select 'preços',      count(*) from public.academy_products
union all select 'cupons',      count(*) from public.academy_coupons
union all select 'comentários', count(*) from public.academy_lesson_comments
union all select 'contas (ficam)', count(*) from public.academy_profiles;
