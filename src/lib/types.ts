export type Prediction = {
	id: string;
	player: string;
	predictions: string[];
	expand: { user: Player; race: Race };
};

export type Player = {
	id: string;
	name: string;
	points: number;
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
	location: string;
	sessions: {
		date: string;
		time: string;
		title: string;
	}[];
	raceResults: string[];
	year: number;
};
