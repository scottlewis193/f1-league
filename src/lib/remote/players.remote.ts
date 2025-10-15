import { command, form, getRequestEvent, query } from '$app/server';
import type { Player } from '$lib/types';
import { fail, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import {
	getCurrentPlayerWithStatsDb,
	getPlayersWithStatsDb,
	updateCurrentPlayerDb
} from '$lib/server/data';

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

export const getPlayersWithStats = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getPlayersWithStatsDb(pb);
});

export const getCurrentPlayerWithStats = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	if (!event.locals.user?.id) return;
	const playerWithStats = await getCurrentPlayerWithStatsDb(event.locals.user?.id, pb);
	return playerWithStats;
});

export const updateCurrentPlayer = command('unchecked', async (playerData: Player) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	await updateCurrentPlayerDb(event.locals.user?.id || '', playerData, pb);
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
