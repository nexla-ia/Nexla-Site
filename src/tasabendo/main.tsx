import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TaSabendo from './TaSabendo';
import '../index.css';
import './tasabendo.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TaSabendo />
  </StrictMode>
);
