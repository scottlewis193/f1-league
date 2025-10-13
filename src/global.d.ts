// src/global.d.ts
export {};

declare global {
	interface Window {
		phantom?: {
			solana?: {
				isPhantom?: boolean;
				connect: () => Promise<{ publicKey: { toString: () => string } }>;
				disconnect: () => Promise<void>;
				publicKey?: { toString: () => string };
				on: (event: string, handler: () => void) => void;
			};
		};
		solana?: {
			isPhantom?: boolean;
			connect: () => Promise<{ publicKey: { toString: () => string } }>;
			disconnect: () => Promise<void>;
			publicKey?: { toString: () => string };
			on: (event: string, handler: () => void) => void;
		};
	}
}
