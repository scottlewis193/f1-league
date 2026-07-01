import { describe, expect, it } from 'vitest';
import type { TransferLog, Wallet } from '$lib/types';
import {
	formatTransferAmount,
	formatTransferDate,
	formatTransferType,
	isIncomingTransfer,
	isOutgoingTransfer,
	walletActivityNotificationPayload
} from './wallets';

const wallet = { id: 'wallet-a' } as Wallet;

function transferLog(partial: Partial<TransferLog>): TransferLog {
	return {
		id: 'log-1',
		created: '2026-06-15T12:00:00Z',
		user: 'user-1',
		wallet: 'wallet-a',
		targetWallet: '',
		amount: 12.5,
		type: 'deposit',
		status: 'complete',
		...partial
	};
}

describe('wallet domain helpers', () => {
	it('identifies deposits as incoming', () => {
		const log = transferLog({ type: 'deposit' });
		expect(isIncomingTransfer(log, wallet)).toBe(true);
		expect(isOutgoingTransfer(log, wallet)).toBe(false);
		expect(formatTransferAmount(log, wallet)).toBe('+12.50');
		expect(formatTransferType(log, wallet)).toBe('Deposit');
	});

	it('identifies withdrawals as outgoing', () => {
		const log = transferLog({ type: 'withdraw' });
		expect(isIncomingTransfer(log, wallet)).toBe(false);
		expect(isOutgoingTransfer(log, wallet)).toBe(true);
		expect(formatTransferAmount(log, wallet)).toBe('-12.50');
		expect(formatTransferType(log, wallet)).toBe('Withdraw');
	});

	it('labels transfers relative to the current wallet', () => {
		const transferIn = transferLog({
			type: 'transfer',
			wallet: 'wallet-b',
			targetWallet: 'wallet-a'
		});
		const transferOut = transferLog({
			type: 'transfer',
			wallet: 'wallet-a',
			targetWallet: 'wallet-b'
		});

		expect(formatTransferType(transferIn, wallet)).toBe('Transfer In');
		expect(formatTransferAmount(transferIn, wallet)).toBe('+12.50');
		expect(formatTransferType(transferOut, wallet)).toBe('Transfer Out');
		expect(formatTransferAmount(transferOut, wallet)).toBe('-12.50');
	});

	it('formats transfer dates using gb locale ordering', () => {
		expect(formatTransferDate('2026-06-15T12:00:00Z')).toBe('15 Jun 2026');
	});

	it('builds a deposit notification payload', () => {
		const payload = walletActivityNotificationPayload(transferLog({ id: 'wise-1', type: 'deposit' }));

		expect(payload).toMatchObject({
			title: 'Deposit received',
			body: '£12.50 has been added to your F1 League wallet.',
			url: '/wallet',
			tag: 'wallet-deposit-wise-1',
			data: { url: '/wallet', transferId: 'wise-1', type: 'deposit' }
		});
	});

	it('builds withdrawal notification payloads', () => {
		expect(walletActivityNotificationPayload(transferLog({ id: 'wise-2', type: 'withdraw' }))).toMatchObject(
			{
				title: 'Withdrawal sent',
				body: '£12.50 has been withdrawn from your F1 League wallet.',
				tag: 'wallet-withdraw-wise-2'
			}
		);
		expect(
			walletActivityNotificationPayload(
				transferLog({ id: 'wise-3', type: 'withdraw', status: 'failed' })
			)
		).toMatchObject({
			title: 'Withdrawal failed',
			body: '£12.50 could not be withdrawn from your F1 League wallet.',
			tag: 'wallet-withdraw-wise-3'
		});
	});
});
