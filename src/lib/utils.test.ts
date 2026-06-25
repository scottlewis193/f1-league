import { describe, expect, it } from 'vitest';
import type { Prediction, Race } from './types';
import {
	formatSessionToUKTime,
	getPointsGained,
	oddsToPoints,
	parseLondon,
	titleCase,
	withTimeout
} from './utils';

describe('utils', () => {
	it('formats title case strings', () => {
		expect(titleCase('british grand prix')).toBe('British Grand Prix');
	});

	it('converts odds to points', () => {
		expect(oddsToPoints(2.51)).toBe(5);
		expect(oddsToPoints(55.01)).toBe(110);
	});

	it('formats session times in UK time with British Summer Time', () => {
		expect(formatSessionToUKTime('15 Jun', '15:00', 2026)).toEqual({
			date: '15 June',
			time: '16:00'
		});
	});

	it('formats session times in UK time without British Summer Time in winter', () => {
		expect(formatSessionToUKTime('01 Feb', '15:00', 2026)).toEqual({
			date: '1 February',
			time: '15:00'
		});
	});

	it('formats session time ranges in UK time', () => {
		expect(formatSessionToUKTime('15 Jun', '15:00 - 16:00', 2026)).toEqual({
			date: '15 June',
			time: '16:00 - 17:00'
		});
	});

	it('parses session times using the supplied race year', () => {
		expect(parseLondon('15 Jun', '15:00', 2026)).toBe(Date.UTC(2026, 5, 15, 15, 0));
	});

	it('resolves promises that complete before timeout', async () => {
		await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
	});

	it('rejects promises that exceed timeout', async () => {
		await expect(withTimeout(new Promise(() => {}), 1)).rejects.toThrow('Operation timed out');
	});

	it('scores all top-three and exact predictions', () => {
		const race = { raceResults: ['Norris', 'Piastri', 'Verstappen'] } as Race;
		const submission = {
			predictions: ['Norris', 'Verstappen', 'Russell']
		} as Prediction;

		// Norris: +1 placed +3 exact, Verstappen: +1 placed
		expect(getPointsGained(race, submission)).toBe(5);
	});
});
