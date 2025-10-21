// lib/stores/appkit.svelte.ts
import { browser } from '$app/environment';
import { createAppKit, type ConnectedWalletInfo } from '@reown/appkit';
import { solana, solanaDevnet, solanaTestnet } from '@reown/appkit/networks';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { PUBLIC_PROJECT_ID } from '$env/static/public';
import { Connection, PublicKey } from '@solana/web3.js';

let appKit: ReturnType<typeof createAppKit> | undefined = undefined;
let connection = new Connection(
	'https://mainnet.helius-rpc.com/?api-key=358953a3-7a7e-4fe7-977d-0112c094fd2f',
	'confirmed'
);

if (browser) {
	const projectId = PUBLIC_PROJECT_ID;
	if (!projectId) {
		throw new Error('PROJECT_ID is not set');
	}
	const adapter = new SolanaAdapter();

	// Initialize AppKit
	appKit = createAppKit({
		adapters: [adapter],
		networks: [solana, solanaTestnet, solanaDevnet],
		defaultNetwork: solana,
		projectId,
		metadata: {
			name: 'F1 League',
			description: 'F1 League',
			url: 'https://f1-league.hades.ws',
			icons: ['https://f1-league.hades.ws/logo.png']
		},
		includeWalletIds: ['20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66'],
		features: {
			email: false,
			socials: false,
			allWallets: true
		}
	});
}

export function getWalletAddress() {
	return appKit?.getAddress('solana') || '';
}

export { appKit, connection };
