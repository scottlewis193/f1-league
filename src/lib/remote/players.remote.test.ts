import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Wallet } from '$lib/types';

const getRequestEvent = vi.fn();
const createQuote = vi.fn();
const createTransfer = vi.fn();
const fundTransfer = vi.fn();
const getWalletByUserIdQuery = vi.fn();
const createTransferLog = vi.fn();
const updateTransferLogStatus = vi.fn();
const completeWithdrawal = vi.fn();
const sendNotifications = vi.fn();

vi.mock('$app/server', () => {
	const remote = (handler: (...args: any[]) => any) =>
		Object.assign(handler, { __: { type: 'form' } });

	return {
		command: vi.fn((...args: any[]) => remote(args.at(-1))),
		form: vi.fn((schemaOrHandler, handler) => remote(handler ?? schemaOrHandler)),
		getRequestEvent,
		query: vi.fn((handler) => remote(handler))
	};
});

vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn((status, data) => ({ status, ...data })),
	redirect: vi.fn()
}));

vi.mock('./wise.remote', () => ({ createQuote, createTransfer, fundTransfer }));
vi.mock('$lib/server/players', () => ({
	getPlayersWithStatsQuery: vi.fn(),
	getPlayerWithStatsQuery: vi.fn(),
	updatePlayerQuery: vi.fn()
}));
vi.mock('$lib/server/wallets', () => ({ getWalletByUserIdQuery }));
vi.mock('$lib/server/transfers', () => ({
	completeWithdrawal,
	createTransferLog,
	updateTransferLogStatus
}));
vi.mock('$lib/notifications', () => ({ sendNotifications }));
vi.mock('$lib/domain/wallets', () => ({
	walletActivityNotificationPayload: vi.fn((log) => ({ id: log.id, status: log.status }))
}));

const wallet = {
	id: 'wallet-1',
	user: 'user-1',
	balance: 25,
	wiseRecipientId: 123
} as Wallet;

beforeEach(() => {
	vi.clearAllMocks();
	getRequestEvent.mockReturnValue({
		locals: {
			pb: { authStore: { record: { id: 'user-1' } } }
		}
	});
	getWalletByUserIdQuery.mockResolvedValue(wallet);
	createQuote.mockResolvedValue({ id: 'quote-1' });
	createTransfer.mockResolvedValue({ id: 456 });
	fundTransfer.mockResolvedValue({});
	createTransferLog.mockResolvedValue({ id: '456', type: 'withdraw', amount: 10, status: 'pending' });
	updateTransferLogStatus.mockImplementation(async (id, status) => ({
		id,
		type: 'withdraw',
		amount: 10,
		status
	}));
	completeWithdrawal.mockResolvedValue(undefined);
	sendNotifications.mockResolvedValue(undefined);
});

describe('withdraw', () => {
	it('records and completes a withdrawal only after Wise funding succeeds', async () => {
		const { withdraw } = await import('./players.remote');
		const submitWithdrawal = withdraw as unknown as (data: { amount: number }) => Promise<void>;

		await submitWithdrawal({ amount: 10 });

		expect(createTransferLog).toHaveBeenCalledWith(
			'456',
			'user-1',
			'wallet-1',
			10,
			'withdraw',
			'',
			'pending'
		);
		expect(fundTransfer).toHaveBeenCalledWith({ transferId: 456 });
		expect(completeWithdrawal).toHaveBeenCalledWith({
			transferLogId: '456',
			walletId: 'wallet-1',
			balance: 15
		});
		expect(createTransferLog.mock.invocationCallOrder[0]).toBeLessThan(
			fundTransfer.mock.invocationCallOrder[0]
		);
	});

	it('marks the pending withdrawal as failed without debiting the wallet when Wise funding fails', async () => {
		const fundingError = new Error('Wise funding failed');
		fundTransfer.mockRejectedValue(fundingError);
		const { withdraw } = await import('./players.remote');
		const submitWithdrawal = withdraw as unknown as (data: { amount: number }) => Promise<void>;

		await expect(submitWithdrawal({ amount: 10 })).rejects.toThrow('Wise funding failed');

		expect(createTransferLog).toHaveBeenCalledWith(
			'456',
			'user-1',
			'wallet-1',
			10,
			'withdraw',
			'',
			'pending'
		);
		expect(updateTransferLogStatus).toHaveBeenCalledWith('456', 'failed');
		expect(completeWithdrawal).not.toHaveBeenCalled();
	});
});
