export type Prediction = {
	id: string;
	player: string;
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
	walletAddress: string;
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
};

export type Driver = {
	id: string | undefined;
	position: number;
	name: string;
	nationality: string;
	team: string;
	points: number;
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
