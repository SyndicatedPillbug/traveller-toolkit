import { TravellerToolkitSettings, DEFAULT_SETTINGS } from "./types";

export class TravellerToolkitSettingsManager {
  private settings: TravellerToolkitSettings;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  async load(app: any): Promise<void> {
    const loaded = await app.loadData();
    if (loaded) {
      this.settings = { ...DEFAULT_SETTINGS, ...loaded };
    }
  }

  async save(app: any): Promise<void> {
    await app.saveData(this.settings);
  }

  get(): TravellerToolkitSettings {
    return this.settings;
  }

  set(partial: Partial<TravellerToolkitSettings>): void {
    this.settings = { ...this.settings, ...partial };
  }

  getSetting<K extends keyof TravellerToolkitSettings>(key: K): TravellerToolkitSettings[K] {
    return this.settings[key];
  }

  setSetting<K extends keyof TravellerToolkitSettings>(
    key: K,
    value: TravellerToolkitSettings[K]
  ): void {
    this.settings[key] = value;
  }
}
