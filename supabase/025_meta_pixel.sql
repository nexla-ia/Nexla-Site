-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — Meta Pixel / API de Conversões (rodar depois do 024)
-- Pode rodar de novo sem erro.
--
-- Guarda no pedido os dados que o Meta usa para ligar a compra ao clique no anúncio
-- (cookies _fbp/_fbc do navegador, IP e navegador de quem comprou). O webhook do
-- Mercado Pago usa isso para enviar a compra à API de Conversões quando o pagamento é aprovado.
-- Só a função do servidor grava esse campo (o aluno só enxerga o do próprio pedido).
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_orders add column if not exists rastreio jsonb;
