import type { Prediction } from '$lib/types';
import { getNextRaceQuery } from './races';
import pb from './pocketbase';

export async function getPredictionsQuery() {
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race' });
	return predictions;
}

export async function getNextRacePredictionsQuery() {
	const race = (await getNextRaceQuery()).id;
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `race='${race}'` });
	return predictions;
}

export async function getUserPredictionsQuery(userId: string) {
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `user='${userId}'` });
	return predictions;
}
