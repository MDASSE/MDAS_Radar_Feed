import type { RadarPacket, RadarFrameHeader } from './simradParser';
import { parseRadarFrame } from './simradParser';

/**
 * Parse radar packet from ArrayBuffer containing JSON header + binary payload
 * @param arrayBuffer - ArrayBuffer with JSON header followed by binary data
 * @returns Parsed radar packet
 */
function parseRadarPacketFromBuffer(arrayBuffer: ArrayBuffer): RadarPacket {
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
}

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
    return parseRadarPacketFromBuffer(arrayBuffer);
  } catch (error) {
    console.error('Error fetching radar packet:', error);
    throw error;
  }
}

/**
 * Convert HTTP URL to WebSocket URL
 * @param httpUrl - HTTP/HTTPS URL or WebSocket URL
 * @returns WebSocket URL (ws:// or wss://)
 */
function convertToWebSocketUrl(httpUrl: string | undefined | null): string {
  if (!httpUrl) {
    throw new Error('WebSocket URL is not configured (httpUrl is empty).');
  }

  // First check if it's already a WebSocket URL - preserve it as-is
  if (httpUrl.startsWith('wss://')) {
    return httpUrl; // Already secure WebSocket, return as-is
  }
  if (httpUrl.startsWith('ws://')) {
    // If page is loaded over HTTPS, upgrade insecure ws:// to wss://
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      console.warn('Upgrading insecure ws:// to wss:// for HTTPS page');
      return httpUrl.replace('ws://', 'wss://');
    }
    return httpUrl; // Keep ws:// for HTTP pages
  }

  // Convert HTTP/HTTPS URLs to WebSocket URLs
  if (httpUrl.startsWith('https://')) {
    return httpUrl.replace('https://', 'wss://');
  }
  if (httpUrl.startsWith('http://')) {
    // If page is loaded over HTTPS, use wss:// instead of ws://
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      console.warn('Converting http:// to wss:// for HTTPS page');
      return httpUrl.replace('http://', 'wss://');
    }
    return httpUrl.replace('http://', 'ws://');
  }

  // If no protocol specified, use wss:// for HTTPS pages, ws:// for HTTP
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `wss://${httpUrl}`;
  }
  return `ws://${httpUrl}`;
}

/**
 * Connect to radar data via WebSocket
 * Expected format: Binary messages containing JSON header + binary payload
 * @param wsUrl - WebSocket URL (ws:// or wss://) or HTTP URL (will be converted)
 * @param onData - Callback function called with each new radar packet
 * @param onError - Optional callback for connection errors
 * @returns Function to close the WebSocket connection
 */
export function connectRadarWebSocket(
  wsUrl: string,
  onData: (packet: RadarPacket) => void,
  onError?: (error: Error) => void
): () => void {
  // Debug: Log the raw URL and converted URL to verify TLS handling
  console.log("Raw wsUrl arg:", wsUrl);
  const webSocketUrl = convertToWebSocketUrl(wsUrl);
  console.log("Final WebSocket URL:", webSocketUrl);
  
  let ws: WebSocket | null = null;
  let isConnected = false;

  try {

    ws = new WebSocket(webSocketUrl);

    ws.binaryType = 'arraybuffer'; // Receive binary data as ArrayBuffer

    ws.onopen = () => {
      isConnected = true;
      console.log('WebSocket connected to:', webSocketUrl);
    };

    ws.onmessage = (event) => {
      try {
        // Handle JSON text messages (e.g. server sends plain JSON over WebSocket)
        if (typeof event.data === 'string') {
          try {
            const json = JSON.parse(event.data);

            // Case 1: JSON already matches RadarPacket shape
            if (json && typeof json === 'object' && 'lines' in json) {
              onData(json as RadarPacket);
              return;
            }

            // Case 2: Single-beam format from server:
            // { "angleCdeg": 6000, "angleIndex": 600, "rangeM": 24000, "i1023": 175 }
            if (
              json &&
              typeof json === 'object' &&
              ('angleCdeg' in json || 'angleIndex' in json) &&
              'rangeM' in json &&
              'i1023' in json
            ) {
              const angleCdeg = Number((json as any).angleCdeg);
              const angleIndex =
                (json as any).angleIndex !== undefined
                  ? Number((json as any).angleIndex)
                  : Math.round(angleCdeg / 10); // 0.1° resolution
              const rangeM = Number((json as any).rangeM);
              const intensity1023 = Number((json as any).i1023);

              // Build a synthetic RadarPacket with one line and one strong bin at index 1023
              const BINS_PER_LINE = 2048;
              const intensities = new Array(BINS_PER_LINE).fill(0);
              if (!Number.isNaN(intensity1023)) {
                intensities[1023] = intensity1023;
              }

              const angleDeg =
                !Number.isNaN(angleCdeg) ? angleCdeg / 100 : angleIndex / 10;

              const packet: RadarPacket = {
                timestamp: new Date().toISOString(),
                lines: [
                  {
                    angle: angleDeg,
                    angleIndex,
                    range: rangeM,
                    intensities,
                  },
                ],
                length: intensities.length,
                maxRangeMeters: rangeM,
              };

              onData(packet);
              return;
            }

            // Fallback: log any other JSON for debugging
            console.log('Received JSON over WebSocket (unhandled shape):', json);
          } catch (e) {
            console.error('Error parsing JSON WebSocket message:', e);
            if (onError) {
              onError(e instanceof Error ? e : new Error(String(e)));
            }
          }
          return;
        }

        // Handle binary messages (ArrayBuffer or Blob) with JSON header + binary payload
        let arrayBuffer: ArrayBuffer;
        if (event.data instanceof ArrayBuffer) {
          arrayBuffer = event.data;
        } else if (event.data instanceof Blob) {
          // Convert Blob to ArrayBuffer
          event.data
            .arrayBuffer()
            .then((buffer) => {
              const packet = parseRadarPacketFromBuffer(buffer);
              onData(packet);
            })
            .catch((error) => {
              console.error('Error converting Blob to ArrayBuffer:', error);
              if (onError) {
                onError(new Error(`Failed to parse radar packet: ${error.message}`));
              }
            });
          return;
        } else {
          throw new Error('Unexpected message type: expected string, ArrayBuffer, or Blob');
        }

        const packet = parseRadarPacketFromBuffer(arrayBuffer);
        onData(packet);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      if (onError) {
        onError(new Error('WebSocket connection error'));
      }
    };

    ws.onclose = (event) => {
      isConnected = false;
      console.log('WebSocket closed:', event.code, event.reason);
    };
  } catch (error) {
    console.error('Error creating WebSocket:', error);
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Return cleanup function
  return () => {
    if (ws && isConnected) {
      ws.close();
      ws = null;
      isConnected = false;
    }
  };
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
