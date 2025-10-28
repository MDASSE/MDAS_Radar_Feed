# Getting Started with MDAS Radar Feed

## What Was Created

Your radar simulation system is now ready to use! Here's what was built:

### ✅ Components Created

1. **Radar.tsx** - Main radar display showing vessel positions
2. **ShipInfo.tsx** - Detailed vessel information panel
3. **radar.cpp** - C++ simulation logic (ready for WASM compilation)
4. **App.tsx** - Main application interface

### 🚀 Quick Start

The development server should already be running. Open your browser and navigate to:
**http://localhost:5173**

### 📋 Features

- **Real-time radar display** with 8 simulated vessels
- **Interactive clicking** - Click any vessel to see details
- **Dynamic movement** - Vessels move realistically
- **Risk assessment** - Time to Closest Point of Approach (CPA)
- **Beautiful UI** - Dark theme with cyan accents

### 🖱️ How to Use

1. **View the radar** - See all vessels as green dots with direction arrows
2. **Click a vessel** - Click any green dot to view its information
3. **Watch them move** - Vessels move in real-time with varying speeds
4. **Check risks** - View the risk assessment for potential collisions

### 🔧 Build WASM Module (Optional)

To compile the C++ code to WASM for better performance:

#### Windows:
```bash
npm run build:wasm:win
```

#### Unix/Linux/Mac:
```bash
npm run build:wasm:unix
```

**Note:** Requires Emscripten SDK installed:
- Download: https://emscripten.org/docs/getting_started/downloads.html
- Install and activate with: `source emsdk_env.sh` (Unix) or `emsdk_env.bat` (Windows)

Currently the app uses JavaScript simulation which works perfectly without WASM!

### 📊 Current Implementation

The radar currently shows:
- 8 simulated vessels with unique callsigns
- Real-time position updates
- Speed and heading indicators
- Distance in nautical miles (nm)
- Relative bearing information
- Risk warnings for close approaches

### 🎨 Vessel Types

All vessels are displayed as:
- **Red dot (center)** - Your own ship
- **Green dots** - Other vessels
- **Green arrows** - Direction of travel
- **Green text** - Vessel callsign and distance

### 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

Enjoy your radar simulation! 🌊🚢

