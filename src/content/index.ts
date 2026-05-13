import { detectBaseFromText, normalizeInstrumentSymbol } from '../shared/instruments';
import type { DetectedInstrument } from '../shared/types';
import { getTradingViewSymbolFromUrl, parseSymbolFromTitle } from '../shared/url';

declare const chrome: any;

console.log('[FRS] Content script loaded');

let lastSent = '';

function detectInstrument(): DetectedInstrument {
  const titleSymbol = parseSymbolFromTitle(document.title);
  if (titleSymbol) {
    const normalizedTitle = normalizeInstrumentSymbol(titleSymbol);
    if (normalizedTitle) {
      console.log('[FRS] Detected from title regex:', titleSymbol, '→', normalizedTitle);
      return { rawSymbol: titleSymbol, normalizedSymbol: normalizedTitle, source: 'title' };
    }
    return { rawSymbol: titleSymbol, normalizedSymbol: null, source: 'unknown' };
  }

  const titleScan = detectBaseFromText(document.title);
  if (titleScan.symbol) {
    console.log('[FRS] Detected from title scan:', titleScan.rawSymbol, '→', titleScan.symbol);
    return { rawSymbol: titleScan.rawSymbol, normalizedSymbol: titleScan.symbol, source: 'title' };
  }

  const fromUrl = getTradingViewSymbolFromUrl(location.href);
  const normalizedUrl = normalizeInstrumentSymbol(fromUrl);
  if (normalizedUrl) {
    console.log('[FRS] Detected from URL:', fromUrl, '→', normalizedUrl);
    return { rawSymbol: fromUrl, normalizedSymbol: normalizedUrl, source: 'url' };
  }

  const bodyText = document.body?.innerText?.slice(0, 4000) ?? '';
  const bodyMatch = detectBaseFromText(bodyText);
  if (bodyMatch.symbol) {
    console.log('[FRS] Detected from body:', bodyMatch.rawSymbol, '→', bodyMatch.symbol);
    return { rawSymbol: bodyMatch.rawSymbol, normalizedSymbol: bodyMatch.symbol, source: 'dom' };
  }

  console.log('[FRS] No instrument detected. Title:', document.title);
  return { rawSymbol: fromUrl || document.title || '', normalizedSymbol: null, source: 'unknown' };
}

function emitDetection() {
  try {
    const detection = detectInstrument();
    const serialized = JSON.stringify(detection);
    if (serialized === lastSent) return;
    lastSent = serialized;
    chrome.runtime.sendMessage({ type: 'INSTRUMENT_UPDATE', payload: detection }, () => void chrome.runtime.lastError);
  } catch (e) {
    console.warn('[FRS] emitDetection error:', e);
  }
}

function observeHistory() {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = pushState.apply(this, args as any);
    window.dispatchEvent(new Event('frs-locationchange'));
    return result;
  };

  history.replaceState = function (...args) {
    const result = replaceState.apply(this, args as any);
    window.dispatchEvent(new Event('frs-locationchange'));
    return result;
  };

  window.addEventListener('popstate', () => window.dispatchEvent(new Event('frs-locationchange')));
  window.addEventListener('frs-locationchange', emitDetection);
}

observeHistory();
emitDetection();
setInterval(emitDetection, 1500);

const head = document.querySelector('head');
if (head) {
  new MutationObserver(() => {
    console.log('[FRS] Title mutation detected, title:', document.title);
    emitDetection();
  }).observe(head, {
    subtree: true,
    characterData: true,
    childList: true,
  });
}
