import type { OddsRecord, Race } from '$lib/types';

export type DriverSelection = {
	value: string;
	lastChanged: boolean;
	place: number;
	exact: number;
};

export type DriverSelections = Record<string, DriverSelection>;

export function isPredictionWindowOpen(race: Race | undefined) {
	if (!race) return false;
	const firstSession = race.sessions[0];
	if (!firstSession) return false;

	const raceWeekendStartDate = new Date(
		Date.parse(firstSession.date + ' ' + race.year + ' ' + firstSession.time)
	);

	return Date.now() < raceWeekendStartDate.getTime();
}

export function getDriverOddsPointsPotential(odds: OddsRecord[] | undefined, driverName: string) {
	const driverOddsRecord = odds?.find((oddsRecord) => oddsRecord.expand.driver.name === driverName);

	return {
		place: driverOddsRecord?.pointsForPlace || 0,
		exact: driverOddsRecord?.pointsForExact || 0
	};
}

export function areDriverSelectionsValid(driverSelections: DriverSelections) {
	return Object.values(driverSelections).every(
		(driverSelection) => driverSelection.value !== 'Driver'
	);
}

export function getSelectionTotals(driverSelections: DriverSelections) {
	return Object.values(driverSelections).reduce(
		(totals, driverSelection) => ({
			place: totals.place + driverSelection.place,
			exact: totals.exact + driverSelection.exact
		}),
		{ place: 0, exact: 0 }
	);
}
