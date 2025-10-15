import crypto from 'crypto';
import { verifySolanaSignature } from '$lib/utils';
import type { RequestHandler } from '@sveltejs/kit';
import pb from '$lib/server/pocketbase';

export const POST: RequestHandler = async ({ request }) => {
	const { publicKey, message, signature } = await request.json();

	// Verify signature
	const valid = verifySolanaSignature(
		new TextEncoder().encode(message),
		new Uint8Array(signature),
		publicKey
	);
	if (!valid) return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });

	const token = crypto.randomBytes(32).toString('hex');
	const time = Date.now() + 1000 * 60 * 30; // 30 min
	const expires = new Date(time).toISOString();

	await pb.collection('wallet_sessions').create({
		publicKey,
		token,
		expires
	});

	return new Response(JSON.stringify({ token }), { status: 200 });
};
