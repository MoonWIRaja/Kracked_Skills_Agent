"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelEngine } from '@/lib/pixel/Engine';

export interface ObserverAgent {
  id: string;
  name: string;
  role: string;
  color: string;
  isMain?: boolean;
}

interface PixelObserverProps {
  agents: ObserverAgent[];
}

interface LogEntry {
  timestamp: string;
  agentId: string;
  agentName: string;
  message: string;
}

interface TranscriptEvent {
  t: number;
  a: string;
  n: string;
  m: string;
}

function toRoleKey(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function roleMessage(agent: ObserverAgent): string {
  const key = toRoleKey(agent.role);
  if (key.includes('master')) return `${agent.name} coordinating all agents now.`;
  if (key.includes('analyst')) return `${agent.name} completed discovery scan and risk matrix.`;
  if (key.includes('product')) return `${agent.name} updated scope and acceptance criteria.`;
  if (key.includes('architect')) return `${agent.name} finalized service boundaries and API contracts.`;
  if (key.includes('tech-lead')) return `${agent.name} split epic into sprint-ready user stories.`;
  if (key.includes('engineer')) return `${agent.name} pushed TDD implementation and green tests.`;
  if (key === 'qa' || key.includes('quality')) return `${agent.name} verified regression pack and edge cases.`;
  if (key.includes('security')) return `${agent.name} flagged critical checks in validation block.`;
  if (key.includes('devops')) return `${agent.name} prepared CI pipeline and rollback plan.`;
  if (key.includes('release')) return `${agent.name} drafted release notes and changelog entries.`;
  return `${agent.name} completed assigned workflow successfully.`;
}

function buildScenario(agents: ObserverAgent[]): TranscriptEvent[] {
  const selected = agents.slice(0, 6);
  return selected.map((agent, index) => ({
    t: 900 + index * 1700,
    a: agent.id,
    n: agent.name,
    m: roleMessage(agent),
  }));
}

export default function PixelObserver({ agents }: PixelObserverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const timersRef = useRef<number[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const scenario = useMemo(() => buildScenario(agents), [agents]);

  useEffect(() => {
    if (!canvasRef.current || agents.length === 0) return;

    const engine = new PixelEngine(canvasRef.current);
    engineRef.current = engine;

    agents.forEach((agent) => {
      engine.addAgent(agent.id, agent.name, agent.role, agent.color);
    });

    const mainAgent = agents.find((agent) => agent.isMain || toRoleKey(agent.role).includes('master'));
    if (mainAgent) {
      engine.setSpeech(mainAgent.id, `${mainAgent.name}: KD network online.`);
    }

    engine.start();
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      engine.stop();
    };
  }, [agents]);

  const playTranscript = () => {
    if (isPlaying || scenario.length === 0) return;
    setIsPlaying(true);
    setLogs([]);

    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    scenario.forEach((event) => {
      const timeoutId = window.setTimeout(() => {
        if (!engineRef.current) return;
        engineRef.current.setSpeech(event.a, event.m);
        setLogs((prev) =>
          [
            {
              timestamp: new Date().toLocaleTimeString(),
              agentId: event.a,
              agentName: event.n,
              message: event.m,
            },
            ...prev,
          ].slice(0, 12)
        );
      }, event.t);

      timersRef.current.push(timeoutId);
    });

    const endingTimeoutId = window.setTimeout(() => setIsPlaying(false), Math.max(...scenario.map((s) => s.t)) + 1600);
    timersRef.current.push(endingTimeoutId);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-[#2d4a36] bg-[#0b1b12]/90 px-3 py-2">
        <h3 className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Pixel Agent HQ</h3>
        <button
          onClick={playTranscript}
          disabled={isPlaying || scenario.length === 0}
          className="font-ui rounded-md border border-[#2f6d3a] bg-[#153321] px-3 py-1.5 text-xs font-semibold text-[#c8ffd1] transition hover:bg-[#1d452c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaying ? 'Running...' : 'Run Scenario'}
        </button>
      </div>

      <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl border border-[#2d4a36] bg-[#060f0a]">
        <canvas ref={canvasRef} width={640} height={480} className="h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_0,rgba(22,77,38,0.11)_48%,rgba(0,0,0,0)_100%)] bg-[length:100%_4px]" />
      </div>

      <div className="flex min-h-[190px] flex-1 flex-col rounded-xl border border-[#2d4a36] bg-[#07130c]/95 p-3">
        <h4 className="font-arcade mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Observer Logs</h4>
        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto pr-2">
          {logs.length === 0 ? (
            <div className="font-ui mt-8 text-center text-xs text-[#5f8d66]">No live events. Click Run Scenario.</div>
          ) : (
            logs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="font-ui flex gap-2 text-xs text-[#b6d3b9]">
                <span className="min-w-[64px] text-[#6ca474]">[{log.timestamp}]</span>
                <span className="min-w-[58px] font-semibold text-[#93f2a2]">[{log.agentName}]</span>
                <span className="text-[#d1e8d2]">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
