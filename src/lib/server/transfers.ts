import type { TransferLog } from '$lib/types';
import { getAdminPb } from './pocketbase';

export async function getTransferLogByIdQuery(id: string) {
	const pb = await getAdminPb();
	try {
		const transferLog = await pb.collection('transfer_logs').getFirstListItem(`id='${id}'`);
		return transferLog;
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
	status: 'pending' | 'complete' | 'failed' = 'complete'
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
