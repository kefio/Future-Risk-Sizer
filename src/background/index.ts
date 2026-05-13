import { normalizeInstrumentSymbol } from '../shared/instruments';
import { loadAppState, loadSettings, saveLatestInstrument, saveSettings } from '../shared/storage';
import { calculatePosition } from '../shared/calculator';
import type { DetectedInstrument, Settings } from '../shared/types';
import { getTradingViewSymbolFromUrl } from '../shared/url';

declare const chrome: any;

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await loadSettings();
  await saveSettings(settings);
});

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  (async () => {
    if (message?.type === 'INSTRUMENT_UPDATE') {
      await saveLatestInstrument(message.payload as DetectedInstrument);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'SAVE_SETTINGS') {
      await saveSettings(message.payload as Settings);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'GET_APP_STATE') {
      const state = await loadAppState();
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabUrl = activeTab?.[0]?.url ?? '';
      const fallback = normalizeInstrumentSymbol(getTradingViewSymbolFromUrl(tabUrl));
      const baseSymbol = state.latestInstrument?.normalizedSymbol ?? fallback ?? null;
      sendResponse({
        ...state,
        activeInstrument: baseSymbol,
        calculation: calculatePosition(baseSymbol, 0, state.settings, state.latestInstrument?.rawSymbol ?? '')
      });
      return;
    }

    if (message?.type === 'CALCULATE') {
      const state = await loadAppState();
      const baseSymbol = normalizeInstrumentSymbol(message.payload?.symbol ?? '') ?? state.latestInstrument?.normalizedSymbol ?? null;
      sendResponse({
        calculation: calculatePosition(baseSymbol, Number(message.payload?.stopTicks ?? 0), state.settings, message.payload?.symbol ?? '')
      });
      return;
    }

    sendResponse({ ok: false });
  })();

  return true;
});
