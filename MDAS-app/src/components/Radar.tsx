import { useEffect, useRef, useState } from 'react';
import { 
  polarToCartesian,
  detectTargets,
  type RadarPacket,
  type RadarLine
} from '../utils/simradParser';

interface RadarTarget {
  x: number;
  y: number;
  angle: number;
  range: number;
  intensity: number;
  id?: number;
}

interface RadarProps {
  onTargetSelect?: (target: RadarTarget) => void;
  onTargetsUpdate?: (targets: RadarTarget[]) => void;
  radarPacket?: RadarPacket;  // Pre-parsed radar packet from server
  intensityThreshold?: number;  // Threshold for target detection (0-255)
  maxRange?: number;  // Maximum radar range in meters
  showSweepLines?: boolean;  // Whether to draw radar sweep lines
  sweepPersistence?: number;  // Number of sweeps to keep visible
}

export default function Radar({ 
  onTargetSelect, 
  onTargetsUpdate,
  radarPacket,
  intensityThreshold = 100,
  maxRange: maxRangeProp,
  showSweepLines = true,
  sweepPersistence = 5
}: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const radarLinesRef = useRef<RadarLine[]>([]);
  const targetsRef = useRef<RadarTarget[]>([]);
  const sweepHistoryRef = useRef<RadarLine[]>([]); // Store sweep history for persistence
  const [error, setError] = useState<string | null>(null);
  
  // Use maxRange from packet if available, otherwise use prop or default
  const maxRange = radarPacket?.maxRangeMeters ?? maxRangeProp ?? 10000;

  // Process radar packet data when it changes
  useEffect(() => {
    try {
      if (radarPacket) {
        // Update radar lines
        radarLinesRef.current = radarPacket.lines;

        // Add to sweep history
        sweepHistoryRef.current.push(...radarPacket.lines);
        
        // Keep only last N sweeps
        const maxSweeps = sweepPersistence * 360; // Assuming 360 lines per full sweep
        if (sweepHistoryRef.current.length > maxSweeps) {
          sweepHistoryRef.current = sweepHistoryRef.current.slice(-maxSweeps);
        }

        // Detect targets from all lines
        const allTargets: RadarTarget[] = [];
        let targetId = 0;
        
        radarPacket.lines.forEach(line => {
          const lineTargets = detectTargets(line, intensityThreshold);
          lineTargets.forEach(target => {
            const { x, y } = polarToCartesian(target.angle, target.range);
            allTargets.push({
              x,
              y,
              angle: target.angle,
              range: target.range,
              intensity: target.intensity,
              id: targetId++,
            });
          });
        });
        
        targetsRef.current = allTargets;
        if (onTargetsUpdate) {
          onTargetsUpdate(allTargets);
        }
      }
    } catch (err: any) {
      console.error('Error processing radar data:', err);
      setError(`Failed to process radar data: ${err.message}`);
    }
  }, [radarPacket, intensityThreshold, sweepPersistence, onTargetsUpdate]);

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawGrid = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      // Draw range rings
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (size / 5) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - size / 2, centerY);
      ctx.lineTo(centerX + size / 2, centerY);
      ctx.moveTo(centerX, centerY - size / 2);
      ctx.lineTo(centerX, centerY + size / 2);
      ctx.stroke();

      // Draw cardinal directions
      ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('N', centerX, centerY - size / 2 - 5);
      ctx.fillText('E', centerX + size / 2 + 5, centerY);
      ctx.fillText('S', centerX, centerY + size / 2 + 20);
      ctx.fillText('W', centerX - size / 2 - 5, centerY);
    };

    const drawRadarSweep = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, line: RadarLine) => {
      // Draw intensity data as a line
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      for (let i = 0; i < line.intensities.length; i++) {
        const intensity = line.intensities[i];
        if (intensity > 0) {
          const range = (i / line.intensities.length) * line.range;
          const { x, y } = polarToCartesian(line.angle, range);
          
          const screenX = centerX + x / scale;
          const screenY = centerY - y / scale;
          
          // Color based on intensity
          const alpha = Math.min(intensity / 255, 0.8);
          ctx.strokeStyle = `rgba(0, 255, 0, ${alpha * 0.3})`;
          
          if (i === 0) {
            ctx.moveTo(screenX, screenY);
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }
      }
      ctx.stroke();
    };

    const drawTargets = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
      const targets = targetsRef.current;
      
      targets.forEach((target) => {
        const screenX = centerX + target.x / scale;
        const screenY = centerY - target.y / scale;

        // Skip if outside visible range
        if (Math.abs(target.x) > maxRange || Math.abs(target.y) > maxRange) {
          return;
        }

        // Draw target dot (size based on intensity)
        const size = Math.max(3, Math.min(8, target.intensity / 30));
        ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(1, target.intensity / 255)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw target ring
        ctx.strokeStyle = `rgba(0, 255, 0, ${Math.min(0.8, target.intensity / 255)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Draw range label for strong targets
        if (target.intensity > 150) {
          const distanceNm = target.range / 1852; // Convert to nautical miles
          ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${distanceNm.toFixed(1)}nm`, screenX + size + 5, screenY);
        }
      });
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radarSize = Math.min(canvas.width, canvas.height) * 0.85;
      const scale = maxRange / (radarSize / 2);

      // Find clicked target
      const clickedTarget = targetsRef.current.find(t => {
        const screenX = centerX + t.x / scale;
        const screenY = centerY - t.y / scale;
        const distance = Math.sqrt((clickX - screenX) ** 2 + (clickY - screenY) ** 2);
        return distance < 15;
      });

      if (clickedTarget && onTargetSelect) {
        onTargetSelect(clickedTarget);
      }
    };

    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = '#001122';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radarSize = Math.min(canvas.width, canvas.height) * 0.85;
      const scale = maxRange / (radarSize / 2);

      drawGrid(ctx, centerX, centerY, radarSize);

      // Draw range labels
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      for (let i = 1; i <= 5; i++) {
        const rangeNm = (i * maxRange / 5) / 1852;
        ctx.fillText(`${rangeNm.toFixed(1)}nm`, centerX + (radarSize / 5) * i + 20, centerY + 5);
      }

      // Draw radar sweep lines (from history for persistence)
      if (showSweepLines) {
        const linesToDraw = sweepHistoryRef.current.length > 0 
          ? sweepHistoryRef.current 
          : radarLinesRef.current;
        
        linesToDraw.forEach(line => {
          drawRadarSweep(ctx, centerX, centerY, scale, line);
        });
      }

      // Draw targets
      drawTargets(ctx, centerX, centerY, scale);

      // Draw own ship at center
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    canvas.addEventListener('click', handleClick);
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener('click', handleClick);
    };
  }, [maxRange, showSweepLines, onTargetSelect]);

  return (
    <div className="relative bg-slate-900 rounded-lg shadow-lg p-8">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-90 z-10">
          <div className="text-center p-4">
            <div className="text-red-400 text-lg mb-2">Radar Error</div>
            <div className="text-slate-300 text-sm">{error}</div>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="border-2 border-cyan-500 rounded cursor-crosshair"
      />
    </div>
  );
}
