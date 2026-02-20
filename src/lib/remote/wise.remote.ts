import { query } from '$app/server';
import { wiseFetch } from '$lib/server/wise';
import { WISE_PROFILE_ID } from '$env/static/private';
import * as v from 'valibot';
import { randomUUID } from 'crypto';
export const getBalance = query(async () => {
	const res = await wiseFetch(`profiles/${WISE_PROFILE_ID}/balances?types=STANDARD`, 'v4');
	const data = await res.json();
	console.log(data.balance);
	return data.balance;
});

export const createQuote = query(
	v.object({
		recipientId: v.number(),
		amount: v.number()
	}),
	async ({ recipientId, amount }) => {
		const data = await wiseFetch(`profiles/${WISE_PROFILE_ID}/quotes`, 'v3', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				sourceCurrency: 'GBP',
				targetCurrency: 'GBP',
				targetAccount: recipientId,
				sourceAmount: amount
			})
		});

		return data;
	}
);

export const createTransfer = query(
	v.object({
		quoteUuid: v.string(),
		recipientId: v.number()
	}),
	async ({ quoteUuid, recipientId }) => {
		const customerTransactionId = randomUUID(); //we use this to reattempt the transfer without creating duplicate transfers

		const data = await wiseFetch(`transfers`, 'v1', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				targetAccount: recipientId,
				quoteUuid: quoteUuid,
				customerTransactionId,
				details: {
					reference: 'F1 League Transfer'
				}
			})
		});

		return data;
	}
);

export const fundTransfer = query(v.object({ transferId: v.number() }), async ({ transferId }) => {
	const data = await wiseFetch(
		`profiles/${WISE_PROFILE_ID}/transfers/${transferId}/payments`,
		'v3',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				type: 'BALANCE'
			})
		}
	);

	return data;
});
