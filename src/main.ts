import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, TrackerSettings, TrackerSettingTab } from './settings';
import { DASHBOARD_VIEW_TYPE, DashboardView } from './ui/dashboard-view';

export default class DailyTrackerPlugin extends Plugin {
	settings: TrackerSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			DASHBOARD_VIEW_TYPE,
			leaf => new DashboardView(leaf, this)
		);

		this.addRibbonIcon('bar-chart-horizontal', 'Open daily tracker', () => {
			void this.activateDashboard();
		});

		this.addCommand({
			id: 'open-dashboard',
			name: 'Open dashboard',
			callback: () => { void this.activateDashboard(); },
		});

		this.addSettingTab(new TrackerSettingTab(this.app, this));
	}

	onunload() {
		// intentionally empty — do not detach leaves on unload
	}

	async activateDashboard() {
		const existing = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
		if (existing.length > 0 && existing[0]) {
			void this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TrackerSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
