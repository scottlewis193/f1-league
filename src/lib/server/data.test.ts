import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = {
	WISE_API_KEY: 'wise-key',
	WISE_API_BASE: 'https://wise.test',
	WISE_ACCOUNT_ID: '123'
};
const wiseFetch = vi.fn();
const getAllWalletsQuery = vi.fn();
const getWalletByIdQuery = vi.fn();
const updateWalletBalance = vi.fn();
const getTransferLogByIdQuery = vi.fn();
const createTransferLog = vi.fn();
const sendNotifications = vi.fn();

vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('./wise', () => ({ wiseFetch }));
vi.mock('./wallets', () => ({
	getAllWalletsQuery,
	getWalletByIdQuery,
	updateWalletBalance,
	payOutWinnings: vi.fn()
}));
vi.mock('./transfers', () => ({ getTransferLogByIdQuery, createTransferLog }));
vi.mock('$lib/notifications', () => ({ sendNotifications }));
vi.mock('./scrapping', () => ({ scrapeAll: vi.fn() }));
vi.mock('./pocketbase', () => ({ getAdminPb: vi.fn() }));
vi.mock('./races', () => ({ getNextRaceQuery: vi.fn(), updateRacesQuery: vi.fn() }));
vi.mock('./odds', () => ({ getOddsQuery: vi.fn(), updateOddsQuery: vi.fn() }));
vi.mock('./teams', () => ({ updateTeamsQuery: vi.fn() }));
vi.mock('./drivers', () => ({ updateDriversQuery: vi.fn() }));
vi.mock('./players', () => ({ getPlayersQuery: vi.fn(), updateAllPlayersQuery: vi.fn() }));
vi.mock('./predictions', () => ({ getPredictionsQuery: vi.fn() }));

beforeEach(() => {
	vi.clearAllMocks();
	wiseFetch.mockResolvedValue([
		{ id: 1, targetAccount: 123, reference: 'wallet-1', targetValue: 10 },
		{ id: 2, targetAccount: 999, reference: 'wallet-1', targetValue: 99 },
		{ id: 3, targetAccount: 123, reference: 'unknown-wallet', targetValue: 5 }
	]);
	getAllWalletsQuery.mockResolvedValue([{ id: 'wallet-1' }]);
	getTransferLogByIdQuery.mockResolvedValue(null);
	getWalletByIdQuery.mockResolvedValue({ id: 'wallet-1', user: 'user-1', balance: 7 });
	createTransferLog.mockResolvedValue({ id: '1', user: 'user-1', wallet: 'wallet-1', amount: 10, type: 'deposit', status: 'complete' });
	sendNotifications.mockResolvedValue({ status: 'notifications_sent', successCount: 1, failCount: 0 });
});

describe('deposit polling', () => {
	it('credits matching new Wise deposits and notifies that user', async () => {
		const { checkForNewDepositsOnce } = await import('./data');

		await checkForNewDepositsOnce();

		expect(wiseFetch).toHaveBeenCalledWith(expect.stringMatching(/^transfers\?status=COMPLETED&createdDateStart=/), 'v1', expect.any(Object));
		expect(createTransferLog).toHaveBeenCalledWith('1', 'user-1', 'wallet-1', 10, 'deposit');
		expect(updateWalletBalance).toHaveBeenCalledWith('wallet-1', 17);
		expect(sendNotifications).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Deposit received', tag: 'wallet-deposit-1' }),
			'user-1'
		);
	});

	it('skips deposits that already have a transfer log', async () => {
		const { checkForNewDepositsOnce } = await import('./data');
		getTransferLogByIdQuery.mockResolvedValue({ id: '1' });

		await checkForNewDepositsOnce();

		expect(createTransferLog).not.toHaveBeenCalled();
		expect(updateWalletBalance).not.toHaveBeenCalled();
		expect(sendNotifications).not.toHaveBeenCalled();
	});
});
