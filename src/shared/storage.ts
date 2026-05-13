import { DEFAULT_SETTINGS } from './calculator';
import type { BaseSymbol, DetectedInstrument, Settings } from './types';

const SETTINGS_KEY = 'settings';
const LATEST_INSTRUMENT_KEY = 'latestInstrument';

type AppState = {
  settings: Settings;
  latestInstrument: DetectedInstrument | null;
};

function storage(): typeof chrome.storage.local {
  return chrome.storage.local;
}

export async function loadSettings(): Promise<Settings> {
  const result = await storage().get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storage().set({ [SETTINGS_KEY]: settings });
}

export async function loadLatestInstrument(): Promise<DetectedInstrument | null> {
  const result = await storage().get(LATEST_INSTRUMENT_KEY);
  return result[LATEST_INSTRUMENT_KEY] ?? null;
}

export async function saveLatestInstrument(instrument: DetectedInstrument | null): Promise<void> {
  await storage().set({ [LATEST_INSTRUMENT_KEY]: instrument });
}

export async function loadAppState(): Promise<AppState> {
  const [settings, latestInstrument] = await Promise.all([loadSettings(), loadLatestInstrument()]);
  return { settings, latestInstrument };
}

export function updateBuffer(settings: Settings, symbol: BaseSymbol, value: number): Settings {
  return {
    ...settings,
    perInstrumentBufferTicks: {
      ...settings.perInstrumentBufferTicks,
      [symbol]: value
    }
  };
}
