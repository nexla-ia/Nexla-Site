-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — preferências do aluno salvas na conta (rodar depois do 029)
-- Pode rodar de novo sem erro.
--
-- Tema (claro/escuro/automático) e as preferências de estudo do perfil (concluir sozinha,
-- próxima aula automática, continuar de onde parou, modo teatro) passam a acompanhar o aluno
-- em qualquer aparelho. O navegador continua guardando uma cópia para abrir rápido.
-- ═══════════════════════════════════════════════════════════════════

alter table public.academy_profiles add column if not exists preferencias jsonb not null default '{}'::jsonb;

-- Só um objeto pequeno (evita que alguém use a coluna para guardar qualquer coisa)
alter table public.academy_profiles drop constraint if exists academy_profiles_preferencias_ok;
alter table public.academy_profiles add constraint academy_profiles_preferencias_ok
  check (jsonb_typeof(preferencias) = 'object' and pg_column_size(preferencias) <= 1024);

-- O aluno pode alterar as próprias preferências (o 029 deixou só nome, WhatsApp, marketing e UTM)
grant update (preferencias) on public.academy_profiles to authenticated;
