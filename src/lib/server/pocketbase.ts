import { PUBLIC_PB_URL } from '$env/static/public';
import { PB_USER, PB_PASS } from '$env/static/private';
import PocketBase from 'pocketbase';

const pb = new PocketBase(PUBLIC_PB_URL);
pb.autoCancellation(false);

let authenticated = false;

export async function getServerPb() {
	if (!authenticated) {
		await pb.collection('users').authWithPassword(PB_USER, PB_PASS);
		authenticated = true;
		console.log('server auth');
	}
	return pb;
}

export default pb;
