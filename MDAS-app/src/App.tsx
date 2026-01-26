import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Radar from './components/Radar'
import ShipInfo from './components/ShipInfo'
import { pollRadarData } from './utils/radarApi'
import { generateTestRadarTarget, type RadarTarget } from './utils/testRadarData'
import type { RadarPacket } from './utils/simradParser'

function RadarDashboard() {
  const [radarPacket, setRadarPacket] = useState<RadarPacket | null>(null);
  const [testTargets, setTestTargets] = useState<RadarTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const [useTestData, setUseTestData] = useState(true); // Start with test data

  // API endpoint - can be configured via environment variable or prop
  const apiUrl = import.meta.env.VITE_RADAR_API_URL || 'http://localhost:3000/api/radar/latest';

  // Generate test data on mount
  useEffect(() => {
    if (useTestData) {
      // Generate test radar target with a ship at 45 degrees, 5km range
      const testTarget = generateTestRadarTarget(45, 5000, 200, undefined, 0);
      setTestTargets([testTarget]);
      setRadarPacket(null); // Clear radar packet when using test targets
    } else {
      setTestTargets([]); // Clear test targets when using server data
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
              targets={useTestData ? testTargets : undefined}
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <RadarDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
