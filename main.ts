import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { loadPtnData, markItemSynced  } from 'ptn';
import { FeedItem } from "ptn-helpers";

interface PluginSettings {
	ptn_key: string;
	auto_prepend: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	ptn_key: '',
	auto_prepend: '#PhoneToNoteToObsidian',
}

export default class PhoneToNoteToObsidianPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new PhoneToNoteToObsidianSettingTab(this.app, this));

		this.registerInterval(window.setInterval(this.getPhoneToObsidian.bind(this), 60 * 1000));
		this.getPhoneToObsidian();
	}

	async getPhoneToObsidian() {
		if (this.settings.ptn_key.trim() === '') {
			new Notice(`The Phone to Obsidian plugin is not configured. Please configure it in the settings.`);
			return;
		}

		// Get new messages from the feed
		const items: FeedItem[] = await loadPtnData(this.settings.ptn_key);

		// Retrieve the inbox file
		let file = this.app.vault.getAbstractFileByPath('Inbox.md');

		// If the inbox note doesn't exist, create it
		if (!file) {
			var note = await this.app.vault.create('Inbox.md', '');
		} else {
			// Check if file is a TFile
			if (file instanceof TFile) {
				var note = file;
			} else {
				new Notice(`Unable to find nor create the inbox file.`);
				return;
			}
		}

		for (const phoneNote of items) { 
			this.app.vault.append(note, this.settings.auto_prepend + ' **' + phoneNote._ptr_sender_type + '@' + phoneNote.date_published + '**\n');

			if (String.isString(phoneNote.content_text)) {
				for (const line of phoneNote.content_text.split('\n')) {
					this.app.vault.append(note, '> ' + line + '\n');
				}
			}

			this.app.vault.append(note, '\n');
			markItemSynced(phoneNote, this.settings.ptn_key);
			new Notice('Added new Phone to Note to Obsidian note to ' + note.path);
		}
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PhoneToNoteToObsidianSettingTab extends PluginSettingTab {
	plugin: PhoneToNoteToObsidianPlugin;

	constructor(app: App, plugin: PhoneToNoteToObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Phone to Note to Obsidian Settings'});

		new Setting(containerEl)
			.setName('ptn_key')
			.setDesc('From www.phonetonote.com')
			.addText(text => text
				.setPlaceholder('Required')
				.setValue(this.plugin.settings.ptn_key)
				.onChange(async (value) => {
					this.plugin.settings.ptn_key = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto prepend')
			.setDesc('Hashtags or other text to prepend to every note')
			.addText(text => text
				.setPlaceholder('E.g. #PhoneToNoteToObsidian')
				.setValue(this.plugin.settings.auto_prepend)
				.onChange(async (value) => {
					this.plugin.settings.auto_prepend = value;
					await this.plugin.saveSettings();
				}));
	}
}


