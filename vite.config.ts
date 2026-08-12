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
        // OPENAI_API_KEY / ANTHROPIC_API_KEY removed — inlining them shipped live credentials in the
        // public bundle. The legacy AE V1 browser path now reports itself unconfigured; any future
        // OpenAI/Anthropic support must go through a Cloud Function, like Gemini.
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
