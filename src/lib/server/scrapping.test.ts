import { describe, expect, it } from 'vitest';
import {
	validateScrapedDrivers,
	validateScrapedOdds,
	validateScrapedRaces,
	validateScrapedTeams,
	normalizeDriverName,
	parseRaceSessionText
} from './scraping';

describe('scraper result validation', () => {
	it('removes the driver code appended to the full name', () => {
		expect(normalizeDriverName('Kimi AntonelliANT')).toBe('Antonelli');
	});

	it('parses schedule text without relying on DOM descendant positions', () => {
		expect(parseRaceSessionText('24 Jul Practice 1 11:30 - 12:30')).toEqual({
			date: '24 Jul',
			time: '11:30 - 12:30',
			title: 'Practice 1'
		});
	});

	it('ignores schedule status and action labels', () => {
		expect(
			parseRaceSessionText('Chequered Flag 19 Jul Race 13:00 Expand Report Results Highlights')
		).toEqual({ date: '19 Jul', time: '13:00', title: 'Race' });
	});

	it('rejects a partial driver standings page', () => {
		const drivers = Array.from({ length: 19 }, (_, index) => ({
			id: undefined,
			position: index + 1,
			name: `Driver ${index + 1}`,
			nationality: 'Test',
			team: 'Team',
			points: index,
			year: 2026
		}));

		expect(() => validateScrapedDrivers(drivers)).toThrow(/incomplete/);
	});

	it('rejects a partial team standings page', () => {
		const teams = Array.from({ length: 10 }, (_, index) => ({
			id: '',
			position: index + 1,
			name: index === 9 ? '' : `Team ${index + 1}`,
			points: index,
			year: 2026
		}));

		expect(() => validateScrapedTeams(teams)).toThrow(/incomplete/);
	});

	it('accepts the complete 11-team 2026 standings', () => {
		const teams = Array.from({ length: 11 }, (_, index) => ({
			id: '',
			position: index + 1,
			name: `Team ${index + 1}`,
			points: index,
			year: 2026
		}));

		expect(validateScrapedTeams(teams)).toEqual(teams);
	});

	it('rejects a race schedule with too few races', () => {
		expect(() => validateScrapedRaces([])).toThrow(/incomplete/);
	});

	it('rejects odds rows with invalid values', () => {
		const odds = Array.from({ length: 20 }, (_, index) => ({
			driverName: `Driver ${index + 1}`,
			odds: index === 3 ? 0 : 2.5
		}));

		expect(() => validateScrapedOdds(odds)).toThrow(/incomplete/);
	});
});
