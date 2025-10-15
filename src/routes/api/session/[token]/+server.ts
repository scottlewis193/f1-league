import type { RequestHandler } from '@sveltejs/kit';
import pb from '$lib/server/pocketbase';
export const GET: RequestHandler = async ({ params }) => {
	const records = await pb.collection('wallet_sessions').getFullList({
		filter: `token="${params.token}" && expires>${Date.now()}`
	});

	if (!records.length) return new Response(JSON.stringify({}), { status: 404 });

	return new Response(JSON.stringify({ publicKey: records[0].publicKey }), { status: 200 });
};
