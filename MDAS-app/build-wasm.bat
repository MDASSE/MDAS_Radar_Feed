@echo off
echo Building WASM module with Emscripten...
echo.

echo Compiling radar.cpp...

REM Resolve emcc path relative to this project (emsdk sibling directory)
set EMCC_PATH=..\emsdk\upstream\emscripten\emcc.bat

if not exist %EMCC_PATH% (
    echo ERROR: Could not find emcc at %EMCC_PATH%
    echo Ensure emsdk is cloned next to MDAS-app and installed/activated.
    pause
    exit /b 1
)

"%EMCC_PATH%" src/wasm/radar.cpp ^
    -O3 ^
    -s WASM=1 ^
    -s EXPORTED_RUNTIME_METHODS=[ccall,cwrap,UTF8ToString] ^
    -s EXPORTED_FUNCTIONS=[_initRadar,_updateRadar,_getVesselCount,_getVesselData,_getVesselCallsign,_getRadarRange,_setOwnShip,_malloc,_free] ^
    -s INITIAL_MEMORY=16777216 ^
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

