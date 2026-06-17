import { getAdminPb } from './pocketbase';
import { getRacesQuery, getNextRaceQuery } from './races';
import { getPredictionsQuery } from './predictions';
import { sendNotifications } from '$lib/notifications';

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;
const CRON_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function sendPredictionReminderNotifications(
	raceName?: string,
	message?: string,
	dryRun = false
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

	// Get all predictions for this race
	const allPredictions = await getPredictionsQuery();
	const racePredictions = allPredictions.filter((p) => p.race === race.id);
	const submittedUserIds = new Set(racePredictions.map((p) => p.user));

	// Get all users
	const allUsers = await pb.collection('users').getFullList();
	const totalUsers = allUsers.length;

	// Find users who haven't submitted
	const nonSubmitters = allUsers.filter((u) => !submittedUserIds.has(u.id));

	// Prediction window closes at the start of the first race session.
	const firstSession = race.sessions[0];
	const submissionDeadline = new Date(
		Date.parse(firstSession.date + ' ' + race.year + ' ' + firstSession.time)
	);
	const now = Date.now();
	const deadlineTime = submissionDeadline.getTime();
	const reminderStartTime = deadlineTime - REMINDER_WINDOW_MS;
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
		if (now > deadlineTime + CRON_INTERVAL_MS) {
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
		const resultJson = (await result.json()) as { status?: string; successCount?: number; failCount?: number };

		return {
			status: resultJson.status || 'window_closed_notification_sent',
			totalUsers,
			submittedUsers: submittedUserIds.size,
			nonSubmitters: nonSubmitterNames,
			raceName: race.raceName,
			deadline: submissionDeadline.toISOString(),
			successCount: resultJson.successCount || 0,
			failCount: resultJson.failCount || 0
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
		const resultJson = (await result.json()) as {
			status?: string;
			successCount?: number;
			failCount?: number;
		};

		successCount += resultJson.successCount || 0;
		failCount += resultJson.failCount || 0;
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

	const resultJson = (await result.json()) as {
		status?: string;
		reason?: string;
		error?: string;
		successCount?: number;
		failCount?: number;
	};

	return {
		status: resultJson.status || 'unknown',
		message:
			resultJson.reason
				? `${resultJson.reason}${resultJson.error ? `: ${resultJson.error}` : ''}`
				: resultJson.successCount
					? `Test notification sent successfully to ${resultJson.successCount} subscription(s).`
					: 'Test notification failed to send.',
		successCount: resultJson.successCount || 0,
		failCount: resultJson.failCount || 0
	};
}
