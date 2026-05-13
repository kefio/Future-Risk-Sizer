import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '../shared/calculator';
import { BUFFER_PRESETS_PTS, getBufferPoints, INSTRUMENTS } from '../shared/instruments';
import { loadSettings, saveSettings } from '../shared/storage';
import type { BaseSymbol, BufferMode, Settings } from '../shared/types';
import { colors } from '../ui/theme';

declare const chrome: any;

const MODES: { key: BufferMode; label: string; shortDesc: string; desc: string }[] = [
  {
    key: 'none',
    label: 'No Buffer',
    shortDesc: 'Zero buffer — no execution cushion.',
    desc: '',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    shortDesc: 'Lower safety buffer for fast and liquid conditions.',
    desc: `Use this mode when:
· market volatility is low
· liquidity is strong
· spreads are tight
· you are entering quickly during normal conditions
· you want larger position sizes

Best suited for:
· calm sessions
· high-confidence setups
· experienced execution

Warning: higher probability of exceeding intended risk during fast moves or slippage.`,
  },
  {
    key: 'realistic',
    label: 'Realistic',
    shortDesc: 'Balanced execution buffer for most trading conditions.',
    desc: `Recommended default mode.

Use this mode when:
· trading normal market conditions
· entering at market on candle close
· using discretionary execution
· trading during standard session volatility

Designed to:
· reduce over-risking
· absorb normal slippage
· keep sizing stable without being overly conservative

Best choice for daily use.`,
  },
  {
    key: 'conservative',
    label: 'Conservative',
    shortDesc: 'Higher safety buffer for volatile or unstable conditions.',
    desc: `Use this mode when:
· volatility is elevated
· trading during news events
· market is moving aggressively
· spreads widen frequently
· execution becomes unstable

Best suited for:
· CPI / FOMC / news releases
· NY open volatility
· Gold momentum spikes
· fast breakout environments

This mode:
· reduces position size
· prioritizes capital protection
· minimizes accidental over-risking

Recommended during uncertain or high-speed market conditions.`,
  },
];

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const persist = async (next: Settings) => {
    setSettings(next);
    await saveSettings(next);
    setSaved('Saved');
    window.setTimeout(() => setSaved(''), 1200);
  };

  const activeMode = MODES.find((m) => m.key === settings.bufferMode)!;

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Futures Risk Sizer Settings</h1>
      <div style={{ color: colors.muted, marginBottom: 20 }}>Global risk, rounding, and per-instrument buffers.</div>

      <Section title="Global">
        <Grid>
          <Field label="Account risk" prefix="$" value={settings.accountRisk} onChange={(value) => persist({ ...settings, accountRisk: Number(value) || 0 })} />
          <Field label="Preferred contract" asSelect value={settings.preferredContractType} onChange={(value) => persist({ ...settings, preferredContractType: value as Settings['preferredContractType'] })} options={['auto', 'mini', 'micro']} />
          <Field label="Rounding mode" asSelect value={settings.roundingMode} onChange={(value) => persist({ ...settings, roundingMode: value as Settings['roundingMode'] })} options={['conservative', 'nearest', 'aggressive']} />
        </Grid>
      </Section>

      <Section title="Buffer Mode">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {MODES.map((mode) => {
            const active = settings.bufferMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => persist({ ...settings, bufferMode: mode.key })}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  borderRadius: 12,
                  border: `2px solid ${active ? colors.accent2 : colors.border}`,
                  background: active ? 'rgba(56, 189, 248, 0.1)' : colors.panel2,
                  color: active ? colors.accent2 : colors.text,
                  cursor: 'pointer',
                  textAlign: 'center' as const,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <div style={{ background: colors.panel2, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{activeMode.label}: {activeMode.shortDesc}</div>
          {activeMode.desc && (
            <div style={{ color: colors.muted, fontSize: 12, whiteSpace: 'pre-line', lineHeight: 1.7 }}>{activeMode.desc}</div>
          )}
        </div>

        {settings.bufferMode !== 'none' && (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Computed buffer per instrument</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: colors.muted, textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Symbol</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Points</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ticks</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(INSTRUMENTS) as BaseSymbol[]).map((symbol) => {
                  const pts = getBufferPoints(symbol, settings.bufferMode);
                  const ts = INSTRUMENTS[symbol].tickSize;
                  return (
                    <tr key={symbol} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{symbol}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{pts.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Math.round(pts / ts)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div style={{ marginTop: 16, color: colors.accent2, minHeight: 20 }}>{saved}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 14 }}>{title}</div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>{children}</div>;
}

function Field(props: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  asSelect?: boolean;
  options?: string[];
}) {
  const { label, value, onChange, prefix, suffix, asSelect, options = [] } = props;

  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ color: colors.muted, fontSize: 13 }}>{label}</span>
      {asSelect ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <div style={fieldShell}>
          {prefix ? <span style={addonStyle}>{prefix}</span> : null}
          <input value={value} onChange={(e) => onChange(e.target.value)} style={fieldInputStyle} />
          {suffix ? <span style={addonStyle}>{suffix}</span> : null}
        </div>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  ...fieldBaseStyle,
  width: '100%'
};

const fieldShell: React.CSSProperties = {
  ...fieldBaseStyle,
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px'
};

const fieldInputStyle: React.CSSProperties = {
  border: 0,
  outline: 'none',
  background: 'transparent',
  color: colors.text,
  padding: '10px 6px',
  width: '100%'
};

const addonStyle: React.CSSProperties = { color: colors.muted, fontSize: 13 };
const fieldBaseStyle: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  background: colors.panel2,
  color: colors.text,
  padding: '10px 12px',
  boxSizing: 'border-box'
};

createRoot(document.getElementById('root')!).render(<App />);
