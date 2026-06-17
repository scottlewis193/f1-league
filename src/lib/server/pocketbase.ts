import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1');
pb.autoCancellation(false);

let authenticated = false;
let configuredUrl: string | undefined;

function configurePocketBaseUrl() {
	const pbUrl = publicEnv.PUBLIC_PB_URL;

	if (!pbUrl) {
		throw new Error('PocketBase URL is not configured. Set PUBLIC_PB_URL runtime environment variable.');
	}

	if (configuredUrl !== pbUrl) {
		pb.baseURL = pbUrl;
		configuredUrl = pbUrl;
		authenticated = false;
	}
}

export async function getAdminPb() {
	configurePocketBaseUrl();

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

export const getServerPb = getAdminPb;

export default pb;
