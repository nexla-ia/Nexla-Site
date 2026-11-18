-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — desconto para quem já é aluno (rodar depois do 033)
-- Pode rodar de novo sem erro.
--
-- Quem já pagou por outro curso ganha esta porcentagem de desconto neste curso, direto no pagamento
-- (o checkout confere no servidor). 0 = sem desconto.
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_products add column if not exists desconto_aluno_pct int not null default 0;
alter table public.academy_products drop constraint if exists academy_products_desconto_aluno_ok;
alter table public.academy_products add constraint academy_products_desconto_aluno_ok
  check (desconto_aluno_pct between 0 and 90);
