import type { RequestHandler } from '@sveltejs/kit';
import { sendPredictionReminderNotifications } from '$lib/server/notifications';

/**
 * Cron endpoint - Trigger prediction reminder notifications.
 * 
 * Query parameters:
 *   - race: Optional race name filter (e.g., "British" for "British Grand Prix")
 *   - message: Custom message to override the default
 *   - dry-run: Set to "1" to get results without actually sending
 * 
 * Called by GitHub Actions cron workflow every 6 hours on race weekends.
 */
export const POST: RequestHandler = async ({ url }) => {
	const raceName = url.searchParams.get('race') || undefined;
	const customMessage = url.searchParams.get('message') || undefined;
	const dryRun = url.searchParams.get('dry-run') === '1';

	try {
		const result = await sendPredictionReminderNotifications(raceName, customMessage, dryRun);

		return new Response(
			JSON.stringify({
				success: true,
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
	} catch (error) {
		console.error('Prediction reminder error:', error);
		return new Response(
			JSON.stringify({ success: false, error: String(error) }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
