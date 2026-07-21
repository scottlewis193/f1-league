import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Driver } from '$lib/types';

const collections = new Map<string, ReturnType<typeof makeCollection>>();

function makeCollection(records: any[] = []) {
	return {
		records,
		getFullList: vi.fn(async () => records),
		getFirstListItem: vi.fn(async () => records[0]),
		getOne: vi.fn(async () => records[0]),
		create: vi.fn(async (data: any) => ({ id: 'created', ...data })),
		update: vi.fn(async (id: string, data: any) => ({ id, ...data }))
	};
}

function setCollection(name: string, records: any[] = []) {
	const collection = makeCollection(records);
	collections.set(name, collection);
	return collection;
}

vi.mock('./pocketbase', () => ({
	getAdminPb: vi.fn(async () => ({
		collection: (name: string) => collections.get(name) ?? setCollection(name)
	}))
}));

vi.mock('./races', () => ({
	getNextRaceQuery: vi.fn(async () => ({ id: 'race-1', year: new Date().getFullYear() }))
}));

beforeEach(() => {
	collections.clear();
	vi.clearAllMocks();
});

describe('updateOddsQuery', () => {
	it('writes all matched drivers and skips unmatched ones', async () => {
		const { updateOddsQuery } = await import('./odds');
		const odds = setCollection('odds', []);
		const drivers = [
			{ id: 'driver-norris', name: 'Norris' },
			{ id: 'driver-verstappen', name: 'Verstappen' }
		] as Partial<Driver>[];

		const scraped = [
			{ driverName: 'Lando Norris', odds: 2.5 }, // matches Norris
			{ driverName: 'Unknown Guy', odds: 3.0 }, // no match -> should be skipped, not written as junk
			{ driverName: 'Max Verstappen', odds: 1.5 } // matches Verstappen
		];

		await updateOddsQuery(scraped, drivers);

		// both matched drivers written; the unmatched one in the middle did not abort the loop
		expect(odds.create).toHaveBeenCalledTimes(2);
		expect(odds.create).toHaveBeenCalledWith(expect.objectContaining({ driver: 'driver-norris' }));
		expect(odds.create).toHaveBeenCalledWith(expect.objectContaining({ driver: 'driver-verstappen' }));
		expect(odds.create).not.toHaveBeenCalledWith(expect.objectContaining({ driver: '' }));
	});

	it('updates existing odds records instead of creating duplicates', async () => {
		const { updateOddsQuery } = await import('./odds');
		const odds = setCollection('odds', [
			{ id: 'odds-1', driver: 'driver-norris', race: 'race-1', odds: 9 }
		]);

		await updateOddsQuery(
			[{ driverName: 'Lando Norris', odds: 2.5 }],
			[{ id: 'driver-norris', name: 'Norris' }] as Partial<Driver>[]
		);

		expect(odds.update).toHaveBeenCalledWith('odds-1', expect.objectContaining({ driver: 'driver-norris' }));
		expect(odds.create).not.toHaveBeenCalled();
	});
});
