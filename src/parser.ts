import { TFile, Vault } from 'obsidian';
import { DailyNoteData, PersonInteraction } from './types';
import { DateFormat } from './settings';

function parseDateFromBasename(basename: string, format: DateFormat): Date | null {
	// Match any sequence of digits-digits-digits in the filename
	const ymd = /(\d{4})-(\d{2})-(\d{2})/;
	const dmy = /(\d{2})-(\d{2})-(\d{4})/;

	let y: number, m: number, d: number;

	if (format === 'YYYY-MM-DD') {
		const match = basename.match(ymd);
		if (!match || !match[1] || !match[2] || !match[3]) return null;
		[y, m, d] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
	} else if (format === 'DD-MM-YYYY') {
		const match = basename.match(dmy);
		if (!match || !match[1] || !match[2] || !match[3]) return null;
		[y, m, d] = [parseInt(match[3]), parseInt(match[2]), parseInt(match[1])];
	} else {
		// MM-DD-YYYY
		const match = basename.match(dmy);
		if (!match || !match[1] || !match[2] || !match[3]) return null;
		[y, m, d] = [parseInt(match[3]), parseInt(match[1]), parseInt(match[2])];
	}

	const date = new Date(y, m - 1, d);
	return isNaN(date.getTime()) ? null : date;
}

function extractPeopleLogLines(content: string): string[] {
	const lines = content.split('\n');
	let inSection = false;
	const result: string[] = [];

	for (const line of lines) {
		if (/^##\s+People\s+Log\s*$/i.test(line.trim())) {
			inSection = true;
			continue;
		}
		if (inSection) {
			if (/^#{1,6}\s/.test(line)) break;
			result.push(line);
		}
	}

	return result;
}

export async function parseVault(vault: Vault, folder: string, dateFormat: DateFormat): Promise<DailyNoteData[]> {
	const results: DailyNoteData[] = [];

	// Normalise: strip leading/trailing slashes; empty string = no folder filter
	const trimmed = folder.trim().replace(/^\/+/, '').replace(/\/+$/, '');
	const normalizedFolder = trimmed === '' ? '' : trimmed + '/';

	const allFiles = vault.getMarkdownFiles();
	console.log('[DailyTracker] vault files:', allFiles.map(f => f.path));
	console.log('[DailyTracker] folder filter:', normalizedFolder || '(none — scanning all)');
	console.log('[DailyTracker] date format:', dateFormat);

	const files = allFiles.filter(f => {
		if (normalizedFolder && !f.path.startsWith(normalizedFolder)) return false;
		return parseDateFromBasename(f.basename, dateFormat) !== null;
	});

	console.log('[DailyTracker] matched daily notes:', files.map(f => f.path));

	for (const file of files) {
		try {
			const data = await parseDailyNote(vault, file, dateFormat);
			if (data) results.push(data);
		} catch (e) {
			console.warn('[DailyTracker] failed to parse', file.path, e);
		}
	}

	return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function parseDailyNote(vault: Vault, file: TFile, dateFormat: DateFormat): Promise<DailyNoteData | null> {
	const date = parseDateFromBasename(file.basename, dateFormat);
	if (!date) return null;

	const content = await vault.cachedRead(file);

	const scoreMatch = content.match(/\[\[score-(\d+)\]\]/i);
	const score = (scoreMatch && scoreMatch[1]) ? parseInt(scoreMatch[1]) : null;

	const interactions: PersonInteraction[] = [];
	const logLines = extractPeopleLogLines(content);

	for (const line of logLines) {
		if (!line.trim()) continue;

		const wikilinks = [...line.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)];
		const people = wikilinks
			.map(m => m[1]?.trim() ?? '')
			.filter(p => p.length > 0 && !/^score-/i.test(p));

		if (people.length === 0) continue;

		const timeMatch = line.match(/(\d{3,4})-(\d{3,4})/);
		const context = line.replace(/^[-*\s]+/, '').trim();
		const timeStart = timeMatch ? timeMatch[1] : undefined;
		const timeEnd = timeMatch ? timeMatch[2] : undefined;

		for (const person of people) {
			interactions.push({
				person,
				timeStart,
				timeEnd,
				context,
				date,
			});
		}
	}

	return { date, score, interactions, filePath: file.path };
}
