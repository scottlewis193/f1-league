import type { Team } from '$lib/types';
import pb from './pocketbase';

export async function getTeamsQuery() {
	const SEASON = new Date().getFullYear();
	const teams: Team[] = await pb
		.collection('teams')
		.getFullList({ sort: '-points', filter: `year=${SEASON}` });

	return teams;
}

export async function updateTeamsQuery(teams: Partial<Team>[]) {
	const currentTeams = await pb.collection('teams').getFullList({ sort: '-points' });

	for (const team of teams) {
		if (!team) return;
		const currentTeam = currentTeams.find((d) => d.name === team.name && d.year === team.year);

		if (currentTeam) {
			await pb.collection('teams').update(currentTeam.id, {
				name: team.name,
				position: team.position,
				points: team.points,
				year: team.year
			});
		} else {
			await pb.collection('teams').create({
				name: team.name,
				position: team.position,
				points: team.points,
				year: team.year
			});
		}
	}
}
