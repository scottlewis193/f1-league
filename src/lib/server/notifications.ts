import { getAdminPb } from './pocketbase';
import { getRacesQuery, getNextRaceQuery } from './races';
import { getPredictionsQuery } from './predictions';
import { sendNotifications } from '$lib/notifications';
import { parseLondon } from '$lib/utils';

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;
const CLOSURE_GRACE_MS = 6 * 60 * 60 * 1000;

export async function sendPredictionReminderNotifications(
	raceName?: string,
	message?: string,
	dryRun = false,
	closureOnly = false
): Promise<{
	status: string;
	totalUsers: number;
	submittedUsers: number;
	nonSubmitters: string[];
	raceName?: string;
	successCount?: number;
	failCount?: number;
	deadline?: string;
	hoursUntilDeadline?: number;
}> {
	const pb = await getAdminPb();

	// Get the race to remind about (or the next race)
	let race;
	if (raceName) {
		const races = await getRacesQuery();
		race = races.find((r) => r.raceName.includes(raceName));
		if (!race) {
			return { status: 'race_not_found', totalUsers: 0, submittedUsers: 0, nonSubmitters: [] };
		}
	} else {
		race = await getNextRaceQuery();
	}
	if (!race) {
		return { status: 'race_not_found', totalUsers: 0, submittedUsers: 0, nonSubmitters: [] };
	}

	// Prediction window closes at the start of the first race session.
	const firstSession = race.sessions[0];
	if (!firstSession) {
		throw new Error(`Missing first session for race ${race.id}`);
	}
	const deadlineTime = parseLondon(firstSession.date, firstSession.time, race.year);
	if (!Number.isFinite(deadlineTime)) {
		throw new Error(`Invalid prediction deadline for race ${race.id}`);
	}
	const submissionDeadline = new Date(deadlineTime);
	const now = Date.now();
	const reminderStartTime = deadlineTime - REMINDER_WINDOW_MS;
	if (closureOnly && (now < deadlineTime || now > deadlineTime + CLOSURE_GRACE_MS)) {
		return {
			status: now < deadlineTime ? 'awaiting_closure' : 'window_closed',
			totalUsers: 0,
			submittedUsers: 0,
			nonSubmitters: [],
			raceName: race.raceName,
			deadline: submissionDeadline.toISOString(),
			successCount: 0,
			failCount: 0
		};
	}

	// Counts are needed only when the reminder window is active or closure is due.
	const allPredictions = await getPredictionsQuery();
	const racePredictions = allPredictions.filter((p) => p.race === race.id);
	const submittedUserIds = new Set(racePredictions.map((p) => p.user));
	const allUsers = await pb.collection('users').getFullList();
	const totalUsers = allUsers.length;
	const nonSubmitters = allUsers.filter((u) => !submittedUserIds.has(u.id));
	const nonSubmitterNames = nonSubmitters.map((u) => u.name);

	if (now < reminderStartTime) {
		return {
			status: 'too_early',
			totalUsers,
			submittedUsers: submittedUserIds.size,
			nonSubmitters: nonSubmitterNames,
			raceName: race.raceName,
			deadline: submissionDeadline.toISOString(),
			hoursUntilDeadline: Math.floor((deadlineTime - now) / (1000 * 60 * 60)),
			successCount: 0,
			failCount: 0
		};
	}

	if (now >= deadlineTime) {
		if (now > deadlineTime + CLOSURE_GRACE_MS) {
			return {
				status: 'window_closed',
				totalUsers,
				submittedUsers: submittedUserIds.size,
				nonSubmitters: nonSubmitterNames,
				raceName: race.raceName,
				deadline: submissionDeadline.toISOString(),
				successCount: 0,
				failCount: 0
			};
		}

		if (dryRun) {
			return {
				status: 'dry_run_window_closed',
				totalUsers,
				submittedUsers: submittedUserIds.size,
				nonSubmitters: nonSubmitterNames,
				raceName: race.raceName,
				deadline: submissionDeadline.toISOString(),
				successCount: 0,
				failCount: 0
			};
		}

		const markerName = `prediction-window-closed-${race.id}`;
		let alreadyNotified = false;
		try {
			const marker = await pb.collection('feature_flags').getFirstListItem(
				pb.filter('name = {:name}', { name: markerName })
			);
			alreadyNotified = marker.enabled;
		} catch (error) {
			if ((error as { status?: number }).status !== 404) throw error;
		}
		if (alreadyNotified) {
			return {
				status: 'window_already_notified',
				totalUsers,
				submittedUsers: submittedUserIds.size,
				nonSubmitters: nonSubmitterNames,
				raceName: race.raceName,
				deadline: submissionDeadline.toISOString(),
				successCount: 0,
				failCount: 0
			};
		}

		const result = await sendNotifications({
			title: `🔒 ${race.raceName} Predictions Closed`,
			body: 'The prediction window has closed. Good luck!',
			url: '/predictions',
			tag: `prediction-window-closed-${race.id}`,
			data: {
				url: '/predictions',
				raceId: race.id,
				raceName: race.raceName
			}
		});
		if (result.successCount > 0) {
			await pb.collection('feature_flags').create({ name: markerName, enabled: true });
		}
		return {
			status: result.status || 'window_closed_notification_sent',
			totalUsers,
			submittedUsers: submittedUserIds.size,
			nonSubmitters: nonSubmitterNames,
			raceName: race.raceName,
			deadline: submissionDeadline.toISOString(),
			successCount: result.successCount || 0,
			failCount: result.failCount || 0
		};
	}

	// Calculate time until the submission deadline.
	const timeUntilRace = deadlineTime - now;
	const hoursUntilRace = Math.floor(timeUntilRace / (1000 * 60 * 60));
	const minutesUntilRace = Math.floor((timeUntilRace % (1000 * 60 * 60)) / (1000 * 60));

	if (nonSubmitters.length === 0) {
		return {
			status: 'no_non_submitters',
			totalUsers,
			submittedUsers: submittedUserIds.size,
			nonSubmitters: [],
			raceName: race.raceName,
			successCount: 0,
			failCount: 0
		};
	}

	if (dryRun) {
		return {
			status: 'dry_run',
			totalUsers,
			submittedUsers: submittedUserIds.size,
			nonSubmitters: nonSubmitterNames,
			raceName: race.raceName,
			deadline: submissionDeadline.toISOString(),
			hoursUntilDeadline: hoursUntilRace,
			successCount: 0,
			failCount: 0
		};
	}

	// Build notification
	const title = `⏰ ${race.raceName} Predictions Due!`;
	const body =
		message ||
		`You haven't submitted your predictions yet. Deadline in ${hoursUntilRace}h ${minutesUntilRace}m.`;

	const payload = {
		title,
		body,
		url: '/predictions',
		tag: `prediction-reminder-${race.id}`,
		data: {
			url: '/predictions',
			raceId: race.id,
			raceName: race.raceName,
			nonSubmitterCount: nonSubmitters.length
		},
		actions: [
			{
				action: 'submit',
				title: 'Submit Predictions',
				icon: '/icon.png'
			}
		]
	};

	let successCount = 0;
	let failCount = 0;

	// Only notify users who have not submitted predictions.
	for (const user of nonSubmitters) {
		const result = await sendNotifications(payload, user.id);
		successCount += result.successCount || 0;
		failCount += result.failCount || 0;
	}

	return {
		status: successCount > 0 ? 'notifications_sent' : 'no_subscriptions',
		totalUsers,
		submittedUsers: submittedUserIds.size,
		nonSubmitters: nonSubmitterNames,
		raceName: race.raceName,
		deadline: submissionDeadline.toISOString(),
		hoursUntilDeadline: hoursUntilRace,
		successCount,
		failCount
	};
}

export async function sendTestNotification(
	title?: string,
	body?: string
): Promise<{
	status: string;
	message: string;
	successCount: number;
	failCount: number;
}> {
	const notifTitle = title || '🏎️ F1 League Test Notification';
	const notifBody = body || 'This is a test notification from the F1 League app. If you see this, notifications are working!';

	const result = await sendNotifications({
		title: notifTitle,
		body: notifBody,
		url: '/dashboard',
		tag: `test-notification-${Date.now()}`,
		data: {
			url: '/dashboard',
			testId: Date.now().toString()
		}
	});

	return {
		status: result.status || 'unknown',
		message:
			result.reason
				? `${result.reason}${result.error ? `: ${result.error}` : ''}`
				: result.successCount
					? `Test notification sent successfully to ${result.successCount} subscription(s).`
					: 'Test notification failed to send.',
		successCount: result.successCount || 0,
		failCount: result.failCount || 0
	};
}
