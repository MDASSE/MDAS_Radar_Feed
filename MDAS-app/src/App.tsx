import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Radar from './components/Radar'
import ShipInfo from './components/ShipInfo'
import { connectRadarWebSocket } from './utils/radarApi'
import type { RadarTarget } from './utils/testRadarData'
import type { RadarPacket } from './utils/simradParser'

function RadarDashboard() {
  const [radarPacket, setRadarPacket] = useState<RadarPacket | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const stopWebSocketRef = useRef<(() => void) | null>(null);

  // WebSocket endpoint - can be configured via environment variable or prop
  // Supports both WebSocket URLs (ws://, wss://) and HTTP URLs (will be converted)
  const wsUrl = import.meta.env.VITE_RADAR_WS_URL;

  // Connect to radar data via WebSocket on mount
  useEffect(() => {
    // Connect to radar data via WebSocket
    const stopWebSocket = connectRadarWebSocket(
      wsUrl,
      (packet) => {
        setRadarPacket(packet);
      },
      (error) => {
        console.error('WebSocket error:', error);
      }
    );

    stopWebSocketRef.current = stopWebSocket;

    // Cleanup on unmount
    return () => {
      if (stopWebSocketRef.current) {
        stopWebSocketRef.current();
      }
    };
  }, [wsUrl]);

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
