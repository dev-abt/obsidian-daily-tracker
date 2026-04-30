export interface DailyNoteData {
	date: Date;
	score: number | null;
	interactions: PersonInteraction[];
	filePath: string;
}

export interface PersonInteraction {
	person: string;
	timeStart?: string;
	timeEnd?: string;
	context: string;
	date: Date;
}
