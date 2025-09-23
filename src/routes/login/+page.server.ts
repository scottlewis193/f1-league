import { redirect } from '@sveltejs/kit';

export const load = async ({ url, locals }) => {
	if (locals.pb.authStore.record) {
		return redirect(303, '/players');
	}

	return {
		url: url.pathname
	};
};
