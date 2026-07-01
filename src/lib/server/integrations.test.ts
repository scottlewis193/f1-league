import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = {
	WISE_API_KEY: 'wise-key',
	WISE_API_BASE: 'https://wise.test'
};

vi.mock('$env/dynamic/private', () => ({ env }));

const collection = {
	getFirstListItem: vi.fn(),
	getFullList: vi.fn(),
	create: vi.fn(),
	update: vi.fn()
};

vi.mock('./pocketbase', () => ({
	getAdminPb: vi.fn(async () => ({ collection: () => collection }))
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('fetch', vi.fn());
});

describe('Wise API wrapper', () => {
	it('adds auth headers and returns json', async () => {
		const { wiseFetch } = await import('./wise');
		vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true })) as any);

		await expect(wiseFetch('transfers', 'v1', { headers: { 'X-Test': '1' } })).resolves.toEqual({ ok: true });

		expect(fetch).toHaveBeenCalledWith('https://wise.test/v1/transfers', expect.objectContaining({
			headers: expect.objectContaining({ Authorization: 'Bearer wise-key', 'Content-Type': 'application/json', 'X-Test': '1' })
		}));
	});

	it('throws the Wise error body on failure', async () => {
		const { wiseFetch } = await import('./wise');
		vi.mocked(fetch).mockResolvedValue(new Response('bad request', { status: 400, statusText: 'Bad Request' }) as any);

		await expect(wiseFetch('transfers')).rejects.toThrow('400 Bad Request — bad request');
	});
});

describe('push subscription persistence', () => {
	it('creates a new subscription', async () => {
		const { addSubscription } = await import('./subscriptions');
		collection.getFirstListItem.mockRejectedValue(new Error('missing'));

		await addSubscription({ endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' } } as any, 'user-1');

		expect(collection.create).toHaveBeenCalledWith({
			endpoint: 'https://push.test',
			keys: { p256dh: 'p', auth: 'a' },
			userId: 'user-1'
		});
	});

	it('updates an existing anonymous subscription with the user id', async () => {
		const { addSubscription } = await import('./subscriptions');
		collection.getFirstListItem.mockResolvedValue({ id: 'sub-1' });

		await addSubscription({ endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' } } as any, 'user-1');

		expect(collection.update).toHaveBeenCalledWith('sub-1', { userId: 'user-1' });
		expect(collection.create).not.toHaveBeenCalled();
	});

	it('maps subscription records back to web-push shape', async () => {
		const { getSubscriptions, getSubscriptionRecords } = await import('./subscriptions');
		collection.getFullList.mockResolvedValue([
			{ id: 'sub-1', endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' }, expirationTime: 123, userId: 'user-1' }
		]);

		await expect(getSubscriptions('user-1')).resolves.toEqual([
			{ endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' }, expirationTime: 123 }
		]);
		await expect(getSubscriptionRecords('user-1')).resolves.toEqual([
			{ id: 'sub-1', endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' }, expirationTime: 123, userId: 'user-1' }
		]);
		expect(collection.getFullList).toHaveBeenCalledWith({ filter: 'userId="user-1"' });
	});
});
