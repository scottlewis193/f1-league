import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'prompt',
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.js', // output SW for browser
			devOptions: { enabled: true },
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,svg}']
			},
			manifest: {
				name: 'F1 League',
				short_name: 'F1 League',
				start_url: '/',
				display: 'standalone',
				background_color: '#000000',
				theme_color: '#000000',
				icons: [
					{
						src: '/logo.png',
						sizes: 'any',
						type: 'image/png'
					}
				]
			}
		})
	],
	define: {
		// Inject a global build timestamp
		__BUILD_TIMESTAMP__: JSON.stringify(Date.now())
	},
	server: {
		allowedHosts: true
	}
	// server: {
	// 	https: {
	// 		key: fs.readFileSync(path.resolve('localhost-key.pem')),
	// 		cert: fs.readFileSync(path.resolve('localhost.pem'))
	// 	},
	// 	host: 'localhost',
	// 	port: 5173
	// }
});
