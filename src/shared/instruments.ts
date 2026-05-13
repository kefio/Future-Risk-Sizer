import type { BaseSymbol, BufferMode, InstrumentConfig, InstrumentSymbol } from './types';

export const INSTRUMENTS: Record<BaseSymbol, InstrumentConfig> = {
  ES: {
    symbol: 'ES',
    tickSize: 0.25,
    tickValue: 12.5,
    microSymbol: 'MES',
    miniSymbol: 'ES',
    aliases: ['ES', 'MES', 'ES1!', 'MES1!']
  },
  NQ: {
    symbol: 'NQ',
    tickSize: 0.25,
    tickValue: 5,
    microSymbol: 'MNQ',
    miniSymbol: 'NQ',
    aliases: ['NQ', 'MNQ', 'NQ1!', 'MNQ1!']
  },
  YM: {
    symbol: 'YM',
    tickSize: 1,
    tickValue: 5,
    microSymbol: 'MYM',
    miniSymbol: 'YM',
    aliases: ['YM', 'MYM', 'YM1!', 'MYM1!']
  },
  RTY: {
    symbol: 'RTY',
    tickSize: 0.1,
    tickValue: 5,
    microSymbol: 'M2K',
    miniSymbol: 'RTY',
    aliases: ['RTY', 'M2K', 'RTY1!', 'M2K1!']
  },
  GC: {
    symbol: 'GC',
    tickSize: 0.1,
    tickValue: 10,
    microSymbol: 'MGC',
    miniSymbol: 'GC',
    aliases: ['GC', 'MGC', 'GC1!', 'MGC1!']
  },
  CL: {
    symbol: 'CL',
    tickSize: 0.01,
    tickValue: 10,
    microSymbol: 'MCL',
    miniSymbol: 'CL',
    aliases: ['CL', 'MCL', 'CL1!', 'MCL1!']
  }
};

const orderedAliases: Array<[string, BaseSymbol]> = Object.entries(INSTRUMENTS)
  .flatMap(([base, config]) => config.aliases.map((alias) => [alias.toUpperCase(), base as BaseSymbol]))
  .sort((a, b) => b[0].length - a[0].length);

const CONTRACT_MONTH = /[FGHJKMNQUVXZ]\d{4}$/;

export function normalizeInstrumentSymbol(rawSymbol: string | null | undefined): BaseSymbol | null {
  if (!rawSymbol) return null;
  const candidate = rawSymbol.toUpperCase().trim();
  const stripped = candidate.split(':').pop()?.replace(/\s+/g, '') ?? candidate;

  for (const [alias, base] of orderedAliases) {
    if (stripped === alias) return base;
  }

  const noNumSuffix = stripped.replace(/\d+!?$/, '');
  if (noNumSuffix !== stripped) {
    for (const [alias, base] of orderedAliases) {
      if (noNumSuffix === alias) return base;
    }
  }

  const noContract = stripped.replace(CONTRACT_MONTH, '');
  if (noContract !== stripped) {
    for (const [alias, base] of orderedAliases) {
      if (noContract === alias) return base;
    }
  }

  const cleaned = stripped.replace(CONTRACT_MONTH, '').replace(/\d+!?$/, '').replace(/[^A-Z0-9]/g, '');
  for (const [alias, base] of orderedAliases) {
    if (cleaned === alias.replace(/\d+!?$/, '')) return base;
  }

  return null;
}

export function detectBaseFromText(text: string): { symbol: BaseSymbol | null; rawSymbol: string } {
  const upper = text.toUpperCase().replace(/\s+/g, ' ');
  const afterBoundary = `(?<=^|\\s|\\/|[^A-Z0-9])`;
  const beforeBoundary = `(?=$|\\s|\\/|[^A-Z0-9]|${CONTRACT_MONTH.source})`;

  for (const [alias, base] of orderedAliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${afterBoundary}${escaped}${beforeBoundary}`);
    if (regex.test(upper)) {
      return { symbol: base, rawSymbol: alias };
    }
  }

  return { symbol: null, rawSymbol: '' };
}

export function getContractSymbols(baseSymbol: BaseSymbol): InstrumentSymbol[] {
  const config = INSTRUMENTS[baseSymbol];
  const symbols = [config.symbol, config.microSymbol, config.miniSymbol].filter(Boolean) as InstrumentSymbol[];
  return Array.from(new Set(symbols));
}

export function getContractMultiplier(baseSymbol: BaseSymbol, contractSymbol: InstrumentSymbol): number {
  const config = INSTRUMENTS[baseSymbol];
  if (contractSymbol === config.microSymbol) return 0.1;
  return 1;
}

export const BUFFER_PRESETS_PTS: Record<BaseSymbol, Record<Exclude<BufferMode, 'none'>, number>> = {
  ES: { aggressive: 0.25, realistic: 0.50, conservative: 0.75 },
  NQ: { aggressive: 0.75, realistic: 1.25, conservative: 2.00 },
  YM: { aggressive: 2, realistic: 3, conservative: 5 },
  RTY: { aggressive: 0.20, realistic: 0.30, conservative: 0.50 },
  GC: { aggressive: 0.50, realistic: 1.00, conservative: 1.50 },
  CL: { aggressive: 0.05, realistic: 0.10, conservative: 0.15 },
};

export function getBufferPoints(baseSymbol: BaseSymbol, mode: BufferMode): number {
  if (mode === 'none') return 0;
  return BUFFER_PRESETS_PTS[baseSymbol]?.[mode] ?? 0;
}

export function getBufferTicksFromMode(baseSymbol: BaseSymbol, mode: BufferMode): number {
  if (mode === 'none') return 0;
  const pts = getBufferPoints(baseSymbol, mode);
  const tickSize = INSTRUMENTS[baseSymbol].tickSize;
  return Math.round(pts / tickSize);
}
