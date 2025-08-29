import { useRegisterSW } from 'virtual:pwa-register/svelte';

const updateSW = useRegisterSW({
	immediate: true,
	// onNeedRefresh() {
	// 	updateSW(true); // immediately update
	// },

	onRegisteredSW(url, r) {
		r &&
			setInterval(() => {
				console.log('Checking for sw update');
				r.update();
			}, 20000);
		console.log(`SW Registered: ${r}`);
	},
	onOfflineReady() {
		console.log('PWA is ready to work offline');
	}
});
