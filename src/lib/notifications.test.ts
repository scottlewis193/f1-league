import { beforeEach, describe, expect, it, vi } from 'vitest';

const publicEnv = { PUBLIC_VAPID_PUBLIC_KEY: 'public-key' };
const privateEnv = { VAPID_PRIVATE_KEY: 'private-key' };
const getSubscriptions = vi.fn();
const setVapidDetails = vi.fn();
const sendNotification = vi.fn();

vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('./server/subscriptions', () => ({ getSubscriptions }));
vi.mock('web-push', () => ({ default: { setVapidDetails, sendNotification } }));

beforeEach(() => {
	vi.clearAllMocks();
	publicEnv.PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
	privateEnv.VAPID_PRIVATE_KEY = 'private-key';
	getSubscriptions.mockResolvedValue([{ endpoint: 'https://push.test' }]);
	sendNotification.mockResolvedValue(undefined);
});

describe('sendNotifications', () => {
	it('skips when VAPID env is missing', async () => {
		const { sendNotifications } = await import('./notifications');
		publicEnv.PUBLIC_VAPID_PUBLIC_KEY = '';

		await expect(sendNotifications({ title: 'Hi' })).resolves.toMatchObject({
			status: 'notifications skipped',
			reason: 'missing_vapid_public_key'
		});
		expect(getSubscriptions).not.toHaveBeenCalled();
	});

	it('sends payloads to matching subscriptions', async () => {
		const { sendNotifications } = await import('./notifications');

		await expect(sendNotifications({ title: 'Hi', body: 'There' }, 'user-1')).resolves.toEqual({
			status: 'notifications_sent',
			successCount: 1,
			failCount: 0
		});

		expect(setVapidDetails).toHaveBeenCalledWith('mailto:sl193@pm.me', 'public-key', 'private-key');
		expect(getSubscriptions).toHaveBeenCalledWith('user-1');
		expect(sendNotification).toHaveBeenCalledWith({ endpoint: 'https://push.test' }, JSON.stringify({ title: 'Hi', body: 'There' }));
	});

	it('reports mixed push failures', async () => {
		const { sendNotifications } = await import('./notifications');
		getSubscriptions.mockResolvedValue([{ endpoint: 'ok' }, { endpoint: 'bad' }]);
		sendNotification.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('gone'));

		await expect(sendNotifications({ title: 'Hi' })).resolves.toEqual({
			status: 'notifications_sent',
			successCount: 1,
			failCount: 1
		});
	});
});
