import type { TransferLog, TransferStatus } from '$lib/types';
import { getAdminPb } from './pocketbase';

export async function getTransferLogByIdQuery(id: string) {
	const pb = await getAdminPb();
	try {
		const transferLog = await pb
			.collection('transfer_logs')
			.getFirstListItem(pb.filter('id = {:id}', { id }));
		return transferLog;
	} catch {
		return null;
	}
}

export async function getLatestDepositTransferLogQuery() {
	const pb = await getAdminPb();
	try {
		return await pb.collection('transfer_logs').getFirstListItem<TransferLog>(
			pb.filter('type = {:type}', { type: 'deposit' }),
			{ sort: '-created' }
		);
	} catch {
		return null;
	}
}

export async function createTransferLog(
	id: string = '',
	userId: string,
	walletId: string,
	amount: number,
	type: 'deposit' | 'withdraw' | 'transfer',
	targetWalletId: string = '',
	status: TransferStatus = 'complete'
) {
	const pb = await getAdminPb();
	return pb.collection('transfer_logs').create<TransferLog>({
		id: id,
		user: userId,
		wallet: walletId,
		amount,
		targetWallet: targetWalletId,
		type,
		status
	});
}

export async function updateTransferLogStatus(
	id: string,
	status: TransferStatus
) {
	const pb = await getAdminPb();
	return pb.collection('transfer_logs').update<TransferLog>(id, { status });
}

export async function completeWithdrawal({
	transferLogId,
	walletId,
	balance
}: {
	transferLogId: string;
	walletId: string;
	balance: number;
}) {
	const pb = await getAdminPb();
	const batch = pb.createBatch();
	batch.collection('wallets').update(walletId, { balance });
	batch.collection('transfer_logs').update(transferLogId, { status: 'complete' });
	await batch.send();
}
