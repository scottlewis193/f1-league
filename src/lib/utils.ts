import type { HistoryEntry, OddsRecord, Prediction, Race } from './types';

const MONTH_INDEX: Record<string, number> = {
	jan: 0,
	january: 0,
	feb: 1,
	february: 1,
	mar: 2,
	march: 2,
	apr: 3,
	april: 3,
	may: 4,
	jun: 5,
	june: 5,
	jul: 6,
	july: 6,
	aug: 7,
	august: 7,
	sep: 8,
	sept: 8,
	september: 8,
	oct: 9,
	october: 9,
	nov: 10,
	november: 10,
	dec: 11,
	december: 11
};

function parseSessionDateTime(dateStr: string, timeStr: string, year = new Date().getFullYear()) {
	const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
	if (!timeMatch) return null;

	const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (isoDateMatch) {
		return new Date(
			Date.UTC(
				Number(isoDateMatch[1]),
				Number(isoDateMatch[2]) - 1,
				Number(isoDateMatch[3]),
				Number(timeMatch[1]),
				Number(timeMatch[2])
			)
		);
	}

	const dateMatch = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)/);
	if (!dateMatch) return null;

	const month = MONTH_INDEX[dateMatch[2].toLowerCase()];
	if (month === undefined) return null;

	return new Date(
		Date.UTC(year, month, Number(dateMatch[1]), Number(timeMatch[1]), Number(timeMatch[2]))
	);
}

function formatUKTime(date: Date) {
	return date.toLocaleTimeString('en-GB', {
		timeZone: 'Europe/London',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatSessionToUKTime(
	dateStr: string,
	timeStr: string,
	year = new Date().getFullYear()
) {
	const date = parseSessionDateTime(dateStr, timeStr, year);

	if (!date || isNaN(date.getTime())) {
		return { date: dateStr, time: timeStr };
	}

	const timeParts = timeStr.match(/\d{1,2}:\d{2}/g) ?? [];
	const formattedTimes = timeParts
		.map((timePart) => parseSessionDateTime(dateStr, timePart, year))
		.filter((sessionDate): sessionDate is Date => !!sessionDate && !isNaN(sessionDate.getTime()))
		.map(formatUKTime);

	return {
		date: date.toLocaleDateString('en-GB', {
			timeZone: 'Europe/London',
			day: 'numeric',
			month: 'long'
		}),
		time: formattedTimes.length > 1 ? formattedTimes.join(' - ') : formatUKTime(date)
	};
}

export function parseLondon(
	dateStr: string,
	timeStr: string,
	year = new Date().getFullYear()
): number {
	const date = parseSessionDateTime(dateStr, timeStr, year);
	return date?.getTime() ?? Number.NaN;
}

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

	const top3 = race.raceResults.slice(0, 3);

	for (let i = 0; i < submission.predictions.length; i++) {
		const driverName = submission.predictions[i];

		// if driver is in top 3
		if (top3.includes(driverName)) {
			pointsGained += 1;
		}

		// if driver is in exact finishing position
		if (top3[i] === driverName) {
			pointsGained += 3;
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
	let lastRaceWithResults: Race = races
		.filter((race) => race.raceResults.length > 0)
		.sort((a, b) => b.raceNo - a.raceNo)[0];

	let points = 0;
	let place = 0;
	let exact = 0;
	let wildPrediction = 0;
	let lastPointsEarned = 0;
	const userSubmissions = submissions.filter((submission) => submission.expand.user.id === user);
	const historyEntries: HistoryEntry[] = [];

	for (const submission of userSubmissions) {
		const race = races.find((race) => race.id === (submission.expand?.race?.id ?? ''));
		if (!race) continue;
		if (!race.raceResults) continue;
		const raceOdds = odds.filter((odd) => odd.race === race.id);

		const top3 = race.raceResults.slice(0, 3);

		const wildPredictionPoints = submission.wildPredictionPoints || 0;
		points += wildPredictionPoints;
		if (wildPredictionPoints > 0) {
			wildPrediction += 1;
		}

		const historyEntry: HistoryEntry = {
			location: race.location,
			results: top3,
			predictions: submission.predictions,
			points: [0, 0, 0],
			place: ['No', 'No', 'No'],
			exact: ['No', 'No', 'No'],
			wildPredictionPoints
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

	return { points, place, exact, wildPrediction, lastPointsEarned, historyEntries };
}

export function userHasSubmitted(submissions: Prediction[], user: string) {
	return submissions.some((submission) => submission.expand.user.id === user);
}

export function oddsToPoints(odds: number) {
	const a = Math.round((odds - 0.01) * 2);
	const b = a > 10 ? Math.floor(a / 10) * 10 : a;
	return b;
}

export function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text);
}

export function isPredictionEntryFeeBypassed(userId: string | undefined, bypassIds: string) {
	if (!userId) return false;
	return bypassIds
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
		.includes(userId);
}

export function getAvatarUrl(
	userId: string,
	avatarName: string | undefined,
	pbUrl: string,
	thumbSize = 48
): string {
	if (!avatarName) return '';
	return `${pbUrl}/api/files/users/${userId}/${avatarName}?thumb=${thumbSize}x${thumbSize}`;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Operation timed out') {
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error(message)), ms)
	);

	// whichever settles first (resolves or rejects) wins
	return Promise.race([promise, timeout]);
}
