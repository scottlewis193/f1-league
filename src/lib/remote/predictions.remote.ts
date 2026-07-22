import { form, getRequestEvent, query } from '$app/server';
import { fail, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { getFeatureFlagStatus } from '$lib/server/data';
import { isPredictionEntryFeeBypassed } from '$lib/utils';
import { PREDICTION_ENTRY_FEE, PREDICTION_WALLET_ID } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { getWalletByUserIdQuery, transferBetweenWallets } from '$lib/server/wallets';
import {
	getNextRacePredictionsQuery,
	getPredictionsQuery,
	getUserPredictionsQuery
} from '$lib/server/predictions';

export const isWageringEnabled = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getFeatureFlagStatus(pb, 'wagering');
});

export const getPredictions = query(async () => {
	return getPredictionsQuery();
});

export const getNextRacePredictions = query(async () => {
	return getNextRacePredictionsQuery();
});

export const getUserPredictions = query(async (_raceId: string = '') => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const user = pb.authStore.record?.id;
	return getUserPredictionsQuery(user || '');
});

export const addUpdatePrediction = form(
	v.object({
		driver1st: v.string(),
		driver2nd: v.string(),
		driver3rd: v.string(),
		raceId: v.string(),
		id: v.optional(v.string()),
		wildPrediction: v.optional(v.string())
	}),
	async (data) => {
		const event = getRequestEvent();
		const pb = event.locals.pb;

		const predictions = [data.driver1st, data.driver2nd, data.driver3rd];
		const user = pb.authStore.record?.id;
		const year = new Date().getFullYear();
		const race = data.raceId;
		const id: string = data.id?.toString() || '';
		const wildPrediction = data.wildPrediction;

		if (id !== '') {
			await pb.collection('predictions').update(id, { predictions, wildPrediction });
		} else {
			const wageringEnabled = await getFeatureFlagStatus(pb, 'wagering');
			const entryFeeBypassed = isPredictionEntryFeeBypassed(
				user,
				env.PREDICTION_ENTRY_FEE_BYPASS_USER_IDS ?? ''
			);
			const entryFeeRequired = wageringEnabled && !entryFeeBypassed;
			let sourceWalletId = '';

			if (entryFeeRequired) {
				try {
					const wallet = await getWalletByUserIdQuery(user || '');
					sourceWalletId = wallet.id;
					await transferBetweenWallets({
						amount: Number(PREDICTION_ENTRY_FEE),
						sourceWalletId,
						targetWalletId: PREDICTION_WALLET_ID,
						userId: user
					});
				} catch {
					return fail(400, { error: 'Unable to collect prediction entry fee' });
				}
			}

			try {
				await pb.collection('predictions').create({
					predictions,
					user,
					year,
					race,
					wildPrediction,
					entryFeePaid: entryFeeRequired
				});
			} catch (error) {
				if (entryFeeRequired) {
					try {
						await transferBetweenWallets({
							amount: Number(PREDICTION_ENTRY_FEE),
							sourceWalletId: PREDICTION_WALLET_ID,
							targetWalletId: sourceWalletId,
							userId: user,
							allowOverdraft: true
						});
					} catch (rollbackError) {
						console.error('Failed to refund prediction entry fee after creation failure', {
							error,
							rollbackError,
							user,
							sourceWalletId
						});
						return fail(500, { error: 'Prediction failed after fee collection; contact support' });
					}
				}

				return fail(400, { error: 'Unable to create prediction' });
			}
		}

		redirect(303, `/predictions`);
	}
);
