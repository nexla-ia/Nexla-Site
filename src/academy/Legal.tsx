import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { T, LOGO, display } from './ui';
import { Link } from './router';
import { BotaoTema } from './tema';

/* ─── Dados da empresa usados nos documentos (cartão CNPJ) ──────────
   Campo vazio não aparece no texto. */
export const EMPRESA = {
  nome: 'Nexla Automação e IA',
  razaoSocial: 'Nexla Automação e Inteligência Artificial Ltda.',
  cnpj: '59.838.572/0001-97',
  endereco: 'Rua Gonçalves Dias, 321, Sala 06, Centro (5º BEC), Vilhena – RO, CEP 76988-055',
  cidade: 'Vilhena, RO',
  email: 'nexla@nexla.com.br',
  whatsapp: '556999300101',
  whatsappTexto: '(69) 9930-0101',
};
const ATUALIZADO = '26 de outubro de 2026';

type Bloco = string | string[];                 // texto = parágrafo; lista = itens
type Secao = { id: string; titulo: string; blocos: Bloco[] };

const empresa = () => `${EMPRESA.razaoSocial || EMPRESA.nome}${EMPRESA.cnpj ? `, CNPJ ${EMPRESA.cnpj}` : ''}, com sede na ${EMPRESA.endereco || EMPRESA.cidade}`;
const canais = () => `pelo WhatsApp ${EMPRESA.whatsappTexto}${EMPRESA.email ? ` ou pelo e-mail ${EMPRESA.email}` : ''}`;

/* ─── Termos de uso ─────────────────────────────────────────────── */
const TERMOS = (): Secao[] => [
  { id: 'quem-somos', titulo: 'Quem somos', blocos: [
    `A Nexla Academy é a plataforma de cursos online da Nexla, oferecida por ${empresa()} ("Nexla" ou "nós"). Neste documento, "você" é a pessoa que cria uma conta na plataforma.`,
    'Ao criar sua conta, você declara que leu e concorda com estes Termos de uso e com a Política de privacidade.',
  ] },
  { id: 'conta', titulo: 'Sua conta', blocos: [[
    'Para usar a Academy é preciso criar uma conta com nome, e-mail, WhatsApp e senha. Os dados precisam ser verdadeiros e estar atualizados.',
    'É necessário ter 18 anos ou mais. Menores de idade só podem usar a plataforma com autorização e acompanhamento do responsável legal, que responde pela conta.',
    'A conta é pessoal e intransferível. Você é responsável por manter a senha em segredo e por tudo o que for feito com ela.',
    'A conta funciona em um aparelho por vez: ao entrar em um aparelho novo, a sessão do aparelho anterior é encerrada. Isso protege o seu acesso contra o compartilhamento de senha.',
  ]] },
  { id: 'cursos', titulo: 'Cursos e acesso', blocos: [[
    'Cada curso comprado, ou liberado como gratuito, fica disponível na sua conta, em "Meus cursos", sem mensalidade.',
    'O acesso vale enquanto o curso estiver disponível na Nexla Academy. Se um curso for retirado da plataforma, os alunos serão avisados com pelo menos 30 dias de antecedência, para concluir as aulas e emitir o certificado.',
    'Podemos atualizar o conteúdo dos cursos, regravando, reorganizando ou incluindo aulas, para mantê-los atuais.',
    'Algumas aulas são de amostra e podem ser assistidas por qualquer pessoa com conta, antes da compra.',
  ]] },
  { id: 'pagamento', titulo: 'Preços e pagamento', blocos: [[
    'Os preços aparecem na página de cada curso, em reais, e podem mudar a qualquer momento. Mudanças de preço não afetam compras já feitas.',
    'O pagamento é processado pelo Mercado Pago, por Pix, boleto ou cartão de crédito, com o parcelamento mostrado na tela de pagamento. Os dados do cartão são informados diretamente ao Mercado Pago e não passam pela Nexla.',
    'O acesso é liberado automaticamente quando o Mercado Pago confirma o pagamento: no Pix e no cartão, normalmente em poucos minutos; no boleto, em até 3 dias úteis depois de pago.',
    'Cupons de desconto valem conforme as regras de cada cupom (validade, limite de uso e cursos participantes) e não podem ser trocados por dinheiro.',
    'Ofertas extras mostradas na tela de compra são opcionais e só são cobradas se você escolher incluí-las.',
  ]] },
  { id: 'reembolso', titulo: 'Direito de arrependimento e reembolso', blocos: [[
    'Você pode desistir da compra em até 7 dias corridos contados da confirmação do pagamento, sem precisar justificar, como garante o artigo 49 do Código de Defesa do Consumidor.',
    `Para pedir o reembolso, fale com a gente ${canais()}, informando o e-mail da sua conta e o curso.`,
    'O valor é devolvido pelo mesmo meio de pagamento, por meio do Mercado Pago. No cartão de crédito, o estorno aparece na fatura conforme o prazo da operadora.',
    'Com o reembolso, o acesso ao curso é encerrado automaticamente.',
  ]] },
  { id: 'uso-do-conteudo', titulo: 'Uso permitido do conteúdo', blocos: [
    'Os vídeos, textos, planilhas, modelos e demais materiais dos cursos são protegidos por direitos autorais e pertencem à Nexla ou a seus parceiros.',
    'Você pode assistir às aulas e usar os materiais para o seu aprendizado e no seu próprio trabalho ou negócio. Não é permitido:',
    [
      'gravar, baixar ou copiar os vídeos das aulas;',
      'compartilhar sua conta ou senha com outras pessoas;',
      'revender, distribuir ou publicar os materiais, no todo ou em parte;',
      'usar o conteúdo para criar cursos ou produtos concorrentes.',
    ],
  ] },
  { id: 'comunidade', titulo: 'Comentários e comunidade', blocos: [[
    'Nas aulas, você pode comentar, tirar dúvidas e avaliar os cursos. Seu nome aparece junto com o que você publica.',
    'Seja respeitoso. Não são permitidos ofensas, discriminação, spam, propaganda, conteúdo ilegal ou dados pessoais de outras pessoas.',
    'Você pode apagar os seus comentários quando quiser. Publicações que desrespeitem estas regras podem ser removidas, e a conta pode ser suspensa.',
  ]] },
  { id: 'certificados', titulo: 'Certificados', blocos: [[
    'Ao concluir todas as aulas de um curso que emite certificado, você pode baixar o seu certificado de conclusão em "Meus certificados".',
    'O certificado traz um código de identificação e comprova a conclusão de um curso livre. Ele não equivale a diploma nem a certificado de curso reconhecido pelo MEC.',
  ]] },
  { id: 'suspensao', titulo: 'Suspensão e encerramento da conta', blocos: [[
    'Podemos suspender ou encerrar contas que descumpram estes Termos, por exemplo em casos de compartilhamento de acesso, cópia do conteúdo ou fraude no pagamento. Sempre que possível, avisaremos antes.',
    'Você pode pedir o encerramento da sua conta a qualquer momento, como explicado na Política de privacidade. Com o encerramento, você perde o acesso aos cursos, ao progresso e aos certificados.',
  ]] },
  { id: 'responsabilidades', titulo: 'Responsabilidades', blocos: [[
    'Os cursos ensinam ferramentas e métodos de inteligência artificial e automação. Os resultados dependem de como cada pessoa e empresa os aplica, por isso não garantimos resultados específicos, como aumento de vendas ou redução de custos.',
    'Trabalhamos para manter a plataforma no ar, mas podem ocorrer interrupções por manutenção ou por falhas de serviços de terceiros, como internet, hospedagem, pagamento ou vídeo. Nesses casos, faremos o possível para normalizar o acesso rapidamente.',
    'Algumas aulas ensinam a usar serviços de terceiros, como WhatsApp, n8n ou ChatGPT. O uso desses serviços segue as regras e os preços de cada um.',
  ]] },
  { id: 'alteracoes', titulo: 'Mudanças nestes Termos', blocos: [
    'Podemos atualizar estes Termos. A data da última atualização fica no topo desta página e, se a mudança for relevante, avisaremos por e-mail ou dentro da plataforma. Continuar usando a Academy depois do aviso significa que você concorda com a nova versão.',
  ] },
  { id: 'lei-e-foro', titulo: 'Lei aplicável e foro', blocos: [
    'Estes Termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor e a Lei Geral de Proteção de Dados. Para resolver qualquer conflito, fica eleito o foro do domicílio do consumidor.',
  ] },
  { id: 'contato', titulo: 'Contato', blocos: [
    `Dúvidas, suporte ou pedidos de reembolso: fale com a gente ${canais()}.`,
  ] },
];

/* ─── Política de privacidade ───────────────────────────────────── */
const PRIVACIDADE = (): Secao[] => [
  { id: 'controlador', titulo: 'Quem cuida dos seus dados', blocos: [
    `A controladora dos dados pessoais tratados na Nexla Academy é ${empresa()}. Para falar sobre privacidade, inclusive com o nosso encarregado de dados, use os canais da seção Contato.`,
  ] },
  { id: 'dados-coletados', titulo: 'Dados que coletamos', blocos: [[
    'Cadastro: nome, e-mail, WhatsApp e senha. A senha é guardada de forma criptografada pelo nosso provedor de login, e nem a equipe da Nexla consegue vê-la.',
    'Login com Google: se você escolher entrar com a sua conta Google, recebemos do Google o seu nome, e-mail e foto de perfil. Não temos acesso à sua senha do Google.',
    'Uso da plataforma: cursos em que você está matriculado, aulas concluídas, comentários, avaliações, certificados emitidos e o aparelho conectado no momento (usado para manter uma sessão por vez).',
    'Compras: pedidos, valores, cupons usados, forma e situação do pagamento. Os dados do cartão são informados diretamente ao Mercado Pago e não ficam com a Nexla.',
    'Preferências: se você aceitou receber comunicações de marketing.',
    'Origem e navegação: de onde você chegou na primeira visita (por exemplo, o anúncio ou o link de uma campanha), as páginas da Academy que você abre e as aulas iniciadas, ligados a um código anônimo do navegador e, depois do cadastro, à sua conta.',
    'Dados técnicos: informações enviadas automaticamente pelo navegador, como endereço IP, tipo de aparelho e navegador, registradas pelos nossos provedores para segurança e funcionamento do serviço.',
  ]] },
  { id: 'finalidades', titulo: 'Para que usamos os dados', blocos: [
    'Usamos os dados apenas para as finalidades abaixo, cada uma com a base legal prevista na LGPD:',
    [
      'Criar e manter sua conta e liberar os cursos (execução de contrato).',
      'Processar pagamentos e reembolsos e cumprir obrigações fiscais (execução de contrato e obrigação legal).',
      'Mostrar o seu progresso, emitir certificados e permitir os comentários na comunidade (execução de contrato).',
      'Dar suporte e avisar sobre sua conta, suas compras e mudanças importantes (execução de contrato e legítimo interesse).',
      'Proteger a plataforma contra fraudes e compartilhamento de contas (legítimo interesse).',
      'Medir, com dados agregados, quantas pessoas visitam, se cadastram e compram, de quais anúncios vieram e em que aula param, para melhorar cursos, páginas e anúncios (legítimo interesse).',
      'Medir e melhorar os nossos anúncios no Facebook e no Instagram, informando ao Meta as visitas, os cadastros e as compras que vieram deles (legítimo interesse).',
      'Enviar novidades e ofertas por e-mail e WhatsApp, somente se você autorizar (consentimento).',
    ],
  ] },
  { id: 'marketing', titulo: 'Comunicações de marketing', blocos: [
    'Só enviamos novidades e ofertas se você marcar essa opção no cadastro ou em Meu perfil. Você pode desmarcar quando quiser, em Meu perfil, sem perder o acesso aos cursos.',
    'Mensagens sobre sua conta e suas compras continuam sendo enviadas, porque fazem parte do serviço.',
  ] },
  { id: 'compartilhamento', titulo: 'Com quem compartilhamos', blocos: [
    'Não vendemos seus dados. Compartilhamos apenas o necessário com empresas que prestam serviços para a Nexla Academy:',
    [
      'Supabase: banco de dados, login e armazenamento de arquivos.',
      'Mercado Pago: processamento dos pagamentos e reembolsos.',
      'Bunny.net: hospedagem e transmissão dos vídeos das aulas.',
      'Vercel: hospedagem do site.',
      'Google: login com a conta Google (quando você escolhe essa opção) e envio dos e-mails da Academy.',
      'Meta (Facebook e Instagram): medição dos anúncios pelo Meta Pixel e pela API de Conversões. Recebe as páginas visitadas, cadastros e compras; e-mail, telefone e o código da sua conta vão criptografados.',
    ],
    'Também podemos compartilhar dados quando a lei exigir ou por ordem de autoridade competente.',
  ] },
  { id: 'transferencia', titulo: 'Transferência internacional', blocos: [
    'Alguns desses provedores guardam dados em servidores fora do Brasil. Nesses casos, a transferência segue o que a LGPD permite, com provedores que adotam medidas de segurança e de proteção de dados adequadas.',
  ] },
  { id: 'retencao', titulo: 'Por quanto tempo guardamos', blocos: [[
    'Dados da conta e de uso: enquanto a sua conta estiver ativa.',
    'Dados de compras: pelo prazo exigido pelas leis fiscais e de defesa do consumidor (em geral, 5 anos), mesmo depois do encerramento da conta.',
    'Depois desses prazos, os dados são apagados ou anonimizados.',
  ]] },
  { id: 'seguranca', titulo: 'Como protegemos seus dados', blocos: [
    [
      'Conexão criptografada (HTTPS) em todas as páginas.',
      'Regras de acesso no banco de dados: cada aluno só acessa os próprios dados, e a equipe acessa apenas o necessário para o suporte.',
      'Senhas guardadas de forma criptografada.',
      'Links dos vídeos gerados apenas para quem tem acesso à aula.',
    ],
    'Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que possa trazer risco relevante, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), como determina a LGPD.',
  ] },
  { id: 'direitos', titulo: 'Seus direitos', blocos: [
    'Pela LGPD, você pode, a qualquer momento:',
    [
      'confirmar se tratamos seus dados e ter acesso a eles;',
      'corrigir dados incompletos, inexatos ou desatualizados (você mesmo pode fazer isso em Meu perfil);',
      'pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desacordo com a lei;',
      'pedir a portabilidade dos seus dados para outro fornecedor;',
      'saber com quem compartilhamos seus dados;',
      'revogar o consentimento e pedir a eliminação dos dados tratados com base nele;',
      'pedir a exclusão da sua conta.',
    ],
    `Para excluir a conta, use Meu perfil → Seus dados (LGPD) → Excluir minha conta: a exclusão é feita na hora, e os registros de compra ficam guardados sem os seus dados pessoais pelo prazo legal. Para os demais direitos, fale com a gente ${canais()}. Respondemos em até 15 dias. Você também pode apresentar reclamação à ANPD.`,
  ] },
  { id: 'cookies', titulo: 'Cookies e armazenamento no navegador', blocos: [
    'A Academy usa o armazenamento do navegador para manter você conectado, lembrar preferências (como o modo claro ou escuro e o modo teatro do player) e guardar um código anônimo e a origem da sua primeira visita, usados nas nossas próprias métricas.',
    'Também usamos o Meta Pixel, que grava cookies do Meta no seu navegador para medir os resultados dos nossos anúncios no Facebook e no Instagram. Você pode limitar esse uso nas configurações de anúncios da sua conta do Facebook ou do Instagram, ou bloqueando cookies de terceiros no navegador. Isso não afeta o acesso aos cursos.',
  ] },
  { id: 'menores', titulo: 'Crianças e adolescentes', blocos: [
    'A Nexla Academy é voltada a maiores de 18 anos. Não coletamos intencionalmente dados de menores sem a autorização do responsável legal. Se identificarmos um cadastro assim, ele poderá ser excluído.',
  ] },
  { id: 'alteracoes', titulo: 'Mudanças nesta Política', blocos: [
    'Podemos atualizar esta Política. A data da última atualização fica no topo desta página e, se a mudança for relevante, avisaremos por e-mail ou dentro da plataforma.',
  ] },
  { id: 'contato', titulo: 'Contato', blocos: [
    `Para dúvidas sobre privacidade ou para exercer seus direitos, fale com a gente ${canais()}.`,
  ] },
];

const DOCS = {
  termos: {
    titulo: 'Termos de uso',
    intro: 'As regras para usar a Nexla Academy: sua conta, o acesso aos cursos, pagamentos, reembolso e o uso do conteúdo. Escrevemos de forma direta para que fique fácil de entender.',
    secoes: TERMOS,
  },
  privacidade: {
    titulo: 'Política de privacidade',
    intro: 'Quais dados pessoais a Nexla Academy coleta, para que usa, com quem compartilha e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
    secoes: PRIVACIDADE,
  },
} as const;

/* Páginas públicas /termos e /privacidade (abrem com ou sem login) */
export default function Legal({ doc }: { doc: keyof typeof DOCS }) {
  const d = DOCS[doc];
  const secoes = d.secoes();
  useEffect(() => { window.scrollTo(0, 0); }, [doc]);

  const irPara = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.paper, color: T.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30" style={{ background: 'var(--a-vidro)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link para="/" className="inline-flex items-center gap-2.5 shrink-0">
            <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
            <span className="text-[17px] font-bold" style={display}>Nexla <span style={{ color: T.accent }}>Academy</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <BotaoTema />
            <Link para="/" className="hidden sm:inline-flex items-center h-9 px-3.5 rounded-lg text-[14px] font-semibold transition-colors hover:bg-slate-100" style={{ color: T.accent }}>
              Ir para a Academy
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 py-10 md:py-14">
        {/* Troca entre os dois documentos */}
        <nav aria-label="Documentos" className="flex gap-7 mb-8" style={{ borderBottom: `1px solid ${T.rule}` }}>
          {(Object.keys(DOCS) as (keyof typeof DOCS)[]).map(k => {
            const ativo = k === doc;
            return (
              <Link key={k} para={k === 'termos' ? '/termos' : '/privacidade'}
                className="relative pb-3 text-[14.5px] font-semibold whitespace-nowrap" style={{ color: ativo ? T.accent : T.mute }}>
                {DOCS[k].titulo}
                {ativo && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full" style={{ background: '#4F46E5' }} />}
              </Link>
            );
          })}
        </nav>

        <h1 className="font-bold leading-tight" style={{ ...display, fontSize: 'clamp(30px,4vw,44px)' }}>{d.titulo}</h1>
        <p className="text-[13.5px] mt-2" style={{ color: T.mute }}>Última atualização: {ATUALIZADO}</p>
        <p className="text-[16px] leading-relaxed mt-4 max-w-3xl" style={{ color: T.ink2 }}>{d.intro}</p>

        <div className="grid lg:grid-cols-[15rem_1fr] gap-10 xl:gap-14 mt-10">
          {/* Índice */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[13px] font-semibold mb-3" style={{ color: T.ink }}>Nesta página</p>
              <ol className="space-y-1.5 text-[13.5px]" style={{ borderLeft: `1px solid ${T.rule}` }}>
                {secoes.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} onClick={e => irPara(e, s.id)}
                      className="block pl-4 py-0.5 -ml-px border-l border-transparent transition-colors hover:underline underline-offset-4" style={{ color: T.mute }}>
                      {i + 1}. {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          {/* Texto */}
          <article className="max-w-3xl min-w-0 space-y-10">
            {secoes.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-bold text-[20px] leading-snug mb-3" style={display}>{i + 1}. {s.titulo}</h2>
                <div className="space-y-3 text-[15px] leading-relaxed" style={{ color: T.ink2 }}>
                  {s.blocos.map((b, k) => typeof b === 'string'
                    ? <p key={k}>{b}</p>
                    : (
                      <ul key={k} className="space-y-2">
                        {b.map(item => (
                          <li key={item} className="flex gap-3">
                            <span className="mt-[9px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#4F46E5' }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ))}
                </div>
              </section>
            ))}

            <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: T.card, border: `1px solid ${T.rule}` }}>
              <div>
                <p className="font-bold text-[17px]" style={display}>Ficou alguma dúvida?</p>
                <p className="text-[14px] mt-1" style={{ color: T.mute }}>Fale com a equipe da Nexla, a gente responde por lá.</p>
              </div>
              <a href={`https://wa.me/${EMPRESA.whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="acad-btn inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14.5px] font-semibold text-white shrink-0">
                <MessageCircle size={17} strokeWidth={2} /> Falar no WhatsApp
              </a>
            </div>
          </article>
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${T.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]" style={{ color: T.mute }}>
          <p>© 2026 {EMPRESA.razaoSocial || EMPRESA.nome}{EMPRESA.cnpj ? ` · CNPJ ${EMPRESA.cnpj}` : ''} · {EMPRESA.cidade}</p>
          <div className="flex gap-5">
            <Link para="/termos" className="hover:underline underline-offset-4">Termos de uso</Link>
            <Link para="/privacidade" className="hover:underline underline-offset-4">Política de privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
