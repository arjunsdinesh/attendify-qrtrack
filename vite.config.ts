
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Improve hot module replacement performance
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react({
      // Use valid options for react plugin
      jsxRuntime: 'automatic',
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize chunk loading
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide') || id.includes('@radix')) {
              return 'vendor-ui';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }
          
          if (id.includes('/src/pages/')) {
            return 'pages';
          }
          
          if (id.includes('/src/components/')) {
            if (id.includes('/ui/')) {
              return 'ui-components';
            }
            return 'components';
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    esbuildOptions: {
      target: 'esnext',
      // Improve module parsing performance
      tsconfigRaw: '{"compilerOptions":{"importsNotUsedAsValues":"remove"}}',
    },
  },
  // Improve CSS handling
  css: {
    devSourcemap: false,
  },
}));
