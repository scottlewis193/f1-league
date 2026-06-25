import type { OddsRecord, Player, Prediction, Race } from '$lib/types';
import { getPlayerStats } from '$lib/utils';
import { getOddsQuery } from './odds';
import { getAdminPb } from './pocketbase';
import { getPredictionsQuery } from './predictions';
import { getRacesQuery } from './races';

export async function getPlayersQuery() {
	const pb = await getAdminPb();
	const players: Player[] = await pb.collection('users').getFullList();
	return players;
}

function withStats(
	player: Partial<Player>,
	submissions: Prediction[],
	races: Race[],
	odds: OddsRecord[]
) {
	return {
		id: player.id || '',
		name: player.name || '',
		email: player.email || '',
		avatar: player.avatar || '',
		displayLatestResultsDialog: player.displayLatestResultsDialog || false,
		walletAddress: player.walletAddress || '',
		...getPlayerStats(player.id || '', submissions, races, odds),
		userPointsBalance: player.userPointsBalance || 0,
		userPointsEarned: player.userPointsEarned || 0,
		wiseRecipientId: player.wiseRecipientId || 0
	};
}

export async function getPlayersWithStatsQuery() {
	const pb = await getAdminPb();
	const players: Partial<Player>[] = await pb.collection('users').getFullList();

	const submissions = await getPredictionsQuery();
	const races = await getRacesQuery();
	const odds = await getOddsQuery();

	const playersWithStats: Player[] = players.map((player) =>
		withStats(player, submissions, races, odds)
	);

	playersWithStats.sort((a, b) => b.points - a.points);

	return playersWithStats;
}

export async function getPlayerQuery(playerId: string) {
	const pb = await getAdminPb();
	const player: Player = await pb.collection('users').getOne(playerId);
	return player;
}

export async function getPlayerWithStatsQuery(playerId: string): Promise<Player | null> {
	const pb = await getAdminPb();
	const player: Player = await pb.collection('users').getOne(playerId);

	if (!player) return null;

	const submissions = await getPredictionsQuery();
	const races = await getRacesQuery();
	const odds = await getOddsQuery();

	return withStats(player, submissions, races, odds);
}

export async function updateAllPlayersQuery(players: Player[]) {
	const pb = await getAdminPb();
	const updates = players.map((player) =>
		pb.collection('users').update(player.id, player).catch((err) => {
			console.error(`Failed to update player ${player.id}:`, err);
			return null;
		})
	);
	await Promise.all(updates);
}

export async function updatePlayerQuery(playerId: string, player: Partial<Player>) {
	const pb = await getAdminPb();
	await pb.collection('users').update(playerId, player);
}
