-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — bônus e perguntas frequentes por curso (página de vendas pública)
-- Rodar no SQL Editor (depois do 018). Pode rodar de novo sem erro.
-- Editados em admin → curso → Configurações. Aparecem na página do curso, aberta a visitantes.
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_courses
  add column if not exists bonus jsonb not null default '[]'::jsonb,  -- [{"titulo": "...", "descricao": "..."}]
  add column if not exists faq   jsonb not null default '[]'::jsonb;  -- [{"pergunta": "...", "resposta": "..."}]
