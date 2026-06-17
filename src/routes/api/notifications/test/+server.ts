import type { RequestHandler } from '@sveltejs/kit';
import { sendTestNotification, sendPredictionReminderNotifications } from '$lib/server/notifications';

/**
 * Test endpoint - Manually trigger and test notifications.
 *
 * GET /api/notifications/test
 *   - Sends a generic test notification to all subscribers
 *
 * GET /api/notifications/test?prediction=true
 *   - Sends the prediction reminder notification (same as cron)
 *
 * GET /api/notifications/test?prediction=true&race=British
 *   - Sends prediction reminder for a specific race
 *
 * GET /api/notifications/test?prediction=true&message=Custom+message
 *   - Sends prediction reminder with custom message
 *
 * GET /api/notifications/test?prediction=true&dry-run=1
 *   - Shows who would be notified without actually sending
 */
export const GET: RequestHandler = async ({ url }) => {
	const isPredictionReminder = url.searchParams.get('prediction') === 'true';
	const raceName = url.searchParams.get('race') || undefined;
	const customMessage = url.searchParams.get('message') || undefined;
	const dryRun = url.searchParams.get('dry-run') === '1';

	try {
		let result;

		if (isPredictionReminder) {
			result = await sendPredictionReminderNotifications(raceName, customMessage, dryRun);
			return new Response(
				JSON.stringify({
					success: true,
					type: 'prediction_reminder',
					dryRun,
					data: {
						status: result.status,
						totalUsers: result.totalUsers,
						submittedUsers: result.submittedUsers,
						nonSubmitterCount: result.nonSubmitters.length,
						nonSubmitters: result.nonSubmitters,
						raceName: result.raceName,
						deadline: result.deadline,
						hoursUntilDeadline: result.hoursUntilDeadline,
						successCount: result.successCount || 0,
						failCount: result.failCount || 0
					}
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Extract custom title/body from query params if provided
		const customTitle = url.searchParams.get('title') || undefined;
		const customBody = url.searchParams.get('body') || undefined;

		result = await sendTestNotification(customTitle, customBody);
		return new Response(
			JSON.stringify({
				success: result.status === 'notifications_sent',
				type: 'test_notification',
				data: {
					status: result.status,
					message: result.message,
					successCount: result.successCount,
					failCount: result.failCount
				}
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Notification test error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: String(error),
				stack: (error as Error).stack
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
