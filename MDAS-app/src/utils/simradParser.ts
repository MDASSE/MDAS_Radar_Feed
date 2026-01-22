/**
 * Parse radar frame data from server
 * Format: JSON header + binary payload
 */

export interface RadarFrameHeader {
  type: string;
  timestamp_ms: number;  // Unix timestamp in milliseconds
  bins_per_line: number;  // Number of range bins per angle (2048)
  angle_count: number;  // Number of angles (3600 for 0.1 degree resolution)
  max_range_meters: number;  // Maximum range in meters (24000)
}

export interface RadarLine {
  angle: number;        // Angle in degrees
  angleIndex: number;  // Angle index (0-3599 for 0.1 degree resolution)
  range: number;       // Maximum range in meters
  intensities: number[]; // Array of intensity values (binsPerLine length)
}

export interface RadarPacket {
  timestamp: string;
  lines: RadarLine[];
  length: number;
  maxRangeMeters: number;
}

/**
 * Parse radar frame from JSON header and binary payload
 * @param header - JSON header with metadata
 * @param binaryData - Binary payload as Uint8Array or ArrayBuffer
 * @returns Parsed radar packet with lines
 */
export function parseRadarFrame(
  header: RadarFrameHeader,
  binaryData: ArrayBuffer | Uint8Array
): RadarPacket {
  const uint8Array = binaryData instanceof ArrayBuffer 
    ? new Uint8Array(binaryData) 
    : binaryData;
  
  const { bins_per_line, angle_count, max_range_meters, timestamp_ms } = header;
  const lines: RadarLine[] = [];

  // Verify data length
  const expectedLength = angle_count * bins_per_line;
  if (uint8Array.length !== expectedLength) {
    throw new Error(
      `Invalid binary data length: expected ${expectedLength}, got ${uint8Array.length}`
    );
  }

  // Parse each angle line
  for (let angleIndex = 0; angleIndex < angle_count; angleIndex++) {
    // Calculate angle in degrees (0.1 degree resolution)
    const angle = (angleIndex / 10) % 360;
    
    // Extract intensity data for this angle
    const startIndex = angleIndex * bins_per_line;
    const endIndex = startIndex + bins_per_line;
    const intensities = Array.from(uint8Array.slice(startIndex, endIndex));

    lines.push({
      angle,
      angleIndex,
      range: max_range_meters,
      intensities,
    });
  }

  // Convert timestamp from milliseconds to ISO string
  const timestampISO = new Date(timestamp_ms).toISOString();

  return {
    timestamp: timestampISO,
    lines,
    length: uint8Array.length,
    maxRangeMeters: max_range_meters,
  };
}

/**
 * Convert polar coordinates (angle, range) to Cartesian (x, y)
 * @param angle - Angle in degrees
 * @param range - Range value
 * @returns Object with x and y coordinates
 */
export function polarToCartesian(angle: number, range: number): { x: number; y: number } {
  const angleRad = (angle * Math.PI) / 180;
  const x = range * Math.cos(angleRad);
  const y = range * Math.sin(angleRad);
  return { x, y };
}

/**
 * Detect targets from intensity data using threshold
 * @param line - Radar line with intensity data
 * @param threshold - Intensity threshold (0-255)
 * @returns Array of detected targets with their range and angle
 */
export function detectTargets(
  line: RadarLine,
  threshold: number = 100
): Array<{ angle: number; range: number; intensity: number }> {
  const targets: Array<{ angle: number; range: number; intensity: number }> = [];
  
  // Process intensity data to find peaks above threshold
  for (let rangeBin = 0; rangeBin < line.intensities.length; rangeBin++) {
    const intensity = line.intensities[rangeBin];
    if (intensity > threshold) {
      // Calculate range in meters based on bin index
      // Range is linearly distributed from 0 to maxRangeMeters
      const range = (rangeBin / line.intensities.length) * line.range;
      targets.push({
        angle: line.angle,
        range,
        intensity,
      });
    }
  }
  
  return targets;
}
