import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		// Inject a global build timestamp
		__BUILD_TIMESTAMP__: JSON.stringify(Date.now())
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
