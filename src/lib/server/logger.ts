import { dev } from '$app/environment';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: Record<string, unknown>;
	error?: unknown;
}

const formatTimestamp = () => new Date().toISOString();

export const logger = {
	info(message: string, context?: Record<string, unknown>) {
		this.log('info', message, context);
	},
	warn(message: string, context?: Record<string, unknown>) {
		this.log('warn', message, context);
	},
	error(message: string, error?: unknown, context?: Record<string, unknown>) {
		this.log('error', message, context, error);
	},
	debug(message: string, context?: Record<string, unknown>) {
		if (dev) {
			this.log('debug', message, context);
		}
	},
	log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
		const entry: LogEntry = {
			level,
			message,
			timestamp: formatTimestamp(),
			context: context ? Object.fromEntries(Object.entries(context).map(([k, v]) => [k, JSON.stringify(v)])) : undefined,
		};

		if (error) {
			entry.error = error instanceof Error ? error.message : String(error);
			if (error instanceof Error) {
				console.error(JSON.stringify(entry), error.stack);
				return;
			}
		}

		if (level === 'error') {
			console.error(JSON.stringify(entry));
		} else if (level === 'warn') {
			console.warn(JSON.stringify(entry));
		} else {
			console.log(JSON.stringify(entry));
		}
	},
};
