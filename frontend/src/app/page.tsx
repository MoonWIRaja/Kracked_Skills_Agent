"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal, Users, Database, Zap, Cpu, Settings, ShieldCheck, PlayCircle, MonitorPlay, Activity } from "lucide-react";
import PixelObserver from "@/components/PixelObserver";

export default function Home() {
  const [agents, setAgents] = useState<any[]>([]);
  const [serverStatus, setServerStatus] = useState<string>("connecting");

  // Fetch agents from backend
  useEffect(() => {
    fetch("http://localhost:4891/api/health")
      .then(res => res.json())
      .then(data => {
        setServerStatus("connected");
        return fetch("http://localhost:4891/api/agents");
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.agents) setAgents(data.agents);
      })
      .catch(err => {
        setServerStatus("offline");
        console.error("Backend offline", err);
      });
  }, []);

  // Mock agents if backend is offline
  const displayAgents = agents.length > 0 ? agents : [
    { name: "Amad", role: "Master Agent", icon: <Cpu className="text-blue-400" /> },
    { name: "Ara", role: "Analyst", icon: <Zap className="text-yellow-400" /> },
    { name: "Sari", role: "Security", icon: <ShieldCheck className="text-red-400" /> },
    { name: "Paan", role: "Product Manager", icon: <Users className="text-green-400" /> },
  ];

  const [activeTab, setActiveTab] = useState<'console' | 'observer'>('observer');

  return (
    <main className="flex min-h-screen flex-col p-6 items-center bg-[url('/grid.svg')] bg-center bg-fixed">
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-12 glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Terminal size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kracked_Skills Agent</h1>
            <p className="text-xs text-gray-400">Platform Web UI v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Backend:</span>
            <span className={`h-2.5 w-2.5 rounded-full ${
              serverStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#10B981]' : 
              serverStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></span>
            <span className="text-gray-300 capitalize">{serverStatus}</span>
          </div>
          <button className="bg-white/10 hover:bg-white/20 transition-colors p-2 rounded-lg">
            <Settings size={20} className="text-gray-300" />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Agents */}
        <div className="md:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Agent Swarm
              </h2>
              <span className="text-xs font-medium px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                {displayAgents.length} Active
              </span>
            </div>
            
            <div className="space-y-3">
              {displayAgents.map((agent, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <div className="p-2 bg-black/40 rounded-lg group-hover:scale-110 transition-transform">
                    {agent.icon || <Terminal size={18} className="text-gray-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-100">{agent.name}</h3>
                    <p className="text-xs text-gray-400">{agent.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Center/Right Column: Live Activity & Workflows */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Main Display Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-2xl p-6 flex flex-col h-[700px]"
          >
            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-6 gap-6 px-2">
              <button 
                onClick={() => setActiveTab('console')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'console' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Activity size={16} />
                System Console
              </button>
              <button 
                onClick={() => setActiveTab('observer')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'observer' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <MonitorPlay size={16} />
                Pixel Observer (Phase 4)
              </button>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'console' ? (
                /* Terminal Console View */
                <div className="flex-1 rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-sm overflow-hidden relative">
                  <div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar">
                    <div className="text-gray-500 mb-2">// System Initialization...</div>
                    <div className="text-green-400 mb-1">➜ KD System Boot: SUCCESS</div>
                    <div className="text-blue-400 mb-1">➜ Loading Swarm Memory: DONE</div>
                    <div className="text-gray-400 mb-4">➜ Waiting for user instruction...</div>
                    
                    <div className="flex items-start gap-3 opacity-50">
                      <div className="min-w-[4px] mt-1.5 h-full bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="text-xs font-bold text-blue-400">[AMAD]</span>
                        <p className="text-gray-300 mt-0.5">Ready to assist. Awaiting input for discovery or execution.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Pixel 2D Engine View */
                <div className="flex-1 overflow-hidden">
                  <PixelObserver />
                </div>
              )}
            </div>
          </motion.div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Memory Nodes", val: "1,240", color: "text-blue-400" },
              { label: "XP Gained", val: "450", color: "text-yellow-400" },
              { label: "Stories Selesai", val: "12", color: "text-green-400" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="glass-panel rounded-xl p-4 flex flex-col justify-center border-t border-t-white/10"
              >
                <div className="text-xs text-gray-400 font-medium mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold tracking-tight ${stat.color}`}>{stat.val}</div>
              </motion.div>
            ))}
          </div>
        </div>
        
      </div>
    </main>
  );
}
