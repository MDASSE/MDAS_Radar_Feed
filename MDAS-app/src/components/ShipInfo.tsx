interface RadarTarget {
  bytes: number;
  angle: number;
  angle_index: number;
  range: number;
  intensity: number;
  id?: number;
}

interface ShipInfoProps {
  target: RadarTarget | null;
}

export default function ShipInfo({ target }: ShipInfoProps) {
  if (!target) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-lg p-8 min-h-[800px]">
        <h2 className="text-4xl font-bold text-cyan-400 mb-6">Target Information</h2>
        <p className="text-slate-400 text-2xl">Click on a target on the radar to view details</p>
      </div>
    );
  }
  
  // Calculate x, y from polar coordinates (angle, range) for display
  const angleRad = (target.angle * Math.PI) / 180;
  const x = target.range * Math.cos(angleRad);
  const y = target.range * Math.sin(angleRad);
  
  // Calculate distance from own ship
  const distance = target.range;
  const distanceNm = distance / 1852; // Convert meters to nautical miles
  
  // Calculate bearing from own ship (0° = North, 90° = East)
  const bearing = (Math.atan2(x, y) * 180) / Math.PI;
  const bearingDeg = (bearing + 360) % 360;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg p-8 min-h-[800px]">
      <h2 className="text-4xl font-bold text-cyan-400 mb-8">Target Information</h2>
      
      <div className="space-y-6">
        <div className="bg-slate-900 p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Target ID</div>
            <div className="text-white font-mono text-3xl font-bold">{target.id ?? 'N/A'}</div>
          </div>
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Bytes</div>
            <div className="text-white font-mono text-3xl font-bold">{target.bytes}</div>
          </div>
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Angle Index</div>
            <div className="text-white font-mono text-3xl font-bold">{target.angle_index}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xl mb-3 font-semibold">Intensity</div>
            <div className="text-white font-mono text-3xl font-bold">{target.intensity}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Position</div>
            <div className="text-white font-mono text-3xl font-bold">{x.toFixed(0)}m, {y.toFixed(0)}m</div>
          </div>
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Distance</div>
            <div className="text-white font-mono text-3xl font-bold">{distanceNm.toFixed(2)} nm</div>
          </div>
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Range</div>
            <div className="text-white font-mono text-3xl font-bold">{(target.range / 1852).toFixed(2)} nm</div>
          </div>
          <div>
            <div className="text-slate-400 text-xl mb-3 font-semibold">Bearing</div>
            <div className="text-white font-mono text-3xl font-bold">{bearingDeg.toFixed(1)}°</div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Angle</div>
            <div className="text-white font-mono text-3xl font-bold">{target.angle.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-slate-400 text-xl mb-3 font-semibold">Signal Strength</div>
            <div className="text-white font-mono text-3xl font-bold">
              {((target.intensity / 255) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

