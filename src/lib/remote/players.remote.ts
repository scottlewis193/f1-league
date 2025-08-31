import { form, getRequestEvent, query } from '$app/server';
import type { Player } from '$lib/types';
import { fail, redirect } from '@sveltejs/kit';
import { getPredictions } from './predictions.remote';
import { getRaces } from './races.remote';
import { getPlayerStats } from '$lib/utils';

export const getPlayers = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	const players: Partial<Player>[] = await pb.collection('users').getFullList();
	let playersWithStats: Player[] = [];

	const submissions = await getPredictions();
	const races = await getRaces();

	players.forEach((player) => {
		const id = player.id || '';
		const name = player.name || '';
		playersWithStats.push({
			id,
			name,
			...getPlayerStats(id, submissions, races)
		});
	});

	playersWithStats.sort((a, b) => b.points - a.points);

	return playersWithStats;
});

export const getCurrentPlayer = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	if (!event.locals.user?.id) return;
	const player: Player = await pb.collection('users').getOne(event.locals.user?.id);
	return player;
});

export const updatePlayerProfile = form(async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const updateData = Object.fromEntries(data);

	// remove empty string values
	Object.keys(updateData).forEach((key) => {
		if (updateData[key] === '') delete updateData[key];
	});

	if (!event.locals.user?.id) return;

	await pb.collection('users').update(event.locals.user?.id, updateData);
});

export const login = form(async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const { email, password } = Object.fromEntries(data);

	if (!email || !password) {
		return fail(400, { error: 'Email and password are required' });
	}

	await pb.collection('users').authWithPassword(email.toString(), password.toString());

	if (!pb.authStore.isValid) {
		return fail(400, { error: 'Invalid email or password' });
	}
	return redirect(303, `/`);
});

export const logout = form(() => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	pb.authStore.clear();
	return redirect(303, `/login`);
});

export const register = form(async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const { name, email, password, passwordConfirm } = Object.fromEntries(data);

	console.log({ name, email, password, passwordConfirm });
	if (password !== passwordConfirm) {
		return fail(400, { error: 'Passwords do not match' });
	}

	const user = await pb.collection('users').create({ name, email, password, passwordConfirm });
	console.log(user);

	return redirect(303, `/login`);
});
