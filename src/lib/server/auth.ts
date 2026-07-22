const AUTH_REFRESH_WINDOW_MS = 5 * 60 * 1000;

function getTokenExpiryMs(token: string): number | null {
	try {
		const payload = token.split('.')[1];
		if (!payload) return null;

		const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
		const decodedPayload = Buffer.from(normalizedPayload, 'base64').toString('utf8');
		const expiry = JSON.parse(decodedPayload).exp;

		return typeof expiry === 'number' ? expiry * 1000 : null;
	} catch {
		return null;
	}
}

export function shouldRefreshAuth(token: string, now = Date.now()): boolean {
	const expiryMs = getTokenExpiryMs(token);

	return expiryMs === null || expiryMs - now <= AUTH_REFRESH_WINDOW_MS;
}
