import { command, form, getRequestEvent, query } from '$app/server';
import type { Player } from '$lib/types';
import { fail, redirect } from '@sveltejs/kit';
import { getPredictions } from './predictions.remote';
import { getRaces } from './races.remote';
import { getPlayerStats } from '$lib/utils';
import { getOdds } from './odds.remote';
import * as v from 'valibot';

const playerProfileSchema = v.intersect([
	v.object({
		name: v.string(),
		email: v.string(),
		password: v.string(),
		passwordConfirm: v.string()
	}),
	v.record(v.string(), v.string())
]);

const playerLoginSchema = v.object({
	email: v.string(),
	password: v.string()
});

const playerRegisterSchema = v.object({
	name: v.string(),
	email: v.string(),
	password: v.string(),
	passwordConfirm: v.string()
});

export const getPlayers = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	const players: Partial<Player>[] = await pb.collection('users').getFullList();
	let playersWithStats: Player[] = [];

	const submissions = await getPredictions();
	const races = await getRaces();
	const odds = await getOdds();

	players.forEach((player) => {
		const id = player.id || '';
		const name = player.name || '';
		playersWithStats.push({
			id,
			name,
			email: player.email || '',
			displayLatestResultsDialog: player.displayLatestResultsDialog || false,
			...getPlayerStats(id, submissions, races, odds)
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

	const submissions = await getPredictions();
	const races = await getRaces();
	const odds = await getOdds();

	const playerWithStats = {
		id: player.id,
		name: player.name,
		email: player.email,
		displayLatestResultsDialog: player.displayLatestResultsDialog || false,
		...getPlayerStats(player.id, submissions, races, odds)
	};

	return playerWithStats;
});

export const updateCurrentPlayer = command('unchecked', async (playerData: Player) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	await pb.collection('users').update(event.locals.user?.id || '', playerData);
});

export const updatePlayerProfile = form(playerProfileSchema, async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	// remove empty string values
	Object.keys(data).forEach((key) => {
		if (data[key] === '') delete data[key];
	});

	if (!event.locals.user?.id) return;

	await pb.collection('users').update(event.locals.user?.id, data);

	return redirect(303, `/profile`);
});

export const login = form(playerLoginSchema, async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const { email, password } = data;

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

export const register = form(playerRegisterSchema, async (data) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const { name, email, password, passwordConfirm } = data;

	console.log({ name, email, password, passwordConfirm });
	if (password !== passwordConfirm) {
		return fail(400, { error: 'Passwords do not match' });
	}

	const user = await pb.collection('users').create({ name, email, password, passwordConfirm });
	console.log(user);

	return redirect(303, `/login`);
});
