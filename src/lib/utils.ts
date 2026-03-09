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
	let lastRaceWithResults: Race = races.sort((a, b) => b.raceNo - a.raceNo)[0];
	//we iterate through races in descending order of race no
	for (const race of races.sort((a, b) => b.raceNo - a.raceNo)) {
		if (race.raceResults.length > 0) {
			lastRaceWithResults = race;
			break;
		}
	}

	let points = 0;
	let place = 0;
	let exact = 0;
	let lastPointsEarned = 0;
	const userSubmissions = submissions.filter((submission) => submission.expand.user.id === user);
	const historyEntries: {
		location: string;
		predictions: string[];
		results: string[];
		points: number[];
		place: string[];
		exact: string[];
	}[] = [];

	for (const submission of userSubmissions) {
		const race = races.find((race) => race.id === (submission.expand?.race?.id ?? ''));
		if (!race) continue;
		if (!race.raceResults) continue;
		const raceOdds = odds.filter((odd) => odd.race === race.id);
		if (!raceOdds) continue;

		const top3 = race.raceResults.slice(0, 3);

		const historyEntry: {
			location: string;
			predictions: string[];
			results: string[];
			points: number[];
			place: string[];
			exact: string[];
		} = {
			location: race.location,
			results: top3,
			predictions: submission.predictions,
			points: [0, 0, 0],
			place: ['No', 'No', 'No'],
			exact: ['No', 'No', 'No']
		};

		for (let i = 0; i < submission.predictions.length; i++) {
			const driverName = submission.predictions[i];
			const raceDriverOdds = raceOdds.find((odd) => (odd.expand.driver?.name || '') == driverName);
			if (!raceDriverOdds) continue;

			//if driver is in top 3
			if (top3.includes(driverName)) {
				points += raceDriverOdds.pointsForPlace;

				lastPointsEarned +=
					submission ===
					userSubmissions.find((submission) => submission.expand.race?.id == lastRaceWithResults.id)
						? raceDriverOdds.pointsForPlace
						: 0;
				place += 1;

				historyEntry.points[i] += raceDriverOdds.pointsForPlace;
				historyEntry.place[i] = 'Yes';
			}

			//if driver is in exact finishing position

			if (top3[i] == driverName) {
				points += raceDriverOdds.pointsForExact;
				lastPointsEarned +=
					submission ===
					userSubmissions.find((submission) => submission.expand.race?.id == lastRaceWithResults.id)
						? raceDriverOdds.pointsForExact
						: 0;
				exact += 1;

				historyEntry.points[i] += raceDriverOdds.pointsForExact;
				historyEntry.exact[i] = 'Yes';
			}
		}

		historyEntries.push(historyEntry);
	}

	return { points, place, exact, lastPointsEarned, historyEntries };
}

export function userHasSubmitted(submissions: Prediction[], user: string) {
	return submissions.some((submission) => submission.expand.user.id === user);
}

export function oddsToPoints(odds: number) {
	const a = Math.round((odds - 0.01) * 2);
	const b = a > 10 ? Math.floor(a / 10) * 10 : a;
	return b;
}

export function getCSSVarValue(varName: string) {
	return window.getComputedStyle(document.body).getPropertyValue(varName);
}

export function setCSSVarValue(varName: string, value: string) {
	const r = document.querySelector(':root') as HTMLElement;
	r.style.setProperty(varName, value);
}

export async function usdToGbp(usdAmount: number) {
	const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP');
	const data = await res.json();
	const rate = data.rates.GBP; // e.g., 0.80
	return usdAmount * rate;
}

export async function gbpToUsd(gbpAmount: number) {
	const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
	const data = await res.json();
	const rate = data.rates.USD; // e.g., 1.25
	return gbpAmount * rate;
}

export function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text);
}

export function withTimeout(promise: Promise<any>, ms: number, message = 'Operation timed out') {
	const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

	// whichever settles first (resolves or rejects) wins
	return Promise.race([promise, timeout]);
}
