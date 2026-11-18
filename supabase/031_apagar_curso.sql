-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — permitir apagar curso que já teve pedidos (rodar depois do 030)
-- Pode rodar de novo sem erro.
--
-- Antes, um curso com qualquer pedido (até pendente ou expirado) não podia ser apagado
-- (on delete restrict) e o botão "Apagar curso" não fazia nada.
-- Os pedidos continuam guardados (lei fiscal / CDC, como no 027): só perdem a ligação com o
-- curso (course_id vazio). O nome do curso continua no próprio pedido, em "itens".
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_orders alter column course_id drop not null;
alter table public.academy_orders drop constraint if exists academy_orders_course_id_fkey;
alter table public.academy_orders add constraint academy_orders_course_id_fkey
  foreign key (course_id) references public.academy_courses(id) on delete set null;
