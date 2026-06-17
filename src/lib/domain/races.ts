import { titleCase } from '$lib/utils';
import type { Race } from '$lib/types';

export function formatRaceLocation(location: string) {
	return titleCase(location.replaceAll('-', ' '));
}

export function formatRaceName(raceName: string, year = new Date().getFullYear()) {
	return titleCase(raceName.substring(10).replace(year.toString(), '').trim());
}

export function sortRacesByFirstSession(races: Race[]) {
	return [...races].sort(
		(a, b) => Date.parse(a.sessions[0]?.date ?? '') - Date.parse(b.sessions[0]?.date ?? '')
	);
}
