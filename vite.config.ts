import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 5173 is fixed on purpose: the server's CORS (Cors:AllowedOrigins) allows exactly http://localhost:5173
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
