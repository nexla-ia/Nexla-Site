-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — acesso ao curso só pelo pagamento (rodar depois do 015)
-- Pode rodar de novo sem erro.
--
-- Quem pagou tem direito ao curso: o acesso só sai pelo reembolso no Mercado Pago
-- (o webhook academy-webhook-mp desativa a matrícula sozinho). Por isso o admin
-- deixa de poder liberar, remover ou reativar acesso manualmente.
-- ═══════════════════════════════════════════════════════════════════
drop function if exists public.academy_admin_definir_acesso(uuid, uuid, boolean);
drop function if exists public.academy_admin_liberar(text, uuid);
-- Convites por e-mail (liberação manual antiga) não são mais usados
drop table if exists public.academy_convites;
