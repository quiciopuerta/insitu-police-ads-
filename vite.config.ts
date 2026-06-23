import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
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
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Insitu AI Ads',
          short_name: 'Insitu AI Ads',
          description: 'Optimización y Planning de Advertising con Inteligencia Artificial',
          theme_color: '#ff477b',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
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
