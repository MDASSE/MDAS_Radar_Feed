import { useState, useEffect, useRef } from 'react'
import './App.css'
import Radar from './components/Radar'
import ShipInfo from './components/ShipInfo'
import { pollRadarData } from './utils/radarApi'
import { generateTestRadarData } from './utils/testRadarData'
import type { RadarPacket } from './utils/simradParser'

interface RadarTarget {
  x: number;
  y: number;
  angle: number;
  range: number;
  intensity: number;
  id?: number;
}

function App() {
  const [radarPacket, setRadarPacket] = useState<RadarPacket | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const [useTestData, setUseTestData] = useState(true); // Start with test data

  // API endpoint - can be configured via environment variable or prop
  const apiUrl = import.meta.env.VITE_RADAR_API_URL || 'http://localhost:3000/api/radar/latest';

  // Generate test data on mount
  useEffect(() => {
    if (useTestData) {
      // Generate test radar data with a ship at 45 degrees, 5km range
      const testData = generateTestRadarData(45, 5000, 200);
      setRadarPacket(testData);
    }
  }, [useTestData]);

  useEffect(() => {
    if (!useTestData) {
      // Start polling for radar data from server
      const stopPolling = pollRadarData(apiUrl, 1000, (packet) => {
        setRadarPacket(packet);
      });

      stopPollingRef.current = stopPolling;

      // Cleanup on unmount
      return () => {
        if (stopPollingRef.current) {
          stopPollingRef.current();
        }
      };
    }
  }, [apiUrl, useTestData]);

  const handleTargetSelect = (target: RadarTarget) => {
    setSelectedTargetId(target.id ?? null);
    setSelectedTarget(target);
  };

  const handleTargetsUpdate = (targets: RadarTarget[]) => {
    if (selectedTargetId == null) return;
    const t = targets.find(t => t.id === selectedTargetId) || null;
    if (t) setSelectedTarget(t);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-cyan-400 mb-2">MDAS Radar Feed</h1>
          <p className="text-slate-400 text-lg">Maritime Domain Awareness System - Simrad Radar Display</p>
          <div className="mt-4">
            <button
              onClick={() => setUseTestData(!useTestData)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              {useTestData ? 'Switch to Server Data' : 'Switch to Test Data'}
            </button>
            {useTestData && (
              <p className="text-yellow-400 text-sm mt-2">Using test data with hardcoded ship</p>
            )}
          </div>
        </header>

        <div className="flex flex-row gap-12 justify-center items-start">
          <div className="flex-shrink-0">
            <Radar 
              radarPacket={radarPacket || undefined}
              onTargetSelect={handleTargetSelect}
              onTargetsUpdate={handleTargetsUpdate}
            />
          </div>

          <div className="flex-shrink-0 w-96">
            <ShipInfo target={selectedTarget} />
          </div>
        </div>

        <footer className="mt-8 text-center text-slate-500 text-sm">
          <p>Radar Range: 10 nm | Update Rate: Real-time | Simrad Packet Format</p>
        </footer>
      </div>
    </div>
  );
}

export default App
