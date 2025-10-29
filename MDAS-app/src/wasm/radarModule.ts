// WASM Module loader and wrapper for radar.cpp

// Emscripten Module type definition
interface EmscriptenModule {
  ccall: (ident: string, returnType: string, argTypes: string[], args: any[]) => any;
  cwrap: (ident: string, returnType: string, argTypes: string[]) => (...args: any[]) => any;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPF32: Float32Array;
  UTF8ToString: (ptr: number) => string;
  onRuntimeInitialized?: () => void;
}

declare global {
  interface Window {
    Module: EmscriptenModule;
  }
}

let radarModule: EmscriptenModule | null = null;
let isLoaded = false;
let loadPromise: Promise<EmscriptenModule> | null = null;

// Wrapped functions
let initRadar: (() => void) | null = null;
let updateRadar: (() => void) | null = null;
let getVesselCount: (() => number) | null = null;
let getVesselData: ((dataPtr: number, maxCount: number) => void) | null = null;
let getVesselCallsign: ((index: number) => string) | null = null;
let getRadarRange: (() => number) | null = null;
let setOwnShip: ((x: number, y: number, heading: number) => void) | null = null;

export interface Vessel {
  x: number;
  y: number;
  speed: number;
  heading: number;
  id: number;
  callsign: string;
}

/**
 * Load the WASM module
 */
export async function loadRadarModule(): Promise<EmscriptenModule> {
  if (isLoaded && radarModule) {
    return radarModule;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Create the module configuration
    window.Module = {
      onRuntimeInitialized: () => {
        radarModule = window.Module;
        isLoaded = true;

        // Wrap all the C functions
        initRadar = radarModule.cwrap('initRadar', '', []) as () => void;
        updateRadar = radarModule.cwrap('updateRadar', '', []) as () => void;
        getVesselCount = radarModule.cwrap('getVesselCount', 'number', []) as () => number;
        getVesselData = radarModule.cwrap('getVesselData', '', ['number', 'number']) as (dataPtr: number, maxCount: number) => void;
        getRadarRange = radarModule.cwrap('getRadarRange', 'number', []) as () => number;
        setOwnShip = radarModule.cwrap('setOwnShip', '', ['number', 'number', 'number']) as (x: number, y: number, heading: number) => void;

        // getVesselCallsign returns a string pointer, needs special handling
        const getVesselCallsignPtr = radarModule.cwrap('getVesselCallsign', 'number', ['number']) as (index: number) => number;
        getVesselCallsign = (index: number) => {
          const ptr = getVesselCallsignPtr(index);
          return radarModule!.UTF8ToString(ptr);
        };

        resolve(radarModule);
      }
    } as EmscriptenModule;

    // Load the Emscripten-generated JS file
    const script = document.createElement('script');
    script.src = '/radar.js';
    script.onerror = () => {
      reject(new Error('Failed to load radar.js. Make sure to build the WASM module first. Run: npm run build:wasm'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Initialize the radar with vessels
 */
export function initRadarModule(): void {
  if (!initRadar) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }
  initRadar();
}

/**
 * Update vessel positions
 */
export function updateRadarModule(): void {
  if (!updateRadar) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }
  updateRadar();
}

/**
 * Get all vessels from the WASM module
 */
export function getVessels(): Vessel[] {
  if (!getVesselCount || !getVesselData || !getVesselCallsign || !radarModule) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }

  const count = getVesselCount();
  if (count === 0) {
    return [];
  }

  // Allocate memory for vessel data (x, y, speed, heading, id = 5 floats per vessel)
  const dataSize = count * 5;
  const dataPtr = radarModule._malloc(dataSize * Float32Array.BYTES_PER_ELEMENT);

  try {
    // Get vessel data from WASM
    getVesselData(dataPtr, count);

    // Read the Float32Array from the heap
    const heapView: Float32Array = (radarModule as any).HEAPF32 ?? (globalThis as any).HEAPF32;
    if (!heapView) {
      throw new Error('WASM heap view is unavailable. Ensure radar.js is built without MODULARIZE and loaded before use.');
    }
    const heapData = new Float32Array(heapView.buffer, dataPtr, dataSize);

    // Convert to Vessel objects
    const vessels: Vessel[] = [];
    for (let i = 0; i < count; i++) {
      const offset = i * 5;
      vessels.push({
        x: heapData[offset],
        y: heapData[offset + 1],
        speed: heapData[offset + 2],
        heading: heapData[offset + 3],
        id: Math.round(heapData[offset + 4]),
        callsign: getVesselCallsign(i)
      });
    }

    return vessels;
  } finally {
    // Free the allocated memory
    radarModule._free(dataPtr);
  }
}

/**
 * Get radar range
 */
export function getRadarRangeModule(): number {
  if (!getRadarRange) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }
  return getRadarRange();
}

/**
 * Set own ship position
 */
export function setOwnShipModule(x: number, y: number, heading: number): void {
  if (!setOwnShip) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }
  setOwnShip(x, y, heading);
}

