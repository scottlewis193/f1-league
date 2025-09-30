import { form, getRequestEvent, query } from '$app/server';
import type { Prediction as Prediction } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import { getNextRace } from './races.remote';
import * as v from 'valibot';

export const getPredictions = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	const submissions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race' });

	return submissions;
});

export const getNextRacePredictions = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const race = (await getNextRace()).id;
	const submissions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `race='${race}'` });
	return submissions;
});

export const getUserPredictions = query(async (raceId: string = '') => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	const user = pb.authStore.record?.id;
	const submissions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `user="${user}" && race='${raceId}'` });
	return submissions;
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
