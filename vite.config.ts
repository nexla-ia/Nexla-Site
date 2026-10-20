import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/* No servidor local, rotas da Academy (/academy/criar-conta, ...) abrem academy/index.html.
 * Em produção, quem faz isso é o rewrite do vercel.json. */
const academyFallback = (): Plugin => ({
  name: 'academy-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? '';
      if (/^\/academy(\/[^.]*)?(\?.*)?$/.test(url)) req.url = '/academy/index.html';
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), academyFallback()],
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        // Página de captura da campanha 5×2 → nexla.com.br/5x2
        lp5x2: resolve(__dirname, '5x2/index.html'),
        // Nexla Academy (plataforma de cursos) → nexla.com.br/academy
        academy: resolve(__dirname, 'academy/index.html'),
      },
    },
  },
});
