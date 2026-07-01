import { describe, expect, it } from 'vitest';
import type { Race } from '$lib/types';
import { formatRaceLocation, formatRaceName, sortRacesByFirstSession } from './races';

describe('race domain helpers', () => {
	it('formats race locations and names for display', () => {
		expect(formatRaceLocation('united-kingdom')).toBe('United Kingdom');
		expect(formatRaceName('FORMULA 1 BRITISH GRAND PRIX 2026', 2026)).toBe('British Grand Prix');
	});

	it('sorts races by first session without mutating the input', () => {
		const late = { id: 'late', sessions: [{ date: '20 Jun' }] } as Race;
		const early = { id: 'early', sessions: [{ date: '10 Jun' }] } as Race;
		const races = [late, early];

		expect(sortRacesByFirstSession(races).map((race) => race.id)).toEqual(['early', 'late']);
		expect(races.map((race) => race.id)).toEqual(['late', 'early']);
	});
});
