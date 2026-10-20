-- ═══════════════════════════════════════════════════════════════════
-- Nexla Academy — cursos de DEMONSTRAÇÃO, só para ver a vitrine "Explorar cursos" cheia.
-- Rodar no SQL Editor. Pode rodar de novo sem duplicar.
--
-- Para APAGAR todos depois (módulos, aulas e progresso vão junto):
--   delete from public.academy_courses where slug like 'demo-%';
-- ═══════════════════════════════════════════════════════════════════
do $$
declare
  cursos jsonb := '[
    {"slug":"demo-instagram-ia","titulo":"Atendimento no Instagram com IA","sub":"Responda directs e comentários na hora, sem ficar preso no celular","modulos":[
      {"t":"Primeiros passos","aulas":[["Por que o direct sem resposta custa caro",540,true],["Conectando o Instagram",720,false]]},
      {"t":"Respostas automáticas","aulas":[["Respondendo dúvidas frequentes",840,false],["Levando o cliente para o WhatsApp",660,false],["Comentários que viram venda",780,false]]}]},
    {"slug":"demo-cobranca-automatica","titulo":"Cobrança automática sem constrangimento","sub":"Lembretes de pagamento no tom certo, sem precisar ligar para ninguém","modulos":[
      {"t":"A régua de cobrança","aulas":[["Montando sua régua de cobrança",600,true],["Mensagens que o cliente não ignora",720,false]]},
      {"t":"No automático","aulas":[["Integrando com sua planilha ou sistema",900,false],["Pix e boleto na mensagem",780,false],["Acompanhando quem pagou",540,false]]}]},
    {"slug":"demo-chatgpt-empresa","titulo":"ChatGPT no dia a dia da empresa","sub":"Textos, propostas, respostas e ideias em minutos, com segurança","modulos":[
      {"t":"Começando bem","aulas":[["O que pedir (e o que não pedir) para a IA",600,true],["Escrevendo bons comandos",840,true]]},
      {"t":"Na prática","aulas":[["Propostas e orçamentos",720,false],["Posts e legendas",660,false],["Respondendo clientes difíceis",780,false],["Resumindo documentos longos",600,false]]}]},
    {"slug":"demo-agenda-cheia","titulo":"Agenda cheia: confirmações e lembretes automáticos","sub":"Menos faltas e remarcações com mensagens que saem sozinhas","modulos":[
      {"t":"Agenda organizada","aulas":[["Onde as faltas acontecem",480,true],["Escolhendo a agenda certa",600,false]]},
      {"t":"Automações","aulas":[["Confirmação 24h antes",720,false],["Lista de espera automática",840,false]]}]},
    {"slug":"demo-relatorios-whatsapp","titulo":"Relatórios de vendas no WhatsApp","sub":"Os números do dia chegam prontos no seu celular, toda manhã","modulos":[
      {"t":"Os números que importam","aulas":[["Quais indicadores acompanhar",600,false],["Organizando os dados de venda",780,false]]},
      {"t":"Relatório no automático","aulas":[["Montando o resumo do dia",900,false],["Enviando pelo WhatsApp",720,false],["Alertas quando algo sai do normal",660,false]]}]},
    {"slug":"demo-n8n-iniciantes","titulo":"n8n para iniciantes: automações sem programar","sub":"Conecte seus sistemas arrastando blocos, do primeiro fluxo ao primeiro resultado","modulos":[
      {"t":"Conhecendo o n8n","aulas":[["O que é um fluxo de automação",540,true],["Instalando e entrando",660,false]]},
      {"t":"Seus primeiros fluxos","aulas":[["Formulário que vira planilha",840,false],["E-mail automático para cada novo cliente",780,false],["Juntando WhatsApp, planilha e e-mail",1080,false]]},
      {"t":"Indo além","aulas":[["Tratando erros",720,false],["Boas práticas para não quebrar nada",600,false]]}]},
    {"slug":"demo-clinicas-ia","titulo":"Clínicas com IA: do agendamento ao retorno","sub":"Triagem, agendamento e lembretes para clínicas e consultórios","modulos":[
      {"t":"A rotina da recepção","aulas":[["Mapeando o atendimento da clínica",600,true],["O que dá para automatizar com segurança",720,false]]},
      {"t":"IA na clínica","aulas":[["Triagem inicial pelo WhatsApp",900,false],["Agendamento e confirmação",840,false],["Retorno e pós-consulta",660,false]]}]}
  ]';
  c jsonb; m jsonb; a jsonb;
  cid uuid; mid uuid;
  mi int; ai int; ordem int := 10;
begin
  for c in select * from jsonb_array_elements(cursos) loop
    ordem := ordem + 1;
    insert into public.academy_courses (slug, titulo, subtitulo, publicado, ordem)
    values (c->>'slug', c->>'titulo', c->>'sub', true, ordem)
    on conflict (slug) do nothing
    returning id into cid;

    continue when cid is null;  -- já existia: não duplica

    mi := 0;
    for m in select * from jsonb_array_elements(c->'modulos') loop
      mi := mi + 1;
      insert into public.academy_modules (course_id, titulo, ordem) values (cid, m->>'t', mi) returning id into mid;
      ai := 0;
      for a in select * from jsonb_array_elements(m->'aulas') loop
        ai := ai + 1;
        insert into public.academy_lessons (module_id, titulo, ordem, duracao_seg, gratuita)
        values (mid, a->>0, ai, (a->>1)::int, (a->>2)::boolean);
      end loop;
    end loop;
  end loop;
end $$;
