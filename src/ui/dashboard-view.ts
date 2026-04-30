import { ItemView, WorkspaceLeaf } from 'obsidian';
import { DailyNoteData } from '../types';
import { parseVault } from '../parser';
import { renderScoreChart, renderPeopleChart } from './charts';
import type DailyTrackerPlugin from '../main';

export const DASHBOARD_VIEW_TYPE = 'daily-tracker-dashboard';

const RANGE_OPTIONS = [
	{ label: '7d', days: 7 },
	{ label: '30d', days: 30 },
	{ label: '90d', days: 90 },
	{ label: 'All', days: 0 },
];

export class DashboardView extends ItemView {
	private plugin: DailyTrackerPlugin;
	private notes: DailyNoteData[] = [];
	private scoreDays = 30;
	private scoreFilter: 'all' | 'low' | 'mid' | 'high' = 'all';
	private loading = false;

	constructor(leaf: WorkspaceLeaf, plugin: DailyTrackerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() { return DASHBOARD_VIEW_TYPE; }
	getDisplayText() { return 'Daily tracker'; }
	getIcon() { return 'bar-chart-horizontal'; }

	async onOpen() {
		await this.refresh();
	}

	async refresh() {
		if (this.loading) return;
		this.loading = true;
		this.renderLoading();

		try {
			this.notes = await parseVault(this.app.vault, this.plugin.settings.dailyNotesFolder, this.plugin.settings.dateFormat);
		} catch (e) {
			console.error('[DailyTracker] parseVault failed', e);
			this.notes = [];
		} finally {
			this.loading = false;
		}
		this.render();
	}

	private renderLoading() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tracker-dashboard');
		contentEl.createEl('p', { text: 'Loading…', cls: 'tracker-empty' });
	}

	render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tracker-dashboard');

		const header = contentEl.createDiv('tracker-header');
		header.createEl('h2', { text: 'Daily tracker' });
		const refreshBtn = header.createEl('button', { text: 'Refresh', cls: 'tracker-refresh-btn' });
		refreshBtn.addEventListener('click', () => { void this.refresh(); });

		if (this.notes.length === 0) {
			contentEl.createEl('p', {
				text: 'No daily notes found. Make sure your daily notes folder is set correctly in settings.',
				cls: 'tracker-empty',
			});
			return;
		}

		// ── Stats cards ──────────────────────────────────────────────────────────
		const scoredNotes = this.notes.filter(n => n.score !== null);
		const avgScore = scoredNotes.length > 0
			? (scoredNotes.reduce((s, n) => s + n.score!, 0) / scoredNotes.length).toFixed(1)
			: '—';

		const allInteractions = this.notes.flatMap(n => n.interactions);
		const uniquePeople = new Set(allInteractions.map(i => i.person)).size;

		const stats = contentEl.createDiv('tracker-stats');
		this.statCard(stats, 'Days tracked', String(this.notes.length));
		this.statCard(stats, 'Avg score', String(avgScore));
		this.statCard(stats, 'Interactions', String(allInteractions.length));
		this.statCard(stats, 'People met', String(uniquePeople));

		// ── Score chart ───────────────────────────────────────────────────────────
		const scoreSection = contentEl.createDiv('tracker-section');
		scoreSection.createEl('h3', { text: 'Score over time' });

		const controls = scoreSection.createDiv('tracker-controls');

		for (const opt of RANGE_OPTIONS) {
			const btn = controls.createEl('button', {
				text: opt.label,
				cls: 'tracker-range-btn' + (opt.days === this.scoreDays ? ' is-active' : ''),
			});
			btn.addEventListener('click', () => {
				this.scoreDays = opt.days;
				this.render();
			});
		}

		controls.createSpan({ cls: 'tracker-controls-divider' });

		type ScoreFilter = typeof this.scoreFilter;
		const SCORE_FILTERS: { label: string; key: ScoreFilter }[] = [
			{ label: 'All', key: 'all' },
			{ label: '≤5', key: 'low' },
			{ label: '6–7', key: 'mid' },
			{ label: '≥8', key: 'high' },
		];

		for (const f of SCORE_FILTERS) {
			const btn = controls.createEl('button', {
				text: f.label,
				cls: 'tracker-range-btn' + (f.key === this.scoreFilter ? ' is-active' : ''),
			});
			btn.addEventListener('click', () => {
				this.scoreFilter = f.key;
				this.render();
			});
		}

		const cutoff = new Date();
		if (this.scoreDays > 0) cutoff.setDate(cutoff.getDate() - this.scoreDays);
		else cutoff.setFullYear(2000);

		const filteredScores = scoredNotes
			.filter(n => n.date >= cutoff)
			.filter(n => {
				if (this.scoreFilter === 'low') return n.score! <= 5;
				if (this.scoreFilter === 'mid') return n.score! >= 6 && n.score! <= 7;
				if (this.scoreFilter === 'high') return n.score! >= 8;
				return true;
			})
			.map(n => ({ date: n.date, score: n.score! }));

		const intervalAvg = filteredScores.length > 0
			? (filteredScores.reduce((s, n) => s + n.score, 0) / filteredScores.length).toFixed(1)
			: null;
		if (intervalAvg !== null) {
			controls.createSpan({
				text: `Avg ${intervalAvg}`,
				cls: 'tracker-controls-avg',
			});
		}

		const scoreChartEl = scoreSection.createDiv('tracker-chart-container');
		renderScoreChart(scoreChartEl, filteredScores);

		// ── People chart ──────────────────────────────────────────────────────────
		const peopleSection = contentEl.createDiv('tracker-section');
		peopleSection.createEl('h3', { text: 'Top people' });

		const counts = new Map<string, number>();
		for (const i of allInteractions) {
			counts.set(i.person, (counts.get(i.person) ?? 0) + 1);
		}
		const sortedCounts = [...counts.entries()].sort((a, b) => b[1] - a[1]);

		const peopleChartEl = peopleSection.createDiv('tracker-chart-container');
		renderPeopleChart(peopleChartEl, sortedCounts);

		// ── Recent interactions ───────────────────────────────────────────────────
		const recentSection = contentEl.createDiv('tracker-section');
		recentSection.createEl('h3', { text: 'Recent interactions' });

		const recent = [...allInteractions]
			.sort((a, b) => b.date.getTime() - a.date.getTime())
			.slice(0, 20);

		if (recent.length === 0) {
			recentSection.createEl('p', { text: 'No interactions logged yet.', cls: 'tracker-empty' });
		} else {
			const table = recentSection.createEl('table', { cls: 'tracker-interactions' });
			for (const entry of recent) {
				const row = table.createEl('tr');
				row.createEl('td', {
					text: entry.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
					cls: 'tracker-cell-date',
				});
				row.createEl('td', { text: entry.person, cls: 'tracker-cell-person' });
				row.createEl('td', { text: entry.context, cls: 'tracker-cell-context' });
			}
		}
	}

	private statCard(parent: HTMLElement, label: string, value: string) {
		const card = parent.createDiv('tracker-stat-card');
		card.createDiv({ text: value, cls: 'tracker-stat-value' });
		card.createDiv({ text: label, cls: 'tracker-stat-label' });
	}

	async onClose() {
		this.contentEl.empty();
	}
}
