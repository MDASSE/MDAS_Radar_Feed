@echo off
echo Building WASM module with Emscripten...

REM Check if emcc is available
where emcc >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: emcc (Emscripten compiler) not found in PATH
    echo.
    echo Please install Emscripten from: https://emscripten.org/docs/getting_started/downloads.html
    echo Then activate it with: emsdk_env.bat
    pause
    exit /b 1
)

echo Compiling radar.cpp...
emcc src/wasm/radar.cpp ^
    -O3 ^
    -s WASM=1 ^
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' ^
    -s EXPORTED_FUNCTIONS='["_initRadar","_updateRadar","_getVesselCount","_getVesselData","_getVesselCallsign","_getRadarRange","_setOwnShip"]' ^
    -s TOTAL_MEMORY=16777216 ^
    -o public/radar.js ^
    --js-library src/wasm/library.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build successful!
echo Output: public/radar.js and public/radar.wasm
pause

