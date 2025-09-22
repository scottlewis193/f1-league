import { getNextRace } from './remote/races.remote';
import type { Race, Prediction, OddsRecord } from './types';

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

export function getPlayerStats(
	user: string,
	submissions: Prediction[],
	races: Race[],
	odds: OddsRecord[]
) {
	let points = 0;
	let place = 0;
	let exact = 0;
	let lastPointsEarned = 0;
	let userSubmissions = submissions.filter((submission) => submission.expand.user.id === user);

	for (const submission of userSubmissions) {
		const race = races.find((race) => race.id === submission.expand.race.id);
		if (!race) continue;
		if (!race.raceResults) continue;
		const raceOdds = odds.filter((odd) => odd.race === race.id);
		if (!raceOdds) continue;

		const top3 = race.raceResults.slice(0, 3);

		for (let i = 0; i < submission.predictions.length; i++) {
			const driverName = submission.predictions[i];
			const raceDriverOdds = raceOdds.find((odd) => odd.expand.driver.name == driverName);
			if (!raceDriverOdds) continue;

			//if driver is in top 3
			if (top3.includes(driverName)) {
				points += raceDriverOdds.pointsForPlace;
				lastPointsEarned +=
					submission === userSubmissions[userSubmissions.length - 1]
						? raceDriverOdds.pointsForPlace
						: 0;
				place += 1;
				continue;
			}

			//if driver is in exact finishing position
			if (top3[i] === driverName) {
				points += raceDriverOdds.pointsForExact;
				lastPointsEarned +=
					submission === userSubmissions[userSubmissions.length - 1]
						? raceDriverOdds.pointsForExact
						: 0;
				exact += 1;
				continue;
			}
		}
	}

	return { points, place, exact, lastPointsEarned };
}

export function userHasSubmitted(submissions: Prediction[], user: string) {
	return submissions.some((submission) => submission.expand.user.id === user);
}

export function oddsToPoints(odds: number) {
	const a = Math.round((odds - 0.01) * 2);
	const b = a > 10 ? Math.floor(a / 10) * 10 : a;
	return b;
}
