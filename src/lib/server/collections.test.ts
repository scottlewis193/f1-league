import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Driver, Team, Wallet } from '$lib/types';

const collections = new Map<string, ReturnType<typeof makeCollection>>();

function makeCollection(records: any[] = []) {
	return {
		records,
		getFullList: vi.fn(async () => records),
		getFirstListItem: vi.fn(async (filter: string) => {
			const id = filter.match(/id='([^']+)'/)?.[1];
			const user = filter.match(/user='([^']+)'/)?.[1];
			const endpoint = filter.match(/endpoint="([^"]+)"/)?.[1];
			const record = records.find((item) => item.id === id || item.user === user || item.endpoint === endpoint);
			if (!record) throw new Error('missing');
			return record;
		}),
		getOne: vi.fn(async (id: string) => records.find((item) => item.id === id) ?? null),
		create: vi.fn(async (data: any) => ({ id: data.id || 'created', created: 'now', ...data })),
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

beforeEach(() => {
	collections.clear();
	vi.clearAllMocks();
});

describe('server collection helpers', () => {
	it('queries and upserts drivers', async () => {
		const { getDriversQuery, updateDriversQuery } = await import('./drivers');
		const drivers = setCollection('drivers', [
			{ id: 'driver-1', name: 'Norris', year: new Date().getFullYear() }
		]);

		await expect(getDriversQuery()).resolves.toEqual(drivers.records);
		expect(drivers.getFullList).toHaveBeenCalledWith({
			sort: '-points,position',
			filter: `year='${new Date().getFullYear()}'`
		});

		await updateDriversQuery([
			{ name: 'Norris', position: 1, nationality: 'British', team: 'McLaren', points: 100, year: new Date().getFullYear() },
			{ name: 'Piastri', position: 2, nationality: 'Australian', team: 'McLaren', points: 90, year: new Date().getFullYear() }
		] as Partial<Driver>[]);

		expect(drivers.update).toHaveBeenCalledWith('driver-1', expect.objectContaining({ points: 100 }));
		expect(drivers.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Piastri' }));
	});

	it('queries and upserts teams', async () => {
		const { getTeamsQuery, updateTeamsQuery } = await import('./teams');
		const teams = setCollection('teams', [{ id: 'team-1', name: 'McLaren', year: new Date().getFullYear() }]);

		await expect(getTeamsQuery()).resolves.toEqual(teams.records);
		expect(teams.getFullList).toHaveBeenCalledWith({ sort: '-points', filter: `year=${new Date().getFullYear()}` });

		await updateTeamsQuery([
			{ name: 'McLaren', position: 1, points: 200, year: new Date().getFullYear() },
			{ name: 'Ferrari', position: 2, points: 150, year: new Date().getFullYear() }
		] as Partial<Team>[]);

		expect(teams.update).toHaveBeenCalledWith('team-1', expect.objectContaining({ points: 200 }));
		expect(teams.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ferrari' }));
	});

	it('filters next-race and user predictions', async () => {
		const { getNextRacePredictionsQuery, getPredictionsQuery, getUserPredictionsQuery } = await import('./predictions');
		setCollection('races', [{ id: 'race-1', year: new Date().getFullYear(), sessions: [{ date: '20 Jun', time: '12:00' }] }]);
		const predictions = setCollection('predictions', [{ id: 'prediction-1' }]);

		await expect(getPredictionsQuery()).resolves.toEqual(predictions.records);
		await getNextRacePredictionsQuery();
		await getUserPredictionsQuery('user-1');

		expect(predictions.getFullList).toHaveBeenCalledWith({ expand: 'user,race' });
		expect(predictions.getFullList).toHaveBeenCalledWith({ expand: 'user,race', filter: `race='race-1'` });
		expect(predictions.getFullList).toHaveBeenCalledWith({ expand: 'user,race', filter: `user='user-1'` });
	});

	it('gets wallets and returns created transfer logs', async () => {
		const { getWalletByIdQuery, getWalletByUserIdQuery, updateWalletBalance } = await import('./wallets');
		const { createTransferLog, getTransferLogByIdQuery } = await import('./transfers');
		const wallets = setCollection('wallets', [{ id: 'wallet-1', user: 'user-1', balance: 10 } as Wallet]);
		const logs = setCollection('transfer_logs', [{ id: 'log-1' }]);

		await expect(getWalletByIdQuery('wallet-1')).resolves.toMatchObject({ id: 'wallet-1' });
		await expect(getWalletByUserIdQuery('user-1')).resolves.toMatchObject({ user: 'user-1' });
		await updateWalletBalance('wallet-1', 15);
		await expect(getTransferLogByIdQuery('log-1')).resolves.toMatchObject({ id: 'log-1' });
		await expect(createTransferLog('log-2', 'user-1', 'wallet-1', 5, 'deposit')).resolves.toMatchObject({
			id: 'log-2',
			amount: 5,
			type: 'deposit'
		});

		expect(wallets.update).toHaveBeenCalledWith('wallet-1', { balance: 15 });
		expect(logs.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'log-2' }));
	});

	it('sorts players with computed stats', async () => {
		const { getPlayersWithStatsQuery, updateAllPlayersQuery } = await import('./players');
		const users = setCollection('users', [
			{ id: 'user-1', name: 'One' },
			{ id: 'user-2', name: 'Two' }
		]);
		setCollection('predictions', []);
		setCollection('races', []);
		setCollection('odds', []);

		await expect(getPlayersWithStatsQuery()).resolves.toEqual([
			expect.objectContaining({ id: 'user-1', points: 0 }),
			expect.objectContaining({ id: 'user-2', points: 0 })
		]);

		await updateAllPlayersQuery([{ id: 'user-1' }, { id: 'user-2' }] as any);
		expect(users.update).toHaveBeenCalledTimes(2);
	});
});
