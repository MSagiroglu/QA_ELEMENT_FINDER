import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') }
  },
  build: {
    outDir: 'dist-standalone',
    rollupOptions: {
      input: {
        'content-script-standalone': resolve(__dirname, 'src/content-script/standalone.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
      }
    },
    cssCodeSplit: false,
  }
});
