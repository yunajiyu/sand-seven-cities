import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// dev: 일반 로컬 서버 / build: 모든 파일을 dist/index.html 하나로 합침
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2020', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 },
});
