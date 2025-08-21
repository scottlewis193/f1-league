import { redirect } from '@sveltejs/kit';

export const load = async ({ url, locals }) => {
	if (!locals.pb.authStore.record) {
		return redirect(303, '/login');
	} else {
		redirect(303, '/players');
	}
};
