import { env } from '$env/dynamic/private';

export async function wiseFetch(
	path: string,
	version: 'v1' | 'v2' | 'v3' | 'v4' = 'v2',
	options: RequestInit = {}
) {
	const headers = {
		Authorization: `Bearer ${env.WISE_API_KEY}`,
		'Content-Type': 'application/json',
		...(options.headers ?? {})
	};

	const res = await fetch(`${env.WISE_API_BASE}/${version}/${path}`, {
		...options,
		headers
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${res.status} ${res.statusText} — ${text}`);
	}

	return res.json();
}
