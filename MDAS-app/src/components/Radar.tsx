import { useEffect, useRef } from 'react';

interface Vessel {
  x: number;
  y: number;
  speed: number;
  heading: number;
  id: number;
  callsign: string;
}

interface RadarProps {
  onVesselSelect?: (vessel: Vessel) => void;
}

export default function Radar({ onVesselSelect }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const vesselsRef = useRef<Vessel[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initVessels = () => {
      vesselsRef.current = [
        { x: 2000, y: 1500, speed: 0.05, heading: 0.78, id: 1, callsign: 'SHIP-001' },
        { x: -1500, y: -800, speed: 0.07, heading: 3.14, id: 2, callsign: 'SHIP-002' },
        { x: 1800, y: -1200, speed: 0.04, heading: 2.35, id: 3, callsign: 'SHIP-003' },
        { x: -2500, y: -1500, speed: 0.06, heading: -2.36, id: 4, callsign: 'SHIP-004' },
        { x: 1200, y: 2000, speed: 0.08, heading: 1.57, id: 5, callsign: 'SHIP-005' },
        { x: -800, y: 2200, speed: 0.05, heading: 0.39, id: 6, callsign: 'SHIP-006' },
        { x: 3000, y: -2200, speed: 0.045, heading: -1.18, id: 7, callsign: 'SHIP-007' },
        { x: -3500, y: 800, speed: 0.065, heading: 2.94, id: 8, callsign: 'SHIP-008' },
      ];
    };

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

    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      timeRef.current++;

      // Update vessel positions
      vesselsRef.current = vesselsRef.current.map(v => {
        const deltaX = Math.cos(v.heading) * v.speed;
        const deltaY = Math.sin(v.heading) * v.speed;
        
        return {
          ...v,
          x: v.x + deltaX,
          y: v.y + deltaY,
        };
      });

      // Some vessels make slight course corrections occasionally
      if (timeRef.current % 200 === 0) {
        vesselsRef.current = vesselsRef.current.map(v => ({
          ...v,
          heading: v.heading + (Math.random() - 0.5) * 0.02,
        }));
      }

      // Wrap vessels around if they go too far
      vesselsRef.current = vesselsRef.current.map(v => {
        if (Math.abs(v.x) > 12000) {
          v.x = -v.x * 0.9;
        }
        if (Math.abs(v.y) > 12000) {
          v.y = -v.y * 0.9;
        }
        return v;
      });

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

    canvas.addEventListener('click', handleClick);
    initVessels();
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener('click', handleClick);
    };
  }, [onVesselSelect]);

  return (
    <div className="relative bg-slate-900 rounded-lg shadow-lg p-8">
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="border-2 border-cyan-500 rounded cursor-crosshair"
      />
    </div>
  );
}
