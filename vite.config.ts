import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const version = packageJson.version;
  const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

  const processEnv: Record<string, string> = {
    'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
    'process.env.PAYPAL_MODE': JSON.stringify(env.PAYPAL_MODE),
    '__APP_VERSION__': JSON.stringify(version),
    '__COMMIT_HASH__': JSON.stringify(commitHash),
  };

  return {
    base: '/', // Ensure base path is /
    server: {
      port: 5173,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/.netlify/functions': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react()
    ],
    build: {
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'charts-vendor': ['recharts'],
            'framer-vendor': ['framer-motion'],
            'lucide-vendor': ['lucide-react'],
            'pdf-vendor': ['jspdf', 'jspdf-autotable'],
            'paypal-vendor': ['@paypal/react-paypal-js'],
            'ai-vendor': ['@google/genai']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    define: processEnv,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
