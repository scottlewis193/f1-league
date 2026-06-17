import { addSubscription } from '$lib/server/subscriptions';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const subscription = await request.json();

		if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
			return json({ status: 'error', message: 'Invalid push subscription' }, { status: 400 });
		}

		// Get user ID if logged in
		const userId = locals.user?.id || subscription.userId;

		// Store subscription with optional userId
		await addSubscription(subscription, userId);

		return json({ status: 'subscribed' });
	} catch (error) {
		console.error('Failed to store push subscription:', error);
		return json({ status: 'error', message: 'Failed to store push subscription' }, { status: 500 });
	}
};
