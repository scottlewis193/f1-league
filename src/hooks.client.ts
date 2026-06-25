import { dev } from '$app/environment';
import pb from '$lib/pocketbase';

pb.authStore.loadFromCookie(document.cookie);
pb.authStore.onChange(() => {
	document.cookie = pb.authStore.exportToCookie({ httpOnly: false, sameSite: 'lax', secure: !dev });
}, true);
