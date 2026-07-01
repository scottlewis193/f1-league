import type { TransferLog, Wallet } from '$lib/types';

export function isIncomingTransfer(transferLog: TransferLog, wallet: Wallet | undefined) {
	if (!wallet) return false;
	return (
		transferLog.type === 'deposit' ||
		(transferLog.type === 'transfer' && transferLog.targetWallet === wallet.id)
	);
}

export function isOutgoingTransfer(transferLog: TransferLog, wallet: Wallet | undefined) {
	if (!wallet) return false;
	return (
		transferLog.type === 'withdraw' ||
		(transferLog.type === 'transfer' && transferLog.wallet === wallet.id)
	);
}

export function formatTransferAmount(transferLog: TransferLog, wallet: Wallet | undefined) {
	const prefix = isIncomingTransfer(transferLog, wallet)
		? '+'
		: isOutgoingTransfer(transferLog, wallet)
			? '-'
			: '';
	return `${prefix}${transferLog.amount.toFixed(2)}`;
}

export function formatTransferType(transferLog: TransferLog, wallet: Wallet | undefined) {
	if (transferLog.type === 'transfer') {
		return isIncomingTransfer(transferLog, wallet) ? 'Transfer In' : 'Transfer Out';
	}

	return transferLog.type.charAt(0).toUpperCase() + transferLog.type.slice(1);
}

export function formatTransferDate(created: string) {
	return new Date(created).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

export function walletActivityNotificationPayload(transferLog: TransferLog):
	| {
			title: string;
			body: string;
			url: string;
			tag: string;
			data: Record<string, string>;
	  }
	| undefined {
	const amount = `£${transferLog.amount.toFixed(2)}`;

	if (transferLog.type === 'deposit') {
		return {
			title: 'Deposit received',
			body: `${amount} has been added to your F1 League wallet.`,
			url: '/wallet',
			tag: `wallet-deposit-${transferLog.id}`,
			data: { url: '/wallet', transferId: transferLog.id, type: transferLog.type }
		};
	}

	if (transferLog.type === 'withdraw') {
		return {
			title: transferLog.status === 'failed' ? 'Withdrawal failed' : 'Withdrawal sent',
			body:
				transferLog.status === 'failed'
					? `${amount} could not be withdrawn from your F1 League wallet.`
					: `${amount} has been withdrawn from your F1 League wallet.`,
			url: '/wallet',
			tag: `wallet-withdraw-${transferLog.id}`,
			data: {
				url: '/wallet',
				transferId: transferLog.id,
				type: transferLog.type,
				status: transferLog.status
			}
		};
	}
}
