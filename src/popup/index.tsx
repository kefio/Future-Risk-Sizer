import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { calculatePosition, formatContracts, formatMoney, getBufferTicks } from '../shared/calculator';
import { getBufferPoints, INSTRUMENTS } from '../shared/instruments';
import { saveSettings } from '../shared/storage';
import type { BaseSymbol, BufferMode, CalculationResult, Settings } from '../shared/types';
import { colors } from '../ui/theme';

declare const chrome: any;

const MODES: { key: BufferMode; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'aggressive', label: 'Aggr.' },
  { key: 'realistic', label: 'Real.' },
  { key: 'conservative', label: 'Cons.' },
];

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [baseSymbol, setBaseSymbol] = useState<BaseSymbol | null>(null);
  const [stopPoints, setStopPoints] = useState('');
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [status, setStatus] = useState('Loading TradingView state...');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_APP_STATE' }, (state: any) => {
      if (!state) {
        setStatus('No extension state available');
        return;
      }
      setSettings(state.settings);
      setBaseSymbol(state.latestInstrument?.normalizedSymbol ?? state.activeInstrument ?? null);
      setStatus(state.latestInstrument?.normalizedSymbol ? 'Instrument detected' : 'Open TradingView to detect a symbol');
      setCalculation(calculatePosition(state.latestInstrument?.normalizedSymbol ?? state.activeInstrument ?? null, 0, state.settings, state.latestInstrument?.rawSymbol ?? ''));
    });
  }, []);

  const instrument = baseSymbol ? INSTRUMENTS[baseSymbol] : null;
  const tickSize = instrument?.tickSize ?? 1;
  const bufferMode = settings?.bufferMode ?? 'realistic';
  const bufferTicks = baseSymbol && settings ? getBufferTicks(baseSymbol, settings) : 0;
  const bufferPoints = bufferTicks * tickSize;

  useEffect(() => {
    if (!settings || !baseSymbol) return;
    const parsedTicks = Number(stopPoints) / tickSize;
    setCalculation(calculatePosition(baseSymbol, parsedTicks, settings, baseSymbol));
  }, [baseSymbol, settings, stopPoints, bufferTicks, tickSize]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <div style={{ padding: 14, background: colors.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Futures Risk Sizer</div>
          <div style={{ color: colors.muted, fontSize: 12 }}>{status}</div>
        </div>
        <a href="options.html" target="_blank" rel="noreferrer" style={{ color: colors.accent, fontSize: 12 }}>Settings</a>
      </div>

      <Card>
        <Row label="Instrument" value={baseSymbol ?? 'Unknown'} accent />
        <Row label="Tick Value" value={instrument ? `$${instrument.tickValue}` : '-'} />
        <Row label="Account Risk" value={settings ? formatMoney(settings.accountRisk) : '-'} />
      </Card>

      <Card>
        <Label>Stop Distance (points)</Label>
        <Input value={stopPoints} onChange={(e) => setStopPoints(e.target.value)} placeholder="8" />
        <div style={{ marginTop: 10 }}>
          <Label>Buffer</Label>
          <div style={{ display: 'flex', gap: 4 }}>
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => updateSetting('bufferMode', m.key)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: 8,
                  border: `1px solid ${bufferMode === m.key ? colors.accent2 : colors.border}`,
                  background: bufferMode === m.key ? 'rgba(56, 189, 248, 0.12)' : colors.panel2,
                  color: bufferMode === m.key ? colors.accent2 : colors.muted,
                  fontSize: 11,
                  fontWeight: bufferMode === m.key ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
            +{bufferPoints.toFixed(2)} pts ({bufferTicks} ticks)
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <Field label="Risk" value={settings?.accountRisk ?? 0} onChange={(v) => updateSetting('accountRisk', Number(v) || 0)} prefix="$" />
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Suggested Contracts</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{calculation ? formatContracts(calculation.primaryPlan) : '-'}</div>
        <div style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>
          Effective stop: {calculation ? `${(calculation.effectiveStopTicks * tickSize).toFixed(2)} pts (${calculation.effectiveStopTicks} ticks)` : '-'}
        </div>
        <div style={{ color: colors.muted, fontSize: 12 }}>
          Risk/contract: {calculation?.primaryPlan ? formatMoney(calculation.primaryPlan.riskPerContract) : '-'}
        </div>
        <div style={{ color: colors.muted, fontSize: 12 }}>
          Total risk: {calculation ? formatMoney(calculation.actualRisk) : '-'}
        </div>
        {calculation?.alternatePlans?.length ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {calculation.alternatePlans.map((plan) => (
              <span key={plan.symbol} style={chip}>{formatContracts(plan)}</span>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 12, marginBottom: 12 }}>{children}</div>;
}

function Row({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: colors.muted }}>{label}</span>
      <span style={{ color: accent ? colors.accent2 : colors.text, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>{children}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ width: '100%', boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.panel2, color: colors.text, padding: '10px 12px', outline: 'none' }} />;
}

function Field({ label, value, onChange, prefix = '' }: { label: string; value: number; onChange: (value: string) => void; prefix?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.panel2, padding: '0 10px' }}>
        {prefix ? <span style={{ color: colors.muted, fontSize: 13 }}>{prefix}</span> : null}
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', border: 0, outline: 'none', background: 'transparent', color: colors.text, padding: '10px 6px' }} />
      </div>
    </div>
  );
}

const chip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  background: 'rgba(124, 156, 255, 0.14)',
  color: colors.text,
  fontSize: 12,
  border: `1px solid ${colors.border}`
};

createRoot(document.getElementById('root')!).render(<App />);
