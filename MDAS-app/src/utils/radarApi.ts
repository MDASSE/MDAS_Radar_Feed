import type { RadarPacket, RadarFrameHeader } from './simradParser';
import { parseRadarFrame } from './simradParser';

/**
 * Fetch radar frame data from server API
 * Expected format: JSON header followed by binary payload
 * @param apiUrl - API endpoint URL
 * @returns Parsed radar packet
 */
export async function fetchRadarPacket(apiUrl: string): Promise<RadarPacket> {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch radar data: ${response.statusText}`);
    }

    // Get response as ArrayBuffer to handle binary data
    const arrayBuffer = await response.arrayBuffer();
    
    // Find JSON header boundary
    // JSON ends with '}' and binary data starts immediately after
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Find the end of JSON (last '}')
    let jsonEndIndex = -1;
    for (let i = 0; i < Math.min(1000, uint8Array.length); i++) {
      if (uint8Array[i] === 0x7D) { // '}' character
        jsonEndIndex = i;
      }
    }
    
    if (jsonEndIndex === -1) {
      throw new Error('Invalid response format: JSON header not found');
    }

    // Parse JSON header
    const jsonBytes = uint8Array.slice(0, jsonEndIndex + 1);
    const jsonText = textDecoder.decode(jsonBytes);
    const header: RadarFrameHeader = JSON.parse(jsonText);

    // Verify header format
    if (header.type !== 'radar_frame') {
      throw new Error(`Invalid frame type: expected 'radar_frame', got '${header.type}'`);
    }

    // Verify expected binary data length
    const expectedBinaryLength = header.angle_count * header.bins_per_line;
    const binaryStart = jsonEndIndex + 1;
    const actualBinaryLength = arrayBuffer.byteLength - binaryStart;
    
    if (actualBinaryLength !== expectedBinaryLength) {
      throw new Error(
        `Binary data length mismatch: expected ${expectedBinaryLength}, got ${actualBinaryLength}`
      );
    }

    // Extract binary payload
    const binaryPayload = arrayBuffer.slice(binaryStart);

    // Parse the radar frame
    return parseRadarFrame(header, binaryPayload);
  } catch (error) {
    console.error('Error fetching radar packet:', error);
    throw error;
  }
}

/**
 * Poll radar data from server at regular intervals
 * @param apiUrl - API endpoint URL
 * @param intervalMs - Polling interval in milliseconds
 * @param onData - Callback function called with each new radar packet
 * @returns Function to stop polling
 */
export function pollRadarData(
  apiUrl: string,
  intervalMs: number,
  onData: (packet: RadarPacket) => void
): () => void {
  let isPolling = true;
  let timeoutId: number | null = null;

  const poll = async () => {
    if (!isPolling) return;

    try {
      const packet = await fetchRadarPacket(apiUrl);
      onData(packet);
    } catch (error) {
      console.error('Error polling radar data:', error);
    }

    if (isPolling) {
      timeoutId = window.setTimeout(poll, intervalMs);
    }
  };

  // Start polling
  poll();

  // Return stop function
  return () => {
    isPolling = false;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}
