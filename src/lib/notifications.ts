import { json } from '@sveltejs/kit';
import { getSubscriptions } from './server/subscriptions';
import webpush from 'web-push';
import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const sendNotifications = async (payload: {
	title?: string;
	body?: string;
	url?: string;
	icon?: string;
	badge?: string;
	tag?: string;
	data?: { [key: string]: string | number | boolean };
	actions?: { action: string; title: string; icon?: string }[];
}) => {
	let successCount = 0;
	let failCount = 0;

	webpush.setVapidDetails('mailto:sl193@pm.me', PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

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
