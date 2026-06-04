#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const mode = args[0] ?? 'help';
const LOCAL_MANIFEST = 'twa-manifest.json';
const EXAMPLE_MANIFEST = 'twa-manifest.example.json';

function run(command, commandArgs, options = {}) {
	const result = spawnSync(command, commandArgs, {
		stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
		encoding: 'utf8',
		shell: false
	});

	return {
		ok: result.status === 0,
		status: result.status ?? 1,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
		error: result.error
	};
}

function fail(message, hints = []) {
	console.error(`\nTWA build error: ${message}`);
	for (const hint of hints) console.error(`- ${hint}`);
	process.exit(1);
}

function printUsage() {
	console.log(`Usage:
  npm run twa:doctor
  npm run twa:init -- --manifest https://your-domain.example/manifest.webmanifest
  npm run twa:build

Commands:
  doctor   Check local Java/keytool/Bubblewrap prerequisites.
  init     Run Bubblewrap init against a hosted HTTPS web manifest.
  build    Run npm run build, then Bubblewrap build from local twa-manifest.json.`);
}

function getArg(name) {
	const i = args.indexOf(name);
	if (i === -1) return undefined;
	return args[i + 1];
}

function requireCommand(command, hint, versionArgs = ['--version']) {
	const result = run(command, versionArgs, { capture: true });
	if (!result.ok) {
		fail(`Required command not found or not runnable: ${command}`, [hint]);
	}
}

function bubblewrap(commandArgs, options = {}) {
	return run('npm', ['exec', '--yes', '--package', '@bubblewrap/cli', '--', 'bubblewrap', ...commandArgs], options);
}

function checkGitDoesNotTrackSecrets() {
	const result = run('git', ['ls-files'], { capture: true });
	if (!result.ok) return;

	const forbidden = result.stdout
		.split('\n')
		.filter(Boolean)
		.filter((file) => /(^|\/)(twa-manifest\.json|.*\.(apk|aab|jks|keystore|p12))$/i.test(file));

	if (forbidden.length > 0) {
		fail('Signing or generated Android artifacts are tracked by git.', [
			'Remove these files from git before building:',
			...forbidden.map((file) => `  ${file}`)
		]);
	}
}

function doctor({ requireManifest = false } = {}) {
	checkGitDoesNotTrackSecrets();
	requireCommand('java', 'Install a JDK first. On CachyOS/Arch: sudo pacman -S jdk17-openjdk');
	requireCommand('keytool', 'keytool is included with the JDK; make sure JAVA_HOME/bin is on PATH.', ['-help']);

	const version = run('npm', ['view', '@bubblewrap/cli', 'version'], { capture: true });
	if (!version.ok) {
		fail('Bubblewrap CLI package is not available from npm.', [
			'Check Node/npm networking, then try: npm view @bubblewrap/cli version',
			version.stderr.trim()
		].filter(Boolean));
	}

	if (requireManifest && !existsSync(LOCAL_MANIFEST)) {
		fail(`Missing local Bubblewrap project file: ${LOCAL_MANIFEST}`, [
			'Create it once with: npm run twa:init -- --manifest https://your-domain.example/manifest.webmanifest',
			`Use ${EXAMPLE_MANIFEST} as a reference for expected app metadata.`,
			'Do not commit twa-manifest.json if it includes local signing paths.'
		]);
	}
}

async function assertReadable(path, hint) {
	try {
		await access(path);
	} catch {
		fail(`Required file is not readable: ${path}`, [hint]);
	}
}

async function main() {
	if (mode === '--help' || mode === '-h' || mode === 'help') {
		printUsage();
		return;
	}

	if (mode === 'doctor') {
		doctor();
		console.log('TWA prerequisites look available.');
		return;
	}

	if (mode === 'init') {
		doctor();
		const manifestUrl = getArg('--manifest') ?? process.env.TWA_MANIFEST_URL;
		if (!manifestUrl) {
			fail('No hosted web manifest URL was provided.', [
				'Example: npm run twa:init -- --manifest https://your-domain.example/manifest.webmanifest',
				'Bubblewrap validates the hosted PWA and cannot initialise from the local Vite build output alone.'
			]);
		}

		console.log(`Initialising Bubblewrap from ${manifestUrl}`);
		const init = bubblewrap(['init', '--manifest', manifestUrl]);
		if (!init.ok) process.exit(init.status || 1);
		return;
	}

	if (mode !== 'build') {
		printUsage();
		fail(`Unknown mode: ${mode}`);
	}

	console.log('Building web app before TWA package...');
	const build = run('npm', ['run', 'build']);
	if (!build.ok) process.exit(build.status || 1);

	doctor({ requireManifest: true });
	await assertReadable(LOCAL_MANIFEST, 'Run npm run twa:init first.');

	console.log('Running Bubblewrap build...');
	const twaBuild = bubblewrap(['build']);
	if (!twaBuild.ok) process.exit(twaBuild.status || 1);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
