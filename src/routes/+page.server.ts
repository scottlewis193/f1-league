import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.pb.authStore.record) {
		console.log('User is not logged in');
		return redirect(303, '/login');
	} else {
		redirect(303, '/players');
	}
};
