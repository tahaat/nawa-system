import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
// الوضع الافتراضي: ملف HTML واحد يعمل بالنقر المزدوج دون خادم أو إنترنت
export default defineConfig({ plugins: [viteSingleFile()], assetsInclude: ['**/*.xlsx'], build: { target: 'es2022', chunkSizeWarningLimit: 4000, assetsInlineLimit: 100000000 }, server: { host: '0.0.0.0', port: 5173 } });
