-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — transforma a conta de teste em ADMIN
-- (para outra conta, troque o e-mail). Depois, recarregue o site:
-- aparece "Painel admin" no menu do perfil.
-- Para voltar a ser aluno: 009_tornar_aluno.sql
-- ═══════════════════════════════════════════════════════════════════
update public.academy_profiles
set role = 'admin'
where id = (select id from auth.users where email = 'teste@nexla.com.br');

select u.email, p.role
from public.academy_profiles p join auth.users u on u.id = p.id
where u.email = 'teste@nexla.com.br';
