import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const race = {
	id: 'race-2026-test',
	raceName: 'Test Grand Prix',
	year: 2026,
	sessions: [{ date: '15 Jun', time: '15:00', title: 'Practice 1' }]
};
const flags = new Set<string>();
const sendNotifications = vi.fn();
const getAdminPb = vi.fn(async () => ({
	filter: (query: string, params: Record<string, string>) => query.replace('{:name}', `'${params.name}'`),
	collection: (name: string) => {
		if (name === 'users') return { getFullList: async () => [{ id: 'user-1', name: 'Driver' }] };
		if (name === 'feature_flags') return {
			getFirstListItem: async (filter: string) => {
				const name = filter.match(/'([^']+)'/)?.[1] ?? '';
				if (!flags.has(name)) throw { status: 404 };
				return { name, enabled: true };
			},
			create: async (record: { name: string }) => { flags.add(record.name); return record; }
		};
		throw new Error(`Unexpected collection: ${name}`);
	}
}));

vi.mock('./pocketbase', () => ({ getAdminPb }));
vi.mock('./races', () => ({ getRacesQuery: vi.fn(async () => [race]), getNextRaceQuery: vi.fn(async () => race) }));
vi.mock('./predictions', () => ({ getPredictionsQuery: vi.fn(async () => []) }));
vi.mock('$lib/notifications', () => ({ sendNotifications }));

beforeEach(() => {
	flags.clear();
	sendNotifications.mockReset().mockResolvedValue({ status: 'notifications_sent', successCount: 1, failCount: 0 });
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-06-15T15:10:00Z'));
});

afterEach(() => vi.useRealTimers());

describe('prediction closure notifications', () => {
	it('sends the closure once across repeated cron calls', async () => {
		const { sendPredictionReminderNotifications } = await import('./notifications');
		await sendPredictionReminderNotifications();
		const repeat = await sendPredictionReminderNotifications();
		expect(sendNotifications).toHaveBeenCalledTimes(1);
		expect(repeat.status).toBe('window_already_notified');
	});

	it('checks often enough to avoid multi-hour closure delays', () => {
		const workflow = readFileSync(new URL('../../../.github/workflows/prediction-reminders.yml', import.meta.url), 'utf8');
		expect(workflow).toContain("cron: '0 */6 * * *'");
		expect(workflow).toContain("cron: '*/10 * * * *'");
		expect(workflow).toContain('closure-only=1');
	});

	it('does not send a reminder during a closure-only check before the deadline', async () => {
		vi.setSystemTime(new Date('2026-06-15T14:50:00Z'));
		const { sendPredictionReminderNotifications } = await import('./notifications');
		const result = await sendPredictionReminderNotifications(undefined, undefined, false, true);
		expect(result.status).toBe('awaiting_closure');
		expect(sendNotifications).not.toHaveBeenCalled();
	});
});
