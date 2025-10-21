import pb from '$lib/pocketbase';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
	window.Buffer = Buffer;
}

pb.authStore.loadFromCookie(document.cookie);
pb.authStore.onChange(() => {
	document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
}, true);
