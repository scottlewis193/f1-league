import { json } from '@sveltejs/kit';
import { getSubscriptions } from './server/subscriptions';
import webpush from 'web-push';
import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { VAPID_PRIVATE_KEY } from '$env/static/private';

export const sendNotifications = async (payload: {
	title?: string;
	body?: string;
	url?: string;
	icon?: string;
	badge?: string;
	tag?: string;
	data?: any;
	actions?: { action: string; title: string; icon?: string }[];
}) => {
	let successCount = 0;
	let failCount = 0;

	webpush.setVapidDetails('mailto:you@example.com', PUBLIC_VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

	const notificationPayload = JSON.stringify(payload);

	for (const sub of await getSubscriptions()) {
		try {
			await webpush.sendNotification(sub, notificationPayload);
			successCount++;
		} catch (err) {
			console.error('Push failed:', err);
			failCount++;
		}
	}

	return json({
		status: 'notifications sent',
		successCount,
		failCount
	});
};
