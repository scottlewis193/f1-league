import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = {
	WISE_API_KEY: 'wise-key',
	WISE_API_BASE: 'https://wise.test',
	WISE_ACCOUNT_ID: '123',
	WISE_PROFILE_ID: '456'
};
const wiseFetch = vi.fn();
const getAllWalletsQuery = vi.fn();
const getWalletByIdQuery = vi.fn();
const adjustWalletBalance = vi.fn();
const getTransferLogByIdQuery = vi.fn();
const getLatestDepositTransferLogQuery = vi.fn();
const createTransferLog = vi.fn();
const sendNotifications = vi.fn();
const payOutWinnings = vi.fn();
const getPlayerStats = vi.fn();
const scrapeAll = vi.fn();
const getAdminPb = vi.fn();
const getNextRaceQuery = vi.fn();
const updateRacesQuery = vi.fn();
const getOddsQuery = vi.fn();
const updateOddsQuery = vi.fn();
const updateTeamsQuery = vi.fn();
const updateDriversQuery = vi.fn();
const getPlayersQuery = vi.fn();
const updateAllPlayersQuery = vi.fn();
const getPredictionsQuery = vi.fn();

vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('./wise', () => ({ wiseFetch }));
vi.mock('./wallets', () => ({
	getAllWalletsQuery,
	getWalletByIdQuery,
	adjustWalletBalance,
	payOutWinnings
}));
vi.mock('./transfers', () => ({
	getTransferLogByIdQuery,
	getLatestDepositTransferLogQuery,
	createTransferLog
}));
vi.mock('$lib/notifications', () => ({ sendNotifications }));
vi.mock('./scraping', () => ({ scrapeAll }));
vi.mock('./pocketbase', () => ({ getAdminPb }));
vi.mock('./races', () => ({ getNextRaceQuery, updateRacesQuery }));
vi.mock('./odds', () => ({ getOddsQuery, updateOddsQuery }));
vi.mock('./teams', () => ({ updateTeamsQuery }));
vi.mock('./drivers', () => ({ updateDriversQuery }));
vi.mock('./players', () => ({ getPlayersQuery, updateAllPlayersQuery }));
vi.mock('./predictions', () => ({ getPredictionsQuery }));
vi.mock('$lib/utils', () => ({ getPlayerStats }));

beforeEach(() => {
	vi.clearAllMocks();
	wiseFetch.mockResolvedValue([
		{ id: 1, targetAccount: 123, reference: 'wallet-1', targetValue: 10 },
		{ id: 2, targetAccount: 999, reference: 'wallet-1', targetValue: 99 },
		{ id: 3, targetAccount: 123, reference: 'unknown-wallet', targetValue: 5 }
	]);
	getAllWalletsQuery.mockResolvedValue([{ id: 'wallet-1' }]);
	getTransferLogByIdQuery.mockResolvedValue(null);
	getLatestDepositTransferLogQuery.mockResolvedValue(null);
	getWalletByIdQuery.mockResolvedValue({ id: 'wallet-1', user: 'user-1', balance: 7 });
	createTransferLog.mockResolvedValue({
		id: '1',
		user: 'user-1',
		wallet: 'wallet-1',
		amount: 10,
		type: 'deposit',
		status: 'complete'
	});
	sendNotifications.mockResolvedValue({
		status: 'notifications_sent',
		successCount: 1,
		failCount: 0
	});
});

describe('deposit polling', () => {
	it('credits matching new Wise deposits and notifies that user', async () => {
		const { checkForNewDepositsOnce } = await import('./data');

		await checkForNewDepositsOnce();

		expect(wiseFetch).toHaveBeenCalledWith(
			expect.stringMatching(
				/^transfers\?profile=456&status=outgoing_payment_sent&offset=0&limit=100&createdDateStart=\d{4}-\d{2}-\d{2}&createdDateEnd=\d{4}-\d{2}-\d{2}$/
			),
			'v1',
			expect.any(Object)
		);
		expect(createTransferLog).toHaveBeenCalledWith('1', 'user-1', 'wallet-1', 10, 'deposit');
		expect(adjustWalletBalance).toHaveBeenCalledWith('wallet-1', 10);
		expect(sendNotifications).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Deposit received', tag: 'wallet-deposit-1' }),
			'user-1'
		);
	});

	it('credits deposits using the current Wise details reference', async () => {
		wiseFetch.mockResolvedValue([
			{
				id: 4,
				targetAccount: 123,
				details: { reference: 'wallet-1' },
				targetValue: 15
			}
		]);

		const { checkForNewDepositsOnce } = await import('./data');
		await checkForNewDepositsOnce();

		expect(createTransferLog).toHaveBeenCalledWith('4', 'user-1', 'wallet-1', 15, 'deposit');
		expect(adjustWalletBalance).toHaveBeenCalledWith('wallet-1', 15);
	});

	it('resumes from the latest persisted deposit with a one-day overlap', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-22T12:00:00.000Z'));
		getLatestDepositTransferLogQuery.mockResolvedValue({
			id: '1',
			created: '2026-07-20 15:30:00.000Z'
		});

		const { checkForNewDepositsOnce } = await import('./data');
		await checkForNewDepositsOnce();

		expect(wiseFetch).toHaveBeenCalledWith(
			'transfers?profile=456&status=outgoing_payment_sent&offset=0&limit=100&createdDateStart=2026-07-19&createdDateEnd=2026-07-23',
			'v1',
			expect.any(Object)
		);
		vi.useRealTimers();
	});

	it('includes deposits created during the current UTC day', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-03T15:29:00.000Z'));

		const { checkForNewDepositsOnce } = await import('./data');
		await checkForNewDepositsOnce();

		expect(wiseFetch).toHaveBeenCalledWith(
			'transfers?profile=456&status=outgoing_payment_sent&offset=0&limit=100&createdDateStart=2026-08-27&createdDateEnd=2026-09-04',
			'v1',
			expect.any(Object)
		);
		vi.useRealTimers();
	});

	it('skips deposits that already have a transfer log', async () => {
		const { checkForNewDepositsOnce } = await import('./data');

		getTransferLogByIdQuery.mockResolvedValue({ id: '1' });

		await checkForNewDepositsOnce();

		expect(createTransferLog).not.toHaveBeenCalled();
		expect(adjustWalletBalance).not.toHaveBeenCalled();
		expect(sendNotifications).not.toHaveBeenCalled();
	});
});

describe('refreshF1DataOnce race-result payout', () => {
	it('pays out every newly-completed race, not just the last one', async () => {
		const { refreshF1DataOnce } = await import('./data');

		// DB currently has NO races with results
		getAdminPb.mockResolvedValue({
			collection: vi.fn(() => ({
				getFullList: vi.fn(async () => [])
			}))
		});

		// scrape returns two races that both got results this cycle
		scrapeAll.mockResolvedValue({
			races: [
				{
					id: 'race-A',
					raceName: 'GP A',
					raceResults: ['Verstappen', 'Norris', 'Leclerc'],
					sessions: [{ date: '2030-01-01', time: '12:00' }],
					year: 2030
				},
				{
					id: 'race-B',
					raceName: 'GP B',
					raceResults: ['Norris', 'Verstappen', 'Leclerc'],
					sessions: [{ date: '2030-02-01', time: '12:00' }],
					year: 2030
				}
			],
			drivers: undefined,
			teams: undefined,
			odds: undefined
		});

		getPlayersQuery.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }]);
		getPredictionsQuery.mockResolvedValue([
			{
				race: 'race-A',
				user: 'user-1',
				predictions: [],
				entryFeePaid: true,
				expand: { user: { id: 'user-1' }, race: { id: 'race-A' } }
			},
			{
				race: 'race-A',
				user: 'user-3',
				predictions: [],
				entryFeePaid: false,
				expand: { user: { id: 'user-3' }, race: { id: 'race-A' } }
			},
			{
				race: 'race-B',
				user: 'user-2',
				predictions: [],
				expand: { user: { id: 'user-2' }, race: { id: 'race-B' } }
			}
		]);
		getOddsQuery.mockResolvedValue([]);
		// getPlayerStats returns race-scoped points so each payout call gets a winner
		getPlayerStats.mockReturnValue({
			points: 0,
			place: 0,
			exact: 0,
			wildPrediction: 0,
			lastPointsEarned: 10,
			historyEntries: []
		});

		await refreshF1DataOnce();

		expect(payOutWinnings).toHaveBeenCalledTimes(2);
		const paidRaceIds = payOutWinnings.mock.calls.map((call) => call[1].id);
		expect(paidRaceIds).toEqual(expect.arrayContaining(['race-A', 'race-B']));
		expect(payOutWinnings.mock.calls.find((call) => call[1].id === 'race-A')).toEqual(
			expect.arrayContaining([expect.any(Array), expect.any(Object), 1])
	);
	});

	it('does not pay out races that already had results', async () => {
		const { refreshF1DataOnce } = await import('./data');

		// DB already has race-A with results
		getAdminPb.mockResolvedValue({
			collection: vi.fn(() => ({
				getFullList: vi.fn(async () => [
					{
						id: 'race-A',
						raceName: 'GP A',
						raceResults: ['Verstappen', 'Norris', 'Leclerc'],
						sessions: [{ date: '2030-01-01', time: '12:00' }],
						year: 2030
					}
				])
			}))
		});

		scrapeAll.mockResolvedValue({
			races: [
				{
					id: 'race-A',
					raceName: 'GP A',
					raceResults: ['Verstappen', 'Norris', 'Leclerc'],
					sessions: [{ date: '2030-01-01', time: '12:00' }],
					year: 2030
				},
				{
					id: 'race-B',
					raceName: 'GP B',
					raceResults: ['Norris', 'Verstappen', 'Leclerc'],
					sessions: [{ date: '2030-02-01', time: '12:00' }],
					year: 2030
				}
			],
			drivers: undefined,
			teams: undefined,
			odds: undefined
		});

		getPlayersQuery.mockResolvedValue([]);
		getPredictionsQuery.mockResolvedValue([]);
		getOddsQuery.mockResolvedValue([]);
		getPlayerStats.mockReturnValue({
			points: 0,
			place: 0,
			exact: 0,
			wildPrediction: 0,
			lastPointsEarned: 0,
			historyEntries: []
		});

		await refreshF1DataOnce();

		// only race-B is newly completed
		expect(payOutWinnings).toHaveBeenCalledTimes(1);
		expect(payOutWinnings.mock.calls[0][1].id).toBe('race-B');
	});
});
