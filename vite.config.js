// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // permite conexiones externas (desde otros dispositivos)
    port: 5173,        // puedes cambiarlo si es necesario
  },
});