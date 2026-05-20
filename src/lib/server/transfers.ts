import pb, { getServerPb } from './pocketbase';

export async function getTransferLogByIdQuery(id: string) {
	const pb = await getServerPb();
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
	targetWalletId: string = ''
) {
	const pb = await getServerPb();
	await pb.collection('transfer_logs').create({
		id: id,
		user: userId,
		wallet: walletId,
		amount,
		targetWallet: targetWalletId,
		type
	});
}
