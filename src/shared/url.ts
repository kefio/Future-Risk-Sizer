export function getTradingViewSymbolFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    const query = url.searchParams.get('symbol') ?? url.searchParams.get('ticker');
    if (query) return decodeURIComponent(query);

    if (url.hash) {
      const hash = url.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);
      const fromHash = hashParams.get('symbol') ?? hashParams.get('ticker');
      if (fromHash) return decodeURIComponent(fromHash);
    }
  } catch {
    return '';
  }
  return '';
}

export function parseSymbolFromTitle(title: string): string {
  const match = title.match(/^(\w+\d*!?)\s*\//);
  if (match) return match[1];
  const dash = title.match(/^(\w+\d*!?)\s*[-–—]/);
  if (dash) return dash[1];
  // TradingView mette sempre il simbolo come prima parola del titolo
  const firstWord = title.split(/\s+/)[0];
  if (firstWord && /^[A-Za-z0-9]/.test(firstWord)) {
    return firstWord;
  }
  return '';
}
