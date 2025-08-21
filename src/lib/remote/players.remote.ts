import { form, getRequestEvent, query } from '$app/server';
import type { Player } from '$lib/types';
import { fail, redirect } from '@sveltejs/kit';

export const getPlayers = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	const players: Player[] = await pb.collection('users').getFullList();
	return players;
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

export const logout = form(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	await pb.authStore.clear();
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

	const user = await pb
		.collection('users')
		.create({ name, email, password, passwordConfirm, verified: true });
	console.log(user);

	return redirect(303, `/login`);
});
