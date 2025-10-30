// walletSessionCheck.ts
export async function hasWalletConnectSession(): Promise<boolean> {
	const dbName = 'WALLET_CONNECT_V2_INDEXED_DB';
	const storeName = 'keyvaluestorage';

	try {
		const db = await openIndexedDB(dbName);
		if (!db) return false;

		if (!db.objectStoreNames.contains(storeName)) {
			db.close();
			return false;
		}

		const allKeys = await getAllKeys(db, storeName);
		db.close();

		// Look for keys that indicate stored sessions
		return allKeys.some((key) => typeof key === 'string' && key.includes(':session'));
	} catch (err) {
		console.warn('WalletConnect IndexedDB not found or unreadable', err);
		return false;
	}
}

function openIndexedDB(name: string): Promise<IDBDatabase | null> {
	return new Promise((resolve) => {
		const request = indexedDB.open(name);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
		request.onupgradeneeded = () => resolve(null); // empty DB
	});
}

function getAllKeys(db: IDBDatabase, storeName: string): Promise<IDBValidKey[]> {
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(storeName, 'readonly');
			const store = tx.objectStore(storeName);
			const req = store.getAllKeys();

			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve([]);
		} catch {
			resolve([]);
		}
	});
}
