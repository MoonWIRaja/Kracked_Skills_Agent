"use client";

import { useEffect, useRef, useState } from 'react';
import { PixelEngine } from '@/lib/pixel/Engine';

interface LogEntry {
  timestamp: string;
  agentId: string;
  message: string;
  type: string;
}

export default function PixelObserver() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new PixelEngine(canvasRef.current);
    engineRef.current = engine;

    // Add agents based on KD specs
    engine.addAgent("amad", "Amad", "Master Agent", "#3b82f6");
    engine.addAgent("ara", "Ara", "Analyst", "#eab308");
    engine.addAgent("sari", "Sari", "Security", "#ef4444");
    engine.addAgent("paan", "Paan", "PM", "#10b981");
    engine.addAgent("ezra", "Ezra", "Engineer", "#6366f1");

    // Pre-seed some behaviors
    engine.setSpeech("amad", "System Online. Swarm ready.");

    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  // Transcript Player Logic (mocking a live JSONL feed)
  const playTranscript = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    const mockFeed = [
      { t: 1000, a: "paan", m: "Let's review the new requirements." },
      { t: 3000, a: "ara", m: "I've analyzed the PRD. Looks good." },
      { t: 6000, a: "amad", m: "Initiating Party Mode for Arch design." },
      { t: 8000, a: "ezra", m: "I will start writing the TDD specs." },
      { t: 10000, a: "sari", m: "Wait! Validation Block! Security check needed." },
    ];

    mockFeed.forEach(evt => {
      setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.setSpeech(evt.a, evt.m);
          setLogs(prev => [{
            timestamp: new Date().toLocaleTimeString(),
            agentId: evt.a,
            message: evt.m,
            type: 'speech'
          }, ...prev].slice(0, 10)); // Keep last 10
        }
      }, evt.t);
    });

    setTimeout(() => setIsPlaying(false), 12000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Canvas Header */}
      <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/10">
        <h3 className="font-semibold text-sm text-gray-200 flex items-center gap-2">
          <span className="shrink-0 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#10B981] animate-pulse"></span>
          KD Pixel Headquarters
        </h3>
        <button 
          onClick={playTranscript}
          disabled={isPlaying}
          className="text-xs font-medium px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isPlaying ? 'Playing...' : 'Play Scenario'}
        </button>
      </div>

      {/* The Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/50 mx-auto max-w-full">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={480}
          className="w-full h-full object-contain"
        />
        
        {/* Overlay scanning effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px]"></div>
      </div>

      {/* Logs underneath */}
      <div className="bg-black/40 rounded-xl border border-white/10 p-3 h-[180px] overflow-hidden flex flex-col">
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Observer Transcript Logs</h4>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-500 italic text-center mt-10">No recent activity detected. Press Play Scenario.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-xs font-mono animate-in fade-in slide-in-from-left-2 flex gap-2">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className="text-blue-400 font-bold w-12 text-right">[{log.agentId.toUpperCase()}]</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
