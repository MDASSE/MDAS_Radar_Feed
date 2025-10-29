import { useEffect, useRef, useState } from 'react';
import { 
  loadRadarModule, 
  initRadarModule, 
  updateRadarModule, 
  getVessels,
  type Vessel 
} from '../wasm/radarModule';

interface RadarProps {
  onVesselSelect?: (vessel: Vessel) => void;
  onVesselsUpdate?: (vessels: Vessel[]) => void;
}

export default function Radar({ onVesselSelect, onVesselsUpdate }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const vesselsRef = useRef<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wasmLoadedRef = useRef(false);

  // Load WASM module on mount
  useEffect(() => {
    loadRadarModule()
      .then(() => {
        wasmLoadedRef.current = true;
        initRadarModule();
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wasmLoadedRef.current || isLoading) return;

    const drawGrid = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      // Draw range rings (1nm = 1852m, so divide by 2 for visibility)
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

    const drawVessels = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
      const vessels = vesselsRef.current;
      
      vessels.forEach((vessel) => {
        const screenX = centerX + vessel.x / scale;
        const screenY = centerY - vessel.y / scale;

        // Draw vessel trail
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - Math.cos(vessel.heading) * 30, screenY + Math.sin(vessel.heading) * 30);
        ctx.stroke();

        // Draw vessel dot
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw vessel direction arrow
        const arrowLength = 25;
        const arrowX = screenX + Math.cos(vessel.heading) * arrowLength;
        const arrowY = screenY - Math.sin(vessel.heading) * arrowLength;

        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(arrowX, arrowY);
        ctx.stroke();

        // Draw arrowhead
        const angle = vessel.heading - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - 5 * Math.cos(angle - 0.5), arrowY - 5 * Math.sin(angle - 0.5));
        ctx.lineTo(arrowX - 5 * Math.cos(angle + 0.5), arrowY - 5 * Math.sin(angle + 0.5));
        ctx.closePath();
        ctx.fillStyle = '#00FF00';
        ctx.fill();

        // Draw vessel ID and distance
        const distance = Math.sqrt(vessel.x ** 2 + vessel.y ** 2);
        const distanceNm = distance / 1852; // Convert meters to nautical miles
        
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${vessel.callsign}`, screenX + 10, screenY - 5);
        ctx.fillText(`${distanceNm.toFixed(1)}nm`, screenX + 10, screenY + 10);
      });
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radarSize = Math.min(canvas.width, canvas.height) * 0.85;
      const scale = 10000 / (radarSize / 2);

      // Find clicked vessel
      const clickedVessel = vesselsRef.current.find(v => {
        const screenX = centerX + v.x / scale;
        const screenY = centerY - v.y / scale;
        const distance = Math.sqrt((clickX - screenX) ** 2 + (clickY - screenY) ** 2);
        return distance < 20;
      });

      if (clickedVessel && onVesselSelect) {
        onVesselSelect(clickedVessel);
      }
    };

    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !wasmLoadedRef.current) return;

      // Update vessel positions in WASM
      updateRadarModule();
      
      // Get updated vessel data from WASM
      vesselsRef.current = getVessels();
      if (onVesselsUpdate) onVesselsUpdate(vesselsRef.current);

      // Clear canvas
      ctx.fillStyle = '#001122';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radarSize = Math.min(canvas.width, canvas.height) * 0.85;
      const scale = 10000 / (radarSize / 2);

      drawGrid(ctx, centerX, centerY, radarSize);

      // Draw range labels
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      for (let i = 1; i <= 5; i++) {
        const rangeNm = (i * 1852) / 1852;
        ctx.fillText(`${rangeNm}nm`, centerX + (radarSize / 5) * i + 20, centerY + 5);
      }

      // Draw own ship at center
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw vessels
      drawVessels(ctx, centerX, centerY, scale);

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
  }, [isLoading, onVesselSelect]);

  return (
    <div className="relative bg-slate-900 rounded-lg shadow-lg p-8">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-90 z-10">
          <div className="text-center">
            <div className="text-cyan-400 text-lg mb-2">Loading WASM Module...</div>
            <div className="text-slate-400 text-sm">Initializing radar system</div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-90 z-10">
          <div className="text-center p-4">
            <div className="text-red-400 text-lg mb-2">WASM Module Error</div>
            <div className="text-slate-300 text-sm">{error}</div>
            <div className="text-slate-400 text-xs mt-2">
              Make sure to build the WASM module first:<br />
              <code className="text-cyan-400">npm run build:wasm</code>
            </div>
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
