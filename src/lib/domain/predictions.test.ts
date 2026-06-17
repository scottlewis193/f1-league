import { describe, expect, it, vi } from 'vitest';
import type { OddsRecord, Race } from '$lib/types';
import {
	areDriverSelectionsValid,
	getDriverOddsPointsPotential,
	getSelectionTotals,
	isPredictionWindowOpen,
	type DriverSelections
} from './predictions';

const race = {
	year: 2026,
	sessions: [{ date: '15 Jun', time: '15:00', title: 'Race' }]
} as Race;

const odds = [
	{
		pointsForPlace: 4,
		pointsForExact: 8,
		expand: { driver: { name: 'Norris' } }
	}
] as OddsRecord[];

function selections(overrides: Partial<DriverSelections> = {}): DriverSelections {
	return {
		Driver1st: { value: 'Norris', lastChanged: false, place: 4, exact: 8 },
		Driver2nd: { value: 'Piastri', lastChanged: false, place: 3, exact: 6 },
		Driver3rd: { value: 'Verstappen', lastChanged: false, place: 2, exact: 5 },
		...overrides
	};
}

describe('prediction domain helpers', () => {
	it('checks prediction window against first session', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-14T12:00:00Z'));
		expect(isPredictionWindowOpen(race)).toBe(true);

		vi.setSystemTime(new Date('2026-06-16T12:00:00Z'));
		expect(isPredictionWindowOpen(race)).toBe(false);
		vi.useRealTimers();
	});

	it('returns odds points for selected driver', () => {
		expect(getDriverOddsPointsPotential(odds, 'Norris')).toEqual({ place: 4, exact: 8 });
		expect(getDriverOddsPointsPotential(odds, 'Unknown')).toEqual({ place: 0, exact: 0 });
	});

	it('validates completed driver selections', () => {
		expect(areDriverSelectionsValid(selections())).toBe(true);
		expect(
			areDriverSelectionsValid(
				selections({ Driver2nd: { value: 'Driver', lastChanged: false, place: 0, exact: 0 } })
			)
		).toBe(false);
	});

	it('totals selected odds points', () => {
		expect(getSelectionTotals(selections())).toEqual({ place: 9, exact: 19 });
	});
});
