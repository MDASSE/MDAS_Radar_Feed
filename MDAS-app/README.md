# MDAS Radar Feed

Maritime Domain Awareness System - Vessel Tracking Radar

A real-time radar simulation displaying multiple vessels with their positions, speeds, headings, and movements.

## Features

- **Real-time Radar Display**: Interactive radar screen showing vessel positions
- **Vessel Tracking**: Track multiple vessels simultaneously with unique callsigns
- **Interactive**: Click on any vessel to view detailed information
- **Dynamic Movement**: Vessels move realistically with varying speeds and headings
- **Risk Assessment**: Automatic calculation of time to closest point of approach (CPA)
- **Modern UI**: Beautiful dark theme with cyan accents

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build WASM module (optional, currently using JavaScript simulation)
npm run build:wasm

# Start development server
npm run dev
```

### Running with Emscripten (Optional)

To build the C++ WASM module:

```bash
# Windows
npm run build:wasm:win

# Unix/Linux/Mac
npm run build:wasm:unix
```

Note: Requires Emscripten SDK installed ([Download](https://emscripten.org/docs/getting_started/downloads.html))

## Project Structure

```
MDAS-app/
├── src/
│   ├── components/
│   │   ├── Radar.tsx       # Main radar display component
│   │   └── ShipInfo.tsx    # Vessel information panel
│   ├── wasm/
│   │   ├── radar.cpp       # C++ radar simulation logic
│   │   └── library.js      # Emscripten bindings
│   └── App.tsx             # Main application
├── public/
│   └── radar.wasm          # Compiled WASM module (optional)
└── scripts/
    └── build-wasm.js       # WASM build script
```

## How It Works

The radar display shows:
- **Red dot** (center): Your own ship
- **Green dots**: Other vessels in the area
- **Range rings**: Distance markers every ~2 nautical miles
- **Vessel trails**: Movement direction indicators

Click on any vessel to see:
- Callsign and ID
- Current position (distance, bearing, coordinates)
- Speed and heading
- Risk assessment (time to CPA)

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **WASM** - High-performance simulation (optional)
- **Emscripten** - C++ to WASM compilation

## License

MIT
