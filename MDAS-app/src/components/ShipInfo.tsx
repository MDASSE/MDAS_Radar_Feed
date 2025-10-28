interface Vessel {
  x: number;
  y: number;
  speed: number;
  heading: number;
  id: number;
  callsign: string;
}

interface ShipInfoProps {
  vessel: Vessel | null;
}

export default function ShipInfo({ vessel }: ShipInfoProps) {
  if (!vessel) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-lg p-8 min-h-[800px]">
        <h2 className="text-4xl font-bold text-cyan-400 mb-6">Vessel Information</h2>
        <p className="text-slate-400 text-2xl">Click on a vessel on the radar to view details</p>
      </div>
    );
  }

  // Convert heading from radians to degrees
  const headingDeg = ((vessel.heading * 180) / Math.PI + 360) % 360;
  
  // Calculate distance from own ship
  const distance = Math.sqrt(vessel.x ** 2 + vessel.y ** 2);
  const distanceNm = distance / 1852; // Convert meters to nautical miles
  
  // Calculate bearing from own ship
  const bearing = (Math.atan2(vessel.x, vessel.y) * 180) / Math.PI;
  const bearingDeg = (bearing + 360) % 360;
  
  // Convert speed from m/s to knots
  const speedKnots = vessel.speed * 1.944;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg p-8 min-h-[800px]">
      <h2 className="text-4xl font-bold text-cyan-400 mb-8">Vessel Information</h2>
      
      <div className="space-y-6">
        <div className="bg-slate-900 p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Callsign</div>
            <div className="text-white font-mono text-3xl font-bold">{vessel.callsign}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xl mb-3 font-semibold">ID</div>
            <div className="text-white font-mono text-3xl font-bold">{vessel.id}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Position</div>
            <div className="text-white font-mono text-3xl font-bold">{vessel.x.toFixed(0)}m, {vessel.y.toFixed(0)}m</div>
          </div>
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Distance</div>
            <div className="text-white font-mono text-3xl font-bold">{distanceNm.toFixed(2)} nm</div>
          </div>
          <div>
            <div className="text-slate-400 text-xl mb-3 font-semibold">Bearing</div>
            <div className="text-white font-mono text-3xl font-bold">{bearingDeg.toFixed(1)}°</div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-slate-400 text-xl mb-3 font-semibold">Speed</div>
            <div className="text-white font-mono text-3xl font-bold">{speedKnots.toFixed(1)} kts</div>
          </div>
          <div>
            <div className="text-slate-400 text-xl mb-3 font-semibold">Heading</div>
            <div className="text-white font-mono text-3xl font-bold">{headingDeg.toFixed(1)}°</div>
          </div>
        </div>
      </div>
    </div>
  );
}

