import type { PushSubscription } from 'web-push';
import { getAdminPb } from './pocketbase';

export interface SubscriptionRecord extends PushSubscription {
	id: string;
	userId?: string;
}

export async function addSubscription(subscription: PushSubscription, userId?: string) {
	const pb = await getAdminPb();
	const endpoint = subscription.endpoint;

	// Check if a record already exists with this endpoint
	const existing = await pb
		.collection('subscriptions')
		.getFirstListItem(`endpoint="${endpoint}"`)
		.catch(() => null);

	const data = {
		endpoint: subscription.endpoint,
		keys: subscription.keys,
		...(subscription.expirationTime != null ? { expirationTime: subscription.expirationTime } : {}),
		...(userId ? { userId } : {})
	};

	if (!existing) {
		await pb.collection('subscriptions').create(data);
	} else if (userId && !existing.userId) {
		// Update existing record with userId if it was added later
		await pb.collection('subscriptions').update(existing.id, { userId });
	}
}

export async function getSubscriptions(userId?: string): Promise<PushSubscription[]> {
	const pb = await getAdminPb();
	
	let filter = '';
	if (userId) {
		filter = `userId="${userId}"`;
	}
	
	const records = await pb.collection('subscriptions').getFullList({ filter });
	return records.map((record) => ({
		endpoint: record.endpoint,
		keys: record.keys,
		expirationTime: record.expirationTime
	}));
}

/**
 * Get subscription records with IDs for management operations
 */
export async function getSubscriptionRecords(userId?: string): Promise<SubscriptionRecord[]> {
	const pb = await getAdminPb();
	
	let filter = '';
	if (userId) {
		filter = `userId="${userId}"`;
	}
	
	const records = await pb.collection('subscriptions').getFullList({ filter });
	return records.map((record) => ({
		id: record.id,
		endpoint: record.endpoint,
		keys: record.keys,
		expirationTime: record.expirationTime,
		userId: record.userId
	}));
}
