import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      envPrefix: ['VITE_', 'REACT_APP_'],
      plugins: [react()],
      define: {
        // GEMINI_API_KEY removed — now stored in Firebase Secret Manager and called via Cloud Function
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
        // Prevent crash when accessing process.env in client
        'process.env': {}
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
