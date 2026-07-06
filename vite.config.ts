import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			srcDir: './src',
			strategies: 'injectManifest',
			registerType: 'autoUpdate',
			filename: 'service-worker.js',
			devOptions: { enabled: true, type: 'module' },
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,svg}'],
				cleanupOutdatedCaches: true
			},
			manifest: false
		})
	],
	define: {
		__BUILD_TIMESTAMP__: JSON.stringify(Date.now())
	}
});
