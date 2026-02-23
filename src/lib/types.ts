export type Prediction = {
	race: string;
	id: string;
	user: string;
	predictions: string[];
	expand: { user: Player; race: Race };
};

export type Player = {
	[key: string]: string | boolean | number | HistoryEntry[];
	id: string;
	name: string;
	email: string;
	avatar: string;
	displayLatestResultsDialog: boolean;
	points: number;
	lastPointsEarned: number;
	place: number;
	exact: number;
	historyEntries: HistoryEntry[];
};

export type HistoryEntry = {
	location: string;
	predictions: string[];
	results: string[];
	points: number[];
	place: string[];
	exact: string[];
};

export type Team = {
	id: string;
	position: number;
	name: string;
	points: number;
	year: number;
};

export type Driver = {
	id: string | undefined;
	position: number;
	name: string;
	nationality: string;
	team: string;
	points: number;
	year: number;
};

export type Race = {
	id: string;
	raceNo: number;
	raceName: string;
	city: string;
	location: string;
	sessions: {
		date: string;
		time: string;
		title: string;
	}[];
	raceResults: string[];
	year: number;
};

export type OddsRecord = {
	id: string;
	driver: string;
	race: string;
	odds: number;
	pointsForPlace: number;
	pointsForExact: number;
	expand: { driver: Driver; race: Race };
};

export type Wallet = {
	id: string;
	user: string;
	type: 'user' | 'prediction' | 'season';
	balance: number;
	profit: number;
	wiseRecipientId: number;
	expand: { user: Player };
};

export type WiseTransfer = {
	id: number;
	user: number;
	targetAccount: number;
	sourceAccount: number;
	quote: number;
	quoteUuid: string;
	status: string;
	reference: string;
	rate: number;
	created: string;
	business: number;
	transferRequest: number;
	details: {
		reference: string;
	};
	hasActiveIssues: boolean;
	sourceCurrency: string;
	sourceValue: number;
	targetCurrency: string;
	targetValue: number;
	customerTransactionId: string;
	payinSessionId: string;
};

export type TransferLog = {
	created: string;
	id: string;
	user: string;
	wallet: string;
	amount: number;
	type: 'deposit' | 'withdraw' | 'transfer';
	targetWallet: string;
};
