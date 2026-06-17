#!/usr/bin/env node

/**
 * Test notification script for the F1 League app.
 * 
 * Usage:
 *   node scripts/test-notifications.mjs                    # Basic test notification
 *   node scripts/test-notifications.mjs prediction         # Send prediction reminder
 *   node scripts/test-notifications.mjs prediction British # Send reminder for British GP
 *   node scripts/test-notifications.mjs prediction --race "British"
 *   node scripts/test-notifications.mjs prediction --message "Custom message"
 *   node scripts/test-notifications.mjs prediction --dry-run
 */

const API_URL = process.env.F1_LEAGUE_API_URL || 'https://f1-league.hades.ws';
const args = process.argv.slice(2);

function printUsage() {
	console.log(`
F1 League Notification Tester

Usage:
  node scripts/test-notifications.mjs [command] [options]

Commands:
  test              Send a basic test notification (default)
  prediction        Send prediction reminder notification

Options:
  --race <name>     Filter to a specific race (e.g., "British")
  --message <msg>   Custom notification message
  --dry-run         Show results without sending

Examples:
  node scripts/test-notifications.mjs
  node scripts/test-notifications.mjs prediction
  node scripts/test-notifications.mjs prediction --race British
  node scripts/test-notifications.mjs prediction --message "Last chance!"
  node scripts/test-notifications.mjs prediction --dry-run
`);
}

async function sendRequest(path, options = {}) {
	const url = `${API_URL}${path}`;
	console.log(`\n📡 Sending request to: ${url}`);
	console.log(`   Method: ${options.method || 'POST'}`);
	console.log('');

	try {
		const response = await fetch(url, {
			method: options.method || 'POST',
			headers: { 'Content-Type': 'application/json' },
			...options
		});

		const data = await response.json();
		console.log('✅ Response:');
		console.log(JSON.stringify(data, null, 2));

		if (data.success) {
			console.log('\n🎉 Notification sent successfully!');
			console.log(`   Type: ${data.type}`);
			console.log(`   Status: ${data.data?.status}`);
			if (data.data?.nonSubmitterCount !== undefined) {
				console.log(`   Non-submitters: ${data.data.nonSubmitterCount}`);
			}
			if (data.data?.nonSubmitters?.length > 0) {
				console.log(`   Players notified: ${data.data.nonSubmitters.join(', ')}`);
			}
		} else {
			console.log(`\n❌ Failed: ${data.error || 'Unknown error'}`);
		}

		return data;
	} catch (error) {
		console.error('❌ Request failed:', error.message);
		return null;
	}
}

async function main() {
	const command = args[0] || 'test';
	const raceName = args.find((a) => a === '--race') ? args[args.indexOf('--race') + 1] : undefined;
	const customMessage = args.find((a) => a === '--message') ? args[args.indexOf('--message') + 1] : undefined;
	const dryRun = args.includes('--dry-run');

	if (command === 'help' || command === '--help' || command === '-h') {
		printUsage();
		return;
	}

	console.log('🏎️  F1 League Notification Tester');
	console.log(`   API URL: ${API_URL}`);
	console.log(`   Command: ${command}`);
	console.log('');

	if (command === 'prediction') {
		let path = '/api/notifications/predictions';
		const params = [];
		if (raceName) params.push(`race=${encodeURIComponent(raceName)}`);
		if (customMessage) params.push(`message=${encodeURIComponent(customMessage)}`);
		if (dryRun) params.push('dry-run=1');
		if (params.length > 0) path += `?${params.join('&')}`;

		await sendRequest(path, { method: 'POST' });
	} else if (command === 'test') {
		let path = '/api/notifications/test';
		const params = [];
		if (customMessage) params.push(`body=${encodeURIComponent(customMessage)}`);
		if (params.length > 0) path += `?${params.join('&')}`;

		await sendRequest(path, { method: 'GET' });
	} else {
		console.log(`❌ Unknown command: ${command}`);
		printUsage();
	}
}

main().catch(console.error);
