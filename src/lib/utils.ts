import type { Race, Prediction } from './types';

export function titleCase(str: string) {
	return str.replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
	});
}

export function getPointsGained(race: Race, submission: Prediction) {
	let pointsGained = 0;

	if (!race.raceResults) {
		return pointsGained;
	}

	for (let i = 0; i < submission.predictions.length; i++) {
		const driverName = submission.predictions[i];

		//if driver is in top 3
		if (race.raceResults.includes(driverName)) {
			return (pointsGained += 1);
		}

		//if driver is in exact finishing position
		if (race.raceResults[i] === driverName) {
			return (pointsGained += 3);
		}
	}

	return pointsGained;
}

export function getPlayerStats(user: string, submissions: Prediction[], races: Race[]) {
	let points = 0;
	let place = 0;
	let exact = 0;
	let userSubmissions = submissions.filter((submission) => submission.expand.user.id === user);

	for (const submission of userSubmissions) {
		const race = races.find((race) => race.id === submission.expand.race.id);
		if (!race) continue;
		if (!race.raceResults) continue;

		const top3 = race.raceResults.slice(0, 3);

		for (let i = 0; i < submission.predictions.length; i++) {
			const driverName = submission.predictions[i];

			//if driver is in top 3
			if (top3.includes(driverName)) {
				points += 1;
				place += 1;
				continue;
			}

			//if driver is in exact finishing position
			if (top3[i] === driverName) {
				points += 3;
				exact += 1;
				continue;
			}
		}
	}

	return { points, place, exact };
}

export function userHasSubmitted(submissions: Prediction[], user: string) {
	return submissions.some((submission) => submission.expand.user.id === user);
}
