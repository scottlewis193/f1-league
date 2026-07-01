import { command, form, getRequestEvent, query } from '$app/server';
import type { Player, Wallet } from '$lib/types';
import { fail, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { createQuote, createTransfer, fundTransfer } from './wise.remote';
import {
	getPlayersWithStatsQuery,
	getPlayerWithStatsQuery,
	updatePlayerQuery
} from '$lib/server/players';
import { getWalletByUserIdQuery } from '$lib/server/wallets';
import { createTransferLog } from '$lib/server/transfers';
import { sendNotifications } from '$lib/notifications';
import { walletActivityNotificationPayload } from '$lib/domain/wallets';

const playerProfileSchema = v.intersect([
	v.object({
		name: v.string(),
		email: v.string(),
		password: v.string(),
		passwordConfirm: v.string(),
		avatar: v.optional(v.file())
	}),
	v.record(v.string(), v.any())
]);

const playerLoginSchema = v.object({
	email: v.string(),
	password: v.string()
});

const playerRegisterSchema = v.object({
	name: v.string(),
	email: v.string(),
	password: v.string(),
	passwordConfirm: v.string()
});

export const getPlayersWithStats = query(async () => {
	return getPlayersWithStatsQuery();
});

export const getPlayerLocal = query(async () => {
	const event = getRequestEvent();
	return event.locals.user;
});

export const getPlayerWallet = query(async () => {
	const event = getRequestEvent();
	const player = event.locals.user;
	if (!player) throw new Error('Unauthorized');
	const wallet = await getWalletByUserIdQuery(player.id);
	return wallet;
});

export const getCurrentPlayerWithStats = query(async () => {
	const event = getRequestEvent();
	if (!event.locals.user?.id) return;
	const playerWithStats = await getPlayerWithStatsQuery(event.locals.user?.id);
	return playerWithStats;
});

export const updateCurrentPlayer = command('unchecked', async (playerData: Player) => {
	const event = getRequestEvent();
	await updatePlayerQuery(event.locals.user?.id || '', playerData);
});

export const updatePlayerProfile = form(playerProfileSchema, async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	// remove empty string values
	Object.keys(data).forEach((key) => {
		if (data[key] === '') delete data[key];
	});

	if (!event.locals.user?.id) return;

	await pb.collection('users').update(event.locals.user?.id, data);

	return redirect(303, `/profile`);
});

export const login = form(playerLoginSchema, async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const { email, password } = data;

	if (!email || !password) {
		return fail(400, { error: 'Email and password are required' });
	}

	try {
		await pb.collection('users').authWithPassword(email.toString(), password.toString());
	} catch (error) {
		console.error('PocketBase login failed:', error);
		return fail(400, { error: 'Invalid email or password' });
	}

	if (!pb.authStore.isValid) {
		return fail(400, { error: 'Invalid email or password' });
	}
	return redirect(303, `/`);
});

export const logout = form(() => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	pb.authStore.clear();
	return redirect(303, `/login`);
});

export const register = form(playerRegisterSchema, async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const { name, email, password, passwordConfirm } = data;

	if (password !== passwordConfirm) {
		return fail(400, { error: 'Passwords do not match' });
	}

	await pb.collection('users').create({ name, email, password, passwordConfirm });

	return redirect(303, `/login`);
});

export const withdraw = form(v.object({ amount: v.number() }), async ({ amount }) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	if (!pb.authStore.record) {
		return fail(400, { error: 'Not logged in' });
	}

	const userWallet: Wallet = await getWalletByUserIdQuery(pb.authStore.record.id);

	if (amount > userWallet.balance) {
		return fail(400, { error: 'Amount exceeds balance' });
	}

	if (!userWallet.wiseRecipientId) {
		return fail(400, { error: 'Bank account not configured' });
	}

	//wise transfer to bank account

	//1. create quote
	const quote = await createQuote({ recipientId: userWallet.wiseRecipientId, amount });

	//2. create transfer using quote
	const transfer = await createTransfer({
		quoteUuid: quote.id,
		recipientId: userWallet.wiseRecipientId
	});

	//3. fund transfer (complete)
	await fundTransfer({ transferId: transfer.id });

	//update balance in db
	await pb.collection('wallets').update(userWallet.id, { balance: userWallet.balance - amount });

	//create transfer log
	const transferLog = await createTransferLog(
		String(transfer.id),
		pb.authStore.record.id,
		userWallet.id,
		amount,
		'withdraw',
		'',
		'complete'
	);

	const payload = walletActivityNotificationPayload(transferLog);
	if (payload) {
		sendNotifications(payload, pb.authStore.record.id).catch((error) =>
			console.error('Withdrawal notification failed:', error)
		);
	}

	redirect(303, `/wallet`);
});
