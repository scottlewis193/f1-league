import { beforeEach, describe, expect, it, vi } from 'vitest';

const publicEnv = { PUBLIC_VAPID_PUBLIC_KEY: 'AQID' };
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));

beforeEach(() => {
	vi.useRealTimers();
	vi.clearAllMocks();
	vi.stubGlobal('window', { PushManager: function PushManager() {}, Notification: function Notification() {} });
	vi.stubGlobal('Notification', { requestPermission: vi.fn(async () => 'granted') });
	vi.stubGlobal('atob', (value: string) => Buffer.from(value, 'base64').toString('binary'));
	vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
});

describe('push subscription setup', () => {
	it('returns quietly when service workers are unsupported', async () => {
		const { subscribeToPush } = await import('./subscribe');
		vi.stubGlobal('navigator', {});

		await subscribeToPush('user-1');

		expect(Notification.requestPermission).not.toHaveBeenCalled();
	});

	it('stores a new browser push subscription', async () => {
		const { subscribeToPush } = await import('./subscribe');
		const subscription = {
			options: {},
			toJSON: () => ({ endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' } })
		};
		const pushManager = {
			getSubscription: vi.fn(async () => null),
			subscribe: vi.fn(async () => subscription)
		};
		vi.stubGlobal('navigator', {
			serviceWorker: { ready: Promise.resolve({ pushManager }) }
		});

		await subscribeToPush('user-1');

		expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
		expect(fetch).toHaveBeenCalledWith('/api/subscribe', expect.objectContaining({
			method: 'POST',
			body: JSON.stringify({ endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' }, userId: 'user-1' })
		}));
	});

	it('unsubscribes stale subscriptions when VAPID key changes', async () => {
		const { subscribeToPush } = await import('./subscribe');
		const unsubscribe = vi.fn(async () => true);
		const pushManager = {
			getSubscription: vi.fn(async () => ({
				options: { applicationServerKey: new Uint8Array([9]).buffer },
				unsubscribe
			})),
			subscribe: vi.fn(async () => ({
				options: {},
				toJSON: () => ({ endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' } })
			}))
		};
		vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ pushManager }) } });

		await subscribeToPush('user-1');

		expect(unsubscribe).toHaveBeenCalled();
		expect(pushManager.subscribe).toHaveBeenCalled();
	});
});
