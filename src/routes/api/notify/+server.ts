import { type RequestHandler } from '@sveltejs/kit';
import { sendNotifications } from '$lib/notifications';

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.json(); // e.g. { title: 'Hello', body: 'Test' }
	return sendNotifications(payload);
};
