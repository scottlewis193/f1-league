import type { Prediction } from '$lib/types';
import { getNextRaceQuery } from './races';
import pb, { getServerPb } from './pocketbase';

export async function getPredictionsQuery() {
	const pb = await getServerPb();
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race' });
	return predictions;
}

export async function getNextRacePredictionsQuery() {
	const pb = await getServerPb();
	const race = (await getNextRaceQuery()).id;
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `race='${race}'` });
	return predictions;
}

export async function getUserPredictionsQuery(userId: string) {
	const pb = await getServerPb();
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `user='${userId}'` });
	return predictions;
}
