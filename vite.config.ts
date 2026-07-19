import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        'devtools-init': resolve(__dirname, 'src/devtools/devtools-init.html'),
        'devtools-panel': resolve(__dirname, 'src/devtools/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        'content-script': resolve(__dirname, 'src/content-script/index.ts'),
        'content-script-standalone': resolve(__dirname, 'src/content-script/standalone.ts'),
        'element-picker': resolve(__dirname, 'src/content-script/element-picker.ts'),
        recorder: resolve(__dirname, 'src/content-script/recorder.ts'),
        player: resolve(__dirname, 'src/content-script/player.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      }
    },
    cssCodeSplit: false,
  }
});
