import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Landing5x2 from './Landing5x2';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Landing5x2 />
  </StrictMode>
);
