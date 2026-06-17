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
