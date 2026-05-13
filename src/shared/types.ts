export const INSTRUMENT_SYMBOLS = ['ES', 'MES', 'NQ', 'MNQ', 'YM', 'MYM', 'RTY', 'M2K', 'GC', 'MGC', 'CL', 'MCL'] as const;

export type InstrumentSymbol = (typeof INSTRUMENT_SYMBOLS)[number];
export type BaseSymbol = 'ES' | 'NQ' | 'YM' | 'RTY' | 'GC' | 'CL';
export type ContractPreference = 'auto' | 'mini' | 'micro';
export type RoundingMode = 'conservative' | 'nearest' | 'aggressive';
export type BufferMode = 'none' | 'aggressive' | 'realistic' | 'conservative';

export type InstrumentConfig = {
  symbol: BaseSymbol;
  tickSize: number;
  tickValue: number;
  microSymbol?: InstrumentSymbol;
  miniSymbol?: InstrumentSymbol;
  aliases: string[];
};

export type Settings = {
  accountRisk: number;
  preferredContractType: ContractPreference;
  roundingMode: RoundingMode;
  bufferMode: BufferMode;
  perInstrumentBufferTicks: Partial<Record<BaseSymbol, number>>;
};

export type DetectedInstrument = {
  rawSymbol: string;
  normalizedSymbol: BaseSymbol | null;
  source: 'url' | 'dom' | 'title' | 'unknown';
};

export type ContractPlan = {
  symbol: InstrumentSymbol;
  contracts: number;
  riskPerContract: number;
  totalRisk: number;
};

export type CalculationResult = {
  baseSymbol: BaseSymbol | null;
  detectedSymbol: string;
  stopTicks: number;
  bufferTicks: number;
  effectiveStopTicks: number;
  tickValue: number;
  riskPerContract: number;
  suggestedContracts: number;
  actualRisk: number;
  primaryPlan: ContractPlan | null;
  alternatePlans: ContractPlan[];
};
