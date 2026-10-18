import { afterEach, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { PB_USER: 'server@example.test', PB_PASS: 'test-password' }
}));
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_PB_URL: 'https://pb.example.test' }
}));

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.resetModules();
});

it('renews an expired server session before reading a player', async () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
	let logins = 0;
	const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
		if (url.endsWith('/auth-with-password')) {
			logins++;
			const payload = btoa(JSON.stringify({ exp: Date.now() / 1000 + 60 }));
			return Response.json({ token: `header.${payload}.signature`, record: { id: 'player-1' } });
		}
		const token = new Headers(options?.headers).get('Authorization') || '';
		const { exp } = JSON.parse(atob(token.split('.')[1]));
		return exp > Date.now() / 1000
			? Response.json({ id: 'player-1' })
			: Response.json({ message: "The requested resource wasn't found." }, { status: 404 });
	});
	vi.stubGlobal('fetch', fetchMock);
	const { getAdminPb } = await import('./pocketbase');

	const first = await getAdminPb();
	await expect(first.collection('users').getOne('player-1')).resolves.toMatchObject({
		id: 'player-1'
	});
	await getAdminPb();
	expect(logins).toBe(1);

	vi.setSystemTime(new Date('2026-10-18T12:02:00Z'));
	const renewed = await getAdminPb();
	await expect(renewed.collection('users').getOne('player-1')).resolves.toMatchObject({
		id: 'player-1'
	});
	expect(logins).toBe(2);
});
