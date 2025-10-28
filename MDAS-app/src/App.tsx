import { useState } from 'react'
import './App.css'
import Radar from './components/Radar'
import ShipInfo from './components/ShipInfo'

interface Vessel {
  x: number;
  y: number;
  speed: number;
  heading: number;
  id: number;
  callsign: string;
}

function App() {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);

  const handleVesselSelect = (vessel: Vessel) => {
    setSelectedVessel(vessel);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-cyan-400 mb-2">MDAS Radar Feed</h1>
          <p className="text-slate-400 text-lg">Maritime Domain Awareness System - Vessel Tracking</p>
        </header>

        <div className="flex flex-row gap-12 justify-center items-start">
          <div className="flex-shrink-0">
            <Radar onVesselSelect={handleVesselSelect} />
          </div>

          <div className="flex-shrink-0 w-96">
            <ShipInfo vessel={selectedVessel} />
          </div>
        </div>

        <footer className="mt-8 text-center text-slate-500 text-sm">
          <p>Radar Range: 10 nm | Update Rate: Real-time | Powered by WASM</p>
        </footer>
      </div>
    </div>
  );
}

export default App
