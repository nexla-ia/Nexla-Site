import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';
import CriarConta from './CriarConta';
import Painel from './Painel';
import Curso from './Curso';
import Certificado from './Certificado';
import Certificados from './Certificados';
import Perfil from './Perfil';
import Explorar from './Explorar';
import { Comprar, RetornoCompra } from './Compra';
import AdminCursos from './admin/AdminCursos';
import AdminCurso from './admin/AdminCurso';
import VisaoGeral from './admin/VisaoGeral';
import AdminComunidade from './admin/AdminComunidade';
import AdminVendas from './admin/Vendas';
import { Carregando } from './AppLayout';
import { useRota, navegar } from './router';
import { useSessao, useEhAdmin, supabaseConfigurado } from './supabase';
import '../index.css';
import './academy.css';

/* Nexla Academy → nexla.com.br/academy
 * Rotas públicas: / (entrar) e /criar-conta.
 * Rotas do aluno: /painel, /cursos (explorar), /curso/:slug, /certificado/:slug, /certificados e /perfil.
 * Admin (role = 'admin'): só a área admin — /admin (visão geral), /admin/cursos, /admin/curso/:id e /admin/comunidade —
 * mais as páginas /curso/:slug para o "Ver como aluno".
 * Logado em rota pública → vai para o painel. Deslogado em rota do aluno → vai para o login. */
const TITULOS: Record<string, string> = {
  '/': 'Entrar', '/criar-conta': 'Criar conta', '/painel': 'Meus cursos',
  '/perfil': 'Meu perfil', '/certificados': 'Meus certificados', '/cursos': 'Explorar cursos',
  '/admin': 'Visão geral · Admin', '/admin/cursos': 'Cursos · Admin', '/admin/comunidade': 'Comunidade · Admin', '/admin/vendas': 'Vendas · Admin',
  '/comprar': 'Comprar',
};

function Academy() {
  const rota = useRota();
  const sessao = useSessao();
  const publica = rota === '/' || rota === '/criar-conta';
  const curso = rota.match(/^\/curso\/([\w-]+)$/)?.[1];
  const certificado = rota.match(/^\/certificado\/([\w-]+)$/)?.[1];
  const comprar = rota.match(/^\/comprar\/([\w-]+)$/)?.[1];
  const retornoCompra = rota.match(/^\/compra\/([\w-]+)$/)?.[1];
  const adminCurso = rota.match(/^\/admin\/curso\/([\w-]+)$/)?.[1];
  const admin = useEhAdmin(sessao);

  // Ao entrar: admin vai direto para o painel admin; aluno, para "Meus cursos"
  useEffect(() => {
    if (sessao === undefined) return;
    if (sessao && publica && admin !== undefined) navegar(admin ? '/admin' : '/painel', { substituir: true });
    if (!sessao && !publica) navegar('/', { substituir: true });
    // Admin só usa a área admin (e as páginas de curso, pelo "Ver como aluno")
    if (sessao && admin && !publica && !rota.startsWith('/admin') && !rota.startsWith('/curso/')) navegar('/admin', { substituir: true });
  }, [sessao, publica, admin, rota]);

  useEffect(() => {
    document.title = `${TITULOS[rota] ?? (curso ? 'Curso' : certificado ? 'Certificado' : 'Entrar')} | Nexla Academy`;
  }, [rota, curso, certificado]);

  if (sessao === undefined || (sessao && publica) || (!sessao && !publica)) return <Carregando />;
  if (!sessao) return rota === '/criar-conta' ? <CriarConta /> : <Login />;
  if (admin === undefined) return <Carregando />;
  if (admin && !rota.startsWith('/admin') && !rota.startsWith('/curso/')) return <Carregando />;
  if (rota === '/admin') return <VisaoGeral sessao={sessao} />;
  if (rota === '/admin/cursos') return <AdminCursos sessao={sessao} />;
  if (rota === '/admin/vendas') return <AdminVendas sessao={sessao} />;
  if (rota === '/admin/comunidade') return <AdminComunidade sessao={sessao} />;
  if (adminCurso) return <AdminCurso key={adminCurso} sessao={sessao} id={adminCurso} />;
  if (comprar) return <Comprar key={comprar} sessao={sessao} slug={comprar} />;
  if (retornoCompra) return <RetornoCompra key={retornoCompra} sessao={sessao} id={retornoCompra} />;
  if (rota === '/cursos') return <Explorar sessao={sessao} />;
  if (rota === '/perfil') return <Perfil sessao={sessao} />;
  if (rota === '/certificados') return <Certificados sessao={sessao} />;
  if (certificado) return <Certificado key={certificado} sessao={sessao} slug={certificado} />;
  if (curso) return <Curso key={curso} sessao={sessao} slug={curso} />;
  return <Painel sessao={sessao} />;
}

/* Aviso quando faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no deploy */
function NaoConfigurado() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="max-w-md text-center rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)' }}>
        <p className="font-bold text-[20px]" style={{ color: '#0F172A' }}>A Nexla Academy está em manutenção</p>
        <p className="text-[14.5px] mt-2" style={{ color: '#475569' }}>Volte em alguns minutos. Se o problema continuar, fale com a gente no WhatsApp.</p>
        <p className="text-[12px] mt-5" style={{ color: '#94A3B8' }}>Configuração do Supabase ausente neste deploy.</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigurado ? <Academy /> : <NaoConfigurado />}
  </StrictMode>
);
