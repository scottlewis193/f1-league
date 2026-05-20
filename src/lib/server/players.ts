import type { Player } from '$lib/types';
import { getPlayerStats } from '$lib/utils';
import { getOddsQuery } from './odds';
import pb, { getServerPb } from './pocketbase';
import { getPredictionsQuery } from './predictions';
import { getRacesQuery } from './races';

export async function getPlayersQuery() {
	const pb = await getServerPb();
	const players: Player[] = await pb.collection('users').getFullList();
	return players;
}

export async function getPlayersWithStatsQuery() {
	const pb = await getServerPb();
	const players: Partial<Player>[] = await pb.collection('users').getFullList();
	const playersWithStats: Player[] = [];

	const submissions = await getPredictionsQuery();
	const races = await getRacesQuery();
	const odds = await getOddsQuery();

	players.forEach((player) => {
		const id = player.id || '';
		const name = player.name || '';
		playersWithStats.push({
			id,
			name,
			email: player.email || '',
			avatar: player.avatar || '',
			displayLatestResultsDialog: player.displayLatestResultsDialog || false,
			walletAddress: player.walletAddress || '',
			...getPlayerStats(id, submissions, races, odds),
			userPointsBalance: player.userPointsBalance || 0,
			userPointsEarned: player.userPointsEarned || 0,
			wiseRecipientId: player.wiseRecipientId || 0
		});
	});

	playersWithStats.sort((a, b) => b.points - a.points);

	return playersWithStats;
}

export async function getPlayerQuery(playerId: string) {
	const pb = await getServerPb();
	const player: Player = await pb.collection('users').getOne(playerId);
	return player;
}

export async function getPlayerWithStatsQuery(playerId: string): Promise<Player | null> {
	const pb = await getServerPb();
	const player: Player = await pb.collection('users').getOne(playerId);

	if (!player) return null;

	const submissions = await getPredictionsQuery();
	const races = await getRacesQuery();
	const odds = await getOddsQuery();

	const playerWithStats = {
		id: player.id,
		name: player.name,
		email: player.email,
		avatar: player.avatar,
		displayLatestResultsDialog: player.displayLatestResultsDialog || false,
		walletAddress: player.walletAddress || '',
		...getPlayerStats(player.id, submissions, races, odds),
		userPointsBalance: player.userPointsBalance || 0,
		userPointsEarned: player.userPointsEarned || 0,
		wiseRecipientId: player.wiseRecipientId || 0
	};

	return playerWithStats;
}

export async function updateAllPlayersQuery(players: Player[]) {
	const pb = await getServerPb();
	players.forEach(async (player) => {
		await pb.collection('users').update(player.id, player);
	});
}

export async function updatePlayerQuery(playerId: string, player: Partial<Player>) {
	const pb = await getServerPb();
	await pb.collection('users').update(playerId, player);
}
