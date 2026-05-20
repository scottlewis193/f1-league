import { PUBLIC_PB_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import PocketBase from 'pocketbase';

const pb = new PocketBase(PUBLIC_PB_URL);
pb.autoCancellation(false);

let authenticated = false;

export async function getServerPb() {
	if (!authenticated) {
		if (!env.PB_USER || !env.PB_PASS) {
			throw new Error('PocketBase server auth is not configured. Set PB_USER and PB_PASS runtime environment variables.');
		}

		await pb.collection('users').authWithPassword(env.PB_USER, env.PB_PASS);
		authenticated = true;
		console.log('server auth');
	}
	return pb;
}

export default pb;
