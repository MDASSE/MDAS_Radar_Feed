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
let clearVessels: (() => void) | null = null;
let addVessel: ((x: number, y: number, speed: number, heading: number, course: number, id: number, callsign: string) => void) | null = null;
// setVesselsFromData is available but not currently used
// let setVesselsFromData: ((dataPtr: number, callsignsPtr: number, count: number) => void) | null = null;

export interface Vessel {
  x: number;
  y: number;
  speed: number;
  heading: number;
  id: number;
  callsign: string;
}

// Server vessel data format (as would come from SQL/database)
export interface ServerVesselData {
  id: number;
  callsign?: string;
  mmsi?: string;
  // Position can be in meters (x, y) or lat/lon
  x?: number;  // X position in meters
  y?: number;  // Y position in meters
  latitude?: number;  // Latitude in degrees (will be converted to meters relative to own ship)
  longitude?: number;  // Longitude in degrees (will be converted to meters relative to own ship)
  // Speed and heading
  speed?: number;  // Speed in knots (will be converted to m/s)
  speed_mps?: number;  // Speed in m/s (if provided directly)
  heading?: number;  // Heading in degrees (will be converted to radians)
  heading_rad?: number;  // Heading in radians (if provided directly)
  course?: number;  // Course in degrees (will be converted to radians)
  course_rad?: number;  // Course in radians (if provided directly)
  // Timestamp
  timestamp?: string | number;
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
        clearVessels = radarModule.cwrap('clearVessels', '', []) as () => void;
        
        // addVessel needs special handling for string parameter - use ccall for strings
        addVessel = (x: number, y: number, speed: number, heading: number, course: number, id: number, callsign: string) => {
          const callsignStr = callsign || '';
          radarModule!.ccall('addVessel', 'void', ['number', 'number', 'number', 'number', 'number', 'number', 'string'], [x, y, speed, heading, course, id, callsignStr]);
        };
        
        // setVesselsFromData is available but not currently used
        // setVesselsFromData = radarModule.cwrap('setVesselsFromData', '', ['number', 'number', 'number']) as (dataPtr: number, callsignsPtr: number, count: number) => void;

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

/**
 * Clear all vessels
 */
export function clearVesselsModule(): void {
  if (!clearVessels) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }
  clearVessels();
}

/**
 * Add a single vessel
 */
export function addVesselModule(x: number, y: number, speed: number, heading: number, course: number, id: number, callsign: string): void {
  if (!addVessel) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }
  addVessel(x, y, speed, heading, course, id, callsign);
}

/**
 * Convert server vessel data to radar format and load into WASM
 * Handles various input formats (lat/lon, degrees, knots, etc.)
 */
export function loadVesselsFromServer(vesselsData: ServerVesselData[], ownShipLat?: number, ownShipLon?: number): void {
  if (!clearVessels || !addVessel || !radarModule) {
    throw new Error('Radar module not loaded. Call loadRadarModule() first.');
  }

  clearVessels();

  // Convert lat/lon to meters if needed (approximate conversion)
  // 1 degree latitude ≈ 111,320 meters
  // 1 degree longitude ≈ 111,320 * cos(latitude) meters
  const latToMeters = (lat: number) => lat * 111320;
  const lonToMeters = (lon: number, refLat: number = 0) => lon * 111320 * Math.cos(refLat * Math.PI / 180);

  for (const vessel of vesselsData) {
    let x: number;
    let y: number;

    // Handle position input (prefer x/y in meters, fallback to lat/lon)
    if (vessel.x !== undefined && vessel.y !== undefined) {
      x = vessel.x;
      y = vessel.y;
    } else if (vessel.latitude !== undefined && vessel.longitude !== undefined) {
      if (ownShipLat !== undefined && ownShipLon !== undefined) {
        // Convert relative to own ship position
        const latDiff = vessel.latitude - ownShipLat;
        const lonDiff = vessel.longitude - ownShipLon;
        x = lonToMeters(lonDiff, ownShipLat);
        y = latToMeters(latDiff);
      } else {
        // Convert to meters from origin (0,0)
        x = lonToMeters(vessel.longitude, vessel.latitude);
        y = latToMeters(vessel.latitude);
      }
    } else {
      console.warn(`Vessel ${vessel.id} missing position data, skipping`);
      continue;
    }

    // Handle speed (prefer m/s, convert from knots if needed)
    // 1 knot = 0.514444 m/s
    const speed = vessel.speed_mps !== undefined 
      ? vessel.speed_mps 
      : (vessel.speed !== undefined ? vessel.speed * 0.514444 : 0);

    // Handle heading (prefer radians, convert from degrees if needed)
    const heading = vessel.heading_rad !== undefined
      ? vessel.heading_rad
      : (vessel.heading !== undefined ? (vessel.heading * Math.PI) / 180 : 0);    // Handle course (prefer radians, convert from degrees if needed)
    const course = vessel.course_rad !== undefined
      ? vessel.course_rad
      : (vessel.course !== undefined ? (vessel.course * Math.PI) / 180 : heading);

    // Get callsign (prefer callsign, fallback to MMSI, then ID)
    const callsign = vessel.callsign || vessel.mmsi || `VESSEL-${vessel.id}`;

    addVessel(x, y, speed, heading, course, vessel.id, callsign);
  }
}

/**
 * Fetch vessels from server API endpoint
 */
export async function fetchVesselsFromServer(apiUrl: string, _ownShipLat?: number, _ownShipLon?: number): Promise<ServerVesselData[]> {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch vessels: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Handle both array and object responses
    const vesselsArray = Array.isArray(data) ? data : (data.vessels || data.data || []);
    
    return vesselsArray.map((v: any) => ({
      id: v.id || v.mmsi || Math.random() * 1000000,
      callsign: v.callsign || v.callsign_name,
      mmsi: v.mmsi,
      x: v.x || v.x_meters,
      y: v.y || v.y_meters,
      latitude: v.latitude || v.lat,
      longitude: v.longitude || v.long || v.lon,
      speed: v.speed || v.speed_knots,
      speed_mps: v.speed_mps || v.speed_meters_per_second,
      heading: v.heading || v.heading_degrees,
      heading_rad: v.heading_rad || v.heading_radians,
      course: v.course || v.course_degrees,
      course_rad: v.course_rad || v.course_radians,
      timestamp: v.timestamp || v.time || v.last_update
    }));
  } catch (error) {
    console.error('Error fetching vessels from server:', error);
    throw error;
  }
}