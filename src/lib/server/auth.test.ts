import { describe, expect, it } from 'vitest';
import { shouldRefreshAuth } from './auth';

function tokenWithExpiry(expiryMs: number): string {
	const payload = Buffer.from(JSON.stringify({ exp: expiryMs / 1000 })).toString('base64url');
	return `header.${payload}.signature`;
}

describe('shouldRefreshAuth', () => {
	it('does not refresh a token with more than five minutes remaining', () => {
		const now = Date.UTC(2026, 6, 22, 12);

		expect(shouldRefreshAuth(tokenWithExpiry(now + 5 * 60 * 1000 + 1), now)).toBe(false);
	});

	it('refreshes a token inside the five-minute safety window', () => {
		const now = Date.UTC(2026, 6, 22, 12);

		expect(shouldRefreshAuth(tokenWithExpiry(now + 5 * 60 * 1000), now)).toBe(true);
	});

	it('refreshes when the token expiry cannot be read', () => {
		expect(shouldRefreshAuth('not-a-jwt')).toBe(true);
	});
});
