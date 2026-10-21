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
import AdminCursos from './admin/AdminCursos';
import AdminCurso from './admin/AdminCurso';
import VisaoGeral from './admin/VisaoGeral';
import AdminComunidade from './admin/AdminComunidade';
import { Carregando } from './AppLayout';
import { useRota, navegar } from './router';
import { useSessao, useEhAdmin } from './supabase';
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
  '/admin': 'Visão geral · Admin', '/admin/cursos': 'Cursos · Admin', '/admin/comunidade': 'Comunidade · Admin',
};

function Academy() {
  const rota = useRota();
  const sessao = useSessao();
  const publica = rota === '/' || rota === '/criar-conta';
  const curso = rota.match(/^\/curso\/([\w-]+)$/)?.[1];
  const certificado = rota.match(/^\/certificado\/([\w-]+)$/)?.[1];
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
  if (rota === '/admin/comunidade') return <AdminComunidade sessao={sessao} />;
  if (adminCurso) return <AdminCurso key={adminCurso} sessao={sessao} id={adminCurso} />;
  if (rota === '/cursos') return <Explorar sessao={sessao} />;
  if (rota === '/perfil') return <Perfil sessao={sessao} />;
  if (rota === '/certificados') return <Certificados sessao={sessao} />;
  if (certificado) return <Certificado key={certificado} sessao={sessao} slug={certificado} />;
  if (curso) return <Curso key={curso} sessao={sessao} slug={curso} />;
  return <Painel sessao={sessao} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Academy />
  </StrictMode>
);
