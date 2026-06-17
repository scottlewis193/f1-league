import { json } from '@sveltejs/kit';
import { getSubscriptions } from './server/subscriptions';
import webpush from 'web-push';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';

/**
 * Send push notifications to subscribers.
 *
 * @param payload - Notification payload
 * @param userId - Optional user ID to filter subscriptions
 */
export const sendNotifications = async (
	payload: {
		title?: string;
		body?: string;
		url?: string;
		icon?: string;
		badge?: string;
		tag?: string;
		data?: { [key: string]: string | number | boolean };
		actions?: { action: string; title: string; icon?: string }[];
	},
	userId?: string
) => {
	let successCount = 0;
	let failCount = 0;

	// --- Step 1: Verify env vars ---
	const publicKey = publicEnv.PUBLIC_VAPID_PUBLIC_KEY;
	const privateKey = env.VAPID_PRIVATE_KEY;

	if (!publicKey) {
		console.error('VAPID_PUBLIC_KEY is not configured');
		return json({
			status: 'notifications skipped',
			reason: 'missing_vapid_public_key',
			successCount: 0,
			failCount: 0
		});
	}

	if (!privateKey) {
		console.error('VAPID_PRIVATE_KEY is not configured (server env var)');
		return json({
			status: 'notifications skipped',
			reason: 'missing_vapid_private_key',
			successCount: 0,
			failCount: 0
		});
	}

	try {
		webpush.setVapidDetails('mailto:sl193@pm.me', publicKey, privateKey);
	} catch (err: unknown) {
		console.error('Failed to set VAPID details:', err);
		const msg = err instanceof Error ? err.message : String(err);
		return json({
			status: 'notifications skipped',
			reason: 'vapid_setup_failed',
			error: msg,
			successCount: 0,
			failCount: 0
		});
	}

	// --- Step 2: Fetch subscriptions ---
	let subscriptions;
	try {
		subscriptions = await getSubscriptions(userId);
	} catch (err: unknown) {
		console.error('Failed to fetch subscriptions:', err);
		const msg = err instanceof Error ? err.message : String(err);
		return json({
			status: 'notifications skipped',
			reason: 'subscription_fetch_failed',
			error: msg,
			successCount: 0,
			failCount: 0
		});
	}

	console.log(`Found ${subscriptions.length} subscription(s) to notify`);

	if (!subscriptions.length) {
		console.log('No subscriptions to send notifications to');
		return json({
			status: 'no_subscriptions',
			reason: 'no_active_subscriptions',
			successCount: 0,
			failCount: 0
		});
	}

	// --- Step 3: Send notifications ---
	const notificationPayload = JSON.stringify(payload);
	const sendPromises = subscriptions.map(async (sub) => {
		try {
			await webpush.sendNotification(sub, notificationPayload);
			return { success: true };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error('Push failed for endpoint:', sub.endpoint?.slice(0, 30) + '...', msg);
			return { success: false };
		}
	});

	const results = await Promise.all(sendPromises);
	successCount = results.filter((r) => r.success).length;
	failCount = results.filter((r) => !r.success).length;

	console.log(`Notifications sent: ${successCount} success, ${failCount} failed`);

	return json({
		status: successCount > 0 ? 'notifications_sent' : 'all_failed',
		successCount,
		failCount
	});
};
