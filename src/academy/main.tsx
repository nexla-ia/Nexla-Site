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
import { Carregando } from './AppLayout';
import { useRota, navegar } from './router';
import { useSessao } from './supabase';
import '../index.css';
import './academy.css';

/* Nexla Academy → nexla.com.br/academy
 * Rotas públicas: / (entrar) e /criar-conta.
 * Rotas do aluno: /painel, /cursos (explorar), /curso/:slug, /certificado/:slug, /certificados e /perfil.
 * Logado em rota pública → vai para o painel. Deslogado em rota do aluno → vai para o login. */
const TITULOS: Record<string, string> = {
  '/': 'Entrar', '/criar-conta': 'Criar conta', '/painel': 'Meus cursos',
  '/perfil': 'Meu perfil', '/certificados': 'Meus certificados', '/cursos': 'Explorar cursos',
};

function Academy() {
  const rota = useRota();
  const sessao = useSessao();
  const publica = rota === '/' || rota === '/criar-conta';
  const curso = rota.match(/^\/curso\/([\w-]+)$/)?.[1];
  const certificado = rota.match(/^\/certificado\/([\w-]+)$/)?.[1];

  useEffect(() => {
    if (sessao === undefined) return;
    if (sessao && publica) navegar('/painel', { substituir: true });
    if (!sessao && !publica) navegar('/', { substituir: true });
  }, [sessao, publica]);

  useEffect(() => {
    document.title = `${TITULOS[rota] ?? (curso ? 'Curso' : certificado ? 'Certificado' : 'Entrar')} | Nexla Academy`;
  }, [rota, curso, certificado]);

  if (sessao === undefined || (sessao && publica) || (!sessao && !publica)) return <Carregando />;
  if (!sessao) return rota === '/criar-conta' ? <CriarConta /> : <Login />;
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
