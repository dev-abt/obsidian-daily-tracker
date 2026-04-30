import { App, PluginSettingTab, Setting } from 'obsidian';
import type DailyTrackerPlugin from './main';

export type DateFormat = 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY';

export interface TrackerSettings {
	dailyNotesFolder: string;
	dateFormat: DateFormat;
}

export const DEFAULT_SETTINGS: TrackerSettings = {
	dailyNotesFolder: '/',
	dateFormat: 'DD-MM-YYYY',
};

const DATE_FORMAT_OPTIONS: Record<DateFormat, string> = {
	'YYYY-MM-DD': 'YYYY-MM-DD (e.g. 2026-04-30)',
	'DD-MM-YYYY': 'DD-MM-YYYY (e.g. 30-04-2026)',
	'MM-DD-YYYY': 'MM-DD-YYYY (e.g. 04-30-2026)',
};

export class TrackerSettingTab extends PluginSettingTab {
	plugin: DailyTrackerPlugin;

	constructor(app: App, plugin: DailyTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Path to the folder containing your daily notes. Use "/" for the vault root.')
			.addText(text =>
				text
					.setPlaceholder('/')
					.setValue(this.plugin.settings.dailyNotesFolder)
					.onChange(async value => {
						this.plugin.settings.dailyNotesFolder = value.trim() || '/';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Date format')
			.setDesc('The date format used in your daily note filenames.')
			.addDropdown(drop => {
				for (const [value, label] of Object.entries(DATE_FORMAT_OPTIONS)) {
					drop.addOption(value, label);
				}
				drop.setValue(this.plugin.settings.dateFormat);
				drop.onChange(async value => {
					this.plugin.settings.dateFormat = value as DateFormat;
					await this.plugin.saveSettings();
				});
			});
	}
}
