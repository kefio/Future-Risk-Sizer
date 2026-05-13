import { getBufferTicksFromMode, INSTRUMENTS, getContractMultiplier, getContractSymbols } from './instruments';
import type { BaseSymbol, CalculationResult, ContractPlan, ContractPreference, InstrumentSymbol, RoundingMode, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  accountRisk: 200,
  preferredContractType: 'auto',
  roundingMode: 'conservative',
  bufferMode: 'realistic',
  perInstrumentBufferTicks: {}
};

export function getBufferTicks(symbol: BaseSymbol, settings: Settings): number {
  if (settings.perInstrumentBufferTicks[symbol] != null) return settings.perInstrumentBufferTicks[symbol];
  return getBufferTicksFromMode(symbol, settings.bufferMode);
}

function roundContracts(value: number, mode: RoundingMode): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (mode === 'nearest') return Math.max(0, Math.round(value));
  if (mode === 'aggressive') return Math.max(0, Math.ceil(value));
  return Math.max(0, Math.floor(value));
}

function contractLabel(symbol: string, contracts: number): string {
  return `${contracts} ${symbol}`;
}

function buildPlan(baseSymbol: BaseSymbol, contractSymbol: InstrumentSymbol, stopTicks: number, bufferTicks: number, accountRisk: number, roundingMode: RoundingMode): ContractPlan {
  const tickValue = INSTRUMENTS[baseSymbol].tickValue * getContractMultiplier(baseSymbol, contractSymbol);
  const riskPerContract = (stopTicks + bufferTicks) * tickValue;
  const contracts = roundContracts(accountRisk / riskPerContract, roundingMode);

  return {
    symbol: contractSymbol,
    contracts,
    riskPerContract,
    totalRisk: contracts * riskPerContract
  };
}

function choosePrimarySymbol(baseSymbol: BaseSymbol, preferred: ContractPreference): string {
  const config = INSTRUMENTS[baseSymbol];
  if (preferred === 'micro') return config.microSymbol ?? config.symbol;
  if (preferred === 'mini') return config.miniSymbol ?? config.symbol;
  return config.symbol;
}

export function calculatePosition(baseSymbol: BaseSymbol | null, stopTicks: number, settings: Settings, detectedSymbol = ''): CalculationResult {
  if (!baseSymbol || !Number.isFinite(stopTicks) || stopTicks <= 0) {
    return {
      baseSymbol,
      detectedSymbol,
      stopTicks: Number.isFinite(stopTicks) ? stopTicks : 0,
      bufferTicks: baseSymbol ? getBufferTicks(baseSymbol, settings) : 0,
      effectiveStopTicks: 0,
      tickValue: 0,
      riskPerContract: 0,
      suggestedContracts: 0,
      actualRisk: 0,
      primaryPlan: null,
      alternatePlans: []
    };
  }

  const bufferTicks = getBufferTicks(baseSymbol, settings);
  const effectiveStopTicks = stopTicks + bufferTicks;
  const primarySymbol = choosePrimarySymbol(baseSymbol, settings.preferredContractType);
  const primaryPlan = buildPlan(baseSymbol, primarySymbol, stopTicks, bufferTicks, settings.accountRisk, settings.roundingMode);
  const alternatePlans = getContractSymbols(baseSymbol)
    .filter((symbol) => symbol !== primarySymbol)
    .map((symbol) => buildPlan(baseSymbol, symbol, stopTicks, bufferTicks, settings.accountRisk, settings.roundingMode));

  return {
    baseSymbol,
    detectedSymbol,
    stopTicks,
    bufferTicks,
    effectiveStopTicks,
    tickValue: INSTRUMENTS[baseSymbol].tickValue,
    riskPerContract: primaryPlan.riskPerContract,
    suggestedContracts: primaryPlan.contracts,
    actualRisk: primaryPlan.totalRisk,
    primaryPlan,
    alternatePlans: alternatePlans.sort((a, b) => a.symbol.localeCompare(b.symbol))
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatContracts(plan: ContractPlan | null): string {
  if (!plan) return 'No position';
  return plan.contracts > 0 ? contractLabel(plan.symbol, plan.contracts) : `0 ${plan.symbol}`;
}
