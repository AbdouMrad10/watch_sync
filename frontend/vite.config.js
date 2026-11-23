import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, le front (port 5173) redirige le temps réel vers le serveur (port 3000).
// Le serveur réel (équipe back) ou le serveur simulé (`npm run mock`) peuvent écouter sur ce port.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': 'http://localhost:3000',
    },
  },
  test: { environment: 'node' },
});
