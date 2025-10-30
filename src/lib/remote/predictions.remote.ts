import { form, getRequestEvent, query } from '$app/server';
import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import {
	getFeatureFlagStatus,
	getNextRacePredictionsDb,
	getPredictionsDb,
	getUserPredictionsDb
} from '$lib/server/data';

export const isWageringEnabled = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getFeatureFlagStatus(pb, 'wagering');
});

export const getPredictions = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	return getPredictionsDb(pb);
});

export const getNextRacePredictions = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getNextRacePredictionsDb(pb);
});

export const getUserPredictions = query(async (raceId: string = '') => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const user = pb.authStore.record?.id;
	return getUserPredictionsDb(user || '', pb);
});

export const addUpdatePrediction = form(
	v.object({
		driver1st: v.string(),
		driver2nd: v.string(),
		driver3rd: v.string(),
		raceId: v.string(),
		id: v.optional(v.string())
	}),
	async (data) => {
		const event = getRequestEvent();
		const pb = event.locals.pb;

		const predictions = [data.driver1st, data.driver2nd, data.driver3rd];
		const user = pb.authStore.record?.id;
		const year = new Date().getFullYear();
		const race = data.raceId;
		const id: string = data.id?.toString() || '';

		if (id !== '') {
			pb.collection('predictions').update(id, { predictions });
		} else {
			pb.collection('predictions').create({ predictions, user, year, race });
		}

		redirect(303, `/predictions`);
	}
);
