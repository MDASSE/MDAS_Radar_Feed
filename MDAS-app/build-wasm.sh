#!/bin/bash
# Build script for compiling C++ code to WASM with Emscripten

echo "Building WASM module with Emscripten..."

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "ERROR: emcc (Emscripten compiler) not found in PATH"
    echo ""
    echo "Please install Emscripten from: https://emscripten.org/docs/getting_started/downloads.html"
    echo "Then activate it with: source emsdk_env.sh"
    exit 1
fi

echo "Compiling radar.cpp..."
emcc src/wasm/radar.cpp \
    -O3 \
    -s WASM=1 \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s EXPORTED_FUNCTIONS='["_initRadar","_updateRadar","_getVesselCount","_getVesselData","_getVesselCallsign","_getRadarRange","_setOwnShip"]' \
    -s TOTAL_MEMORY=16777216 \
    -o public/radar.js \
    --js-library src/wasm/library.js

if [ $? -ne 0 ]; then
    echo ""
    echo "Build failed!"
    exit 1
fi

echo ""
echo "Build successful!"
echo "Output: public/radar.js and public/radar.wasm"

