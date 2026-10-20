-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — volta a conta de teste para ALUNO
-- (para outra conta, troque o e-mail). Depois, recarregue o site:
-- o "Painel admin" some do menu e a área admin fica bloqueada.
-- Para virar admin de novo: 008_tornar_admin.sql
-- ═══════════════════════════════════════════════════════════════════
update public.academy_profiles
set role = 'aluno'
where id = (select id from auth.users where email = 'teste@nexla.com.br');

select u.email, p.role
from public.academy_profiles p join auth.users u on u.id = p.id
where u.email = 'teste@nexla.com.br';
