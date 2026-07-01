import { beforeEach, describe, expect, it, vi } from 'vitest';

const addSubscription = vi.fn();
const sendNotifications = vi.fn();
const sendPredictionReminderNotifications = vi.fn();
const sendTestNotification = vi.fn();

vi.mock('$lib/server/subscriptions', () => ({ addSubscription }));
vi.mock('$lib/notifications', () => ({ sendNotifications }));
vi.mock('$lib/server/notifications', () => ({ sendPredictionReminderNotifications, sendTestNotification }));

beforeEach(() => vi.clearAllMocks());

async function jsonOf(response: Response) {
	return response.json();
}

describe('API routes', () => {
	it('rejects invalid push subscriptions', async () => {
		const { POST } = await import('./subscribe/+server');
		const response = await POST({
			request: new Request('https://app.test/api/subscribe', { method: 'POST', body: '{}' }),
			locals: {}
		} as any);

		expect(response.status).toBe(400);
		expect(await jsonOf(response)).toEqual({ status: 'error', message: 'Invalid push subscription' });
		expect(addSubscription).not.toHaveBeenCalled();
	});

	it('stores valid push subscriptions using logged-in user id', async () => {
		const { POST } = await import('./subscribe/+server');
		const subscription = { endpoint: 'https://push.test', keys: { p256dh: 'p', auth: 'a' }, userId: 'body-user' };
		const response = await POST({
			request: new Request('https://app.test/api/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
			locals: { user: { id: 'local-user' } }
		} as any);

		expect(response.status).toBe(200);
		expect(await jsonOf(response)).toEqual({ status: 'subscribed' });
		expect(addSubscription).toHaveBeenCalledWith(subscription, 'local-user');
	});

	it('sends arbitrary notification payloads', async () => {
		const { POST } = await import('./notify/+server');
		sendNotifications.mockResolvedValue({ status: 'notifications_sent', successCount: 1, failCount: 0 });

		const response = await POST({
			request: new Request('https://app.test/api/notify', { method: 'POST', body: JSON.stringify({ title: 'Hi' }) })
		} as any);

		expect(sendNotifications).toHaveBeenCalledWith({ title: 'Hi' });
		expect(await jsonOf(response)).toEqual({ status: 'notifications_sent', successCount: 1, failCount: 0 });
	});

	it('wraps prediction reminder cron results', async () => {
		const { POST } = await import('./notifications/predictions/+server');
		sendPredictionReminderNotifications.mockResolvedValue({
			status: 'dry_run',
			totalUsers: 2,
			submittedUsers: 1,
			nonSubmitters: ['User Two'],
			raceName: 'British GP',
			deadline: '2026-06-01T12:00:00.000Z',
			hoursUntilDeadline: 24,
			successCount: 0,
			failCount: 0
		});

		const response = await POST({ url: new URL('https://app.test/api/notifications/predictions?race=British&message=Go&dry-run=1') } as any);

		expect(sendPredictionReminderNotifications).toHaveBeenCalledWith('British', 'Go', true);
		expect(await jsonOf(response)).toMatchObject({
			success: true,
			dryRun: true,
			data: { status: 'dry_run', nonSubmitterCount: 1, raceName: 'British GP' }
		});
	});

	it('wraps notification test endpoint results', async () => {
		const { GET } = await import('./notifications/test/+server');
		sendTestNotification.mockResolvedValue({ status: 'notifications_sent', message: 'sent', successCount: 1, failCount: 0 });

		const response = await GET({ url: new URL('https://app.test/api/notifications/test?title=T&body=B') } as any);

		expect(sendTestNotification).toHaveBeenCalledWith('T', 'B');
		expect(await jsonOf(response)).toMatchObject({ success: true, type: 'test_notification' });
	});
});
