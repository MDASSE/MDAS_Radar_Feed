import type { RadarPacket, RadarLine } from './simradParser';
import { polarToCartesian } from './simradParser';

/**
 * Generate test radar data with a hardcoded ship for testing
 * @param shipAngle - Angle of the ship in degrees (0-360)
 * @param shipRange - Range of the ship in meters
 * @param shipIntensity - Intensity value for the ship (0-255)
 * @returns Test radar packet with a single ship
 */
export function generateTestRadarData(
  shipAngle: number = 45,  // 45 degrees (northeast)
  shipRange: number = 5000,  // 5 km from center
  shipIntensity: number = 200  // Strong signal
): RadarPacket {
  const binsPerLine = 2048;
  const angleCount = 3600;
  const maxRangeMeters = 24000;
  
  const lines: RadarLine[] = [];
  
  // Generate all radar lines
  for (let angleIndex = 0; angleIndex < angleCount; angleIndex++) {
    const angle = (angleIndex / 10) % 360;
    const intensities = new Array(binsPerLine).fill(0);
    
    // Add ship at specified angle and range
    if (Math.abs(angle - shipAngle) < 0.1) {  // Within 0.1 degree
      // Calculate which range bin the ship is in
      const rangeBin = Math.floor((shipRange / maxRangeMeters) * binsPerLine);
      
      if (rangeBin >= 0 && rangeBin < binsPerLine) {
        // Add ship with some spread (3-5 bins wide for visibility)
        const spread = 2;
        for (let i = -spread; i <= spread; i++) {
          const bin = rangeBin + i;
          if (bin >= 0 && bin < binsPerLine) {
            // Create a peak with falloff
            const distance = Math.abs(i);
            const intensity = Math.max(0, shipIntensity - (distance * 30));
            intensities[bin] = intensity;
          }
        }
      }
    }
    
    lines.push({
      angle,
      angleIndex,
      range: maxRangeMeters,
      intensities,
    });
  }
  
  return {
    timestamp: new Date().toISOString(),
    lines,
    length: angleCount * binsPerLine,
    maxRangeMeters,
  };
}
