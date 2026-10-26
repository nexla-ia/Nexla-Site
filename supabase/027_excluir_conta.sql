-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — exclusão da conta pelo próprio aluno (rodar depois do 026)
-- Pode rodar de novo sem erro.
--
-- Quando a conta é excluída, os PEDIDOS não podem sumir: a lei fiscal e o Código de Defesa do
-- Consumidor pedem que fiquem guardados (a Política de privacidade fala em ~5 anos).
-- Antes, apagar o login apagava os pedidos junto (on delete cascade). Agora o pedido fica,
-- só que anônimo (user_id vazio): sem nome, e-mail ou qualquer ligação com a pessoa.
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_orders alter column user_id drop not null;
alter table public.academy_orders drop constraint if exists academy_orders_user_id_fkey;
alter table public.academy_orders add constraint academy_orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
