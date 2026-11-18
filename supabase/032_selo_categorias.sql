-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — selo da promoção e várias categorias por curso (rodar depois do 031)
-- Pode rodar de novo sem erro.
--
-- • Selo: texto curto ao lado do preço promocional ("Black Friday", "Lançamento"...).
-- • Categorias: o curso passa a ter uma lista (#Atendimento #Planilhas). A categoria única
--   de antes vira o primeiro item da lista; a coluna antiga fica guardando a primeira.
-- ═══════════════════════════════════════════════════════════════════
alter table public.academy_products add column if not exists selo text;
alter table public.academy_products drop constraint if exists academy_products_selo_tamanho;
alter table public.academy_products add constraint academy_products_selo_tamanho
  check (selo is null or char_length(selo) between 1 and 24);

alter table public.academy_courses add column if not exists categorias text[] not null default '{}';
alter table public.academy_courses drop constraint if exists academy_courses_categorias_limite;
alter table public.academy_courses add constraint academy_courses_categorias_limite
  check (coalesce(array_length(categorias, 1), 0) <= 5);

update public.academy_courses
   set categorias = array[trim(categoria)]
 where categoria is not null and trim(categoria) <> '' and categorias = '{}';
