const walletLocks = new Map<string, Promise<void>>();

export async function withWalletLocks<T>(walletIds: string[], operation: () => Promise<T>) {
	const releases: (() => void)[] = [];

	for (const walletId of [...new Set(walletIds)].sort()) {
		const previous = walletLocks.get(walletId) ?? Promise.resolve();
		let release!: () => void;
		const current = new Promise<void>((resolve) => {
			release = resolve;
		});

		walletLocks.set(walletId, previous.then(() => current));
		await previous;
		releases.push(release);
	}

	try {
		return await operation();
	} finally {
		for (const release of releases.reverse()) release();
	}
}
