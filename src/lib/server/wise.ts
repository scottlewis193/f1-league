import { WISE_API_KEY, WISE_API_BASE } from '$env/static/private';

export async function wiseFetch(
	path: string,
	version: 'v1' | 'v2' | 'v3' | 'v4' = 'v2',
	options: RequestInit = {}
) {
	const headers = {
		Authorization: `Bearer ${WISE_API_KEY}`,
		'Content-Type': 'application/json',
		...(options.headers ?? {})
	};

	const res = await fetch(`${WISE_API_BASE}/${version}/${path}`, {
		...options,
		headers
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${res.status} ${res.statusText} — ${text}`);
	}

	return res.json();
}
