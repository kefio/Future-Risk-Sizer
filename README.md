# Futures Risk Sizer

A Chrome extension for TradingView that calculates the correct number of futures contracts based on your stop distance and account risk.

## Features

- **Auto-detects** the current instrument from the TradingView page title or URL
- **Calculates** contract quantity using stop distance, tick value, and account risk
- **Buffer modes** — choose from four presets that adjust execution cushion
  - **None** — no buffer, pure stop distance
  - **Aggressive** — minimal buffer for fast, liquid conditions
  - **Realistic** — balanced default for most trading sessions
  - **Conservative** — higher buffer for volatile or news-driven markets
- **Micro / Mini alternatives** — shows alternative contract sizes
- **Customizable** — account risk, preferred contract type, rounding mode
- **Fast** — calculations run locally, no network requests

## Supported Instruments

| Symbol | Market | Tick Size | Tick Value | Micro |
|-------|--------|-----------|------------|-------|
| ES | S&P 500 E-mini | 0.25 | $12.50 | MES |
| NQ | Nasdaq E-mini | 0.25 | $5.00 | MNQ |
| YM | Dow Jones Mini | 1.00 | $5.00 | MYM |
| RTY | Russell Mini | 0.10 | $5.00 | M2K |
| GC | Gold Futures | 0.10 | $10.00 | MGC |
| CL | Crude Oil | 0.01 | $10.00 | MCL |

All contract-date variants are supported (e.g. `ESM2026`, `NQU2025`, `MESM2026`).

## Installation

### Chrome Web Store

*(coming soon)*

### Manual (load unpacked)

1. Download the [latest release ZIP](https://github.com/yourusername/futures-risk-sizer/releases)
2. Unzip to a folder
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the unzipped folder

## Usage

1. Open any futures chart on TradingView
2. Click the extension icon in the toolbar
3. The instrument is auto-detected
4. Enter your **stop distance in points**
5. Choose your **buffer mode** (None / Aggressive / Realistic / Conservative)
6. Read the suggested contract quantity, effective stop, and risk values

### Settings

Open the Settings page from the popup to configure:

- **Account risk** — your maximum intended dollar risk per trade
- **Buffer mode** — choose preset with full descriptions
- **Preferred contract** — auto, mini only, or micro only
- **Rounding mode** — conservative (floor), nearest, or aggressive (ceil)

## Development

```bash
npm install
npm run build
```

The compiled extension is output to `dist/`.

### Structure

```
├── build.mjs              # Build script (esbuild + icon generation)
├── manifest.json           # Chrome extension manifest
├── popup.html / options.html
├── src/
│   ├── background/         # Service worker
│   ├── content/            # TradingView content script
│   ├── popup/              # Popup UI (React)
│   ├── options/            # Settings page (React)
│   └── shared/             # Shared logic
│       ├── calculator.ts   # Position sizing engine
│       ├── instruments.ts  # Instrument definitions and detection
│       ├── storage.ts      # chrome.storage.local helpers
│       ├── types.ts        # Shared types
│       └── url.ts          # TradingView URL parsing
└── dist/                   # Build output
```

## License

MIT
