"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelEngine } from "@/lib/pixel/Engine";

export interface ObserverAgent {
  id: string;
  name: string;
  role: string;
  mention?: string;
  color: string;
  isMain?: boolean;
  level?: number;
  xp?: number;
}

export interface ObserverTranscript {
  run_id?: string;
  ts?: string;
  command?: string;
  stage?: string;
  speaker_id?: string;
  speaker_name?: string;
  speaker_role?: string;
  message_kind?: string;
  text?: string;
  xp_delta?: number;
}

export interface ProjectSummary {
  main_agent: string;
  current_stage: string | null;
  recent_command: string | null;
  next_command: string | null;
  level: number;
  xp: number;
  status_excerpt: string;
  updated_at: string;
}

interface PixelObserverProps {
  agents: ObserverAgent[];
  transcripts: ObserverTranscript[];
  summary: ProjectSummary;
}

interface LogEntry {
  timestamp: string;
  agentName: string;
  command: string;
  messageKind: string;
  message: string;
}

function toRoleKey(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PixelObserver({ agents, transcripts, summary }: PixelObserverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const lastSpeechKeyRef = useRef<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const latestTranscript = transcripts[0] || null;
  const orderedLogs = useMemo(
    () =>
      transcripts.slice(0, 12).map((line, index) => ({
        timestamp: line.ts ? new Date(line.ts).toLocaleTimeString() : `line-${index}`,
        agentName: line.speaker_name || line.speaker_id || "Unknown",
        command: line.command || "-",
        messageKind: line.message_kind || "message",
        message: line.text || "",
      })),
    [transcripts]
  );

  useEffect(() => {
    if (!canvasRef.current || agents.length === 0) return;

    const engine = new PixelEngine(canvasRef.current);
    engineRef.current = engine;

    agents.forEach((agent) => {
      engine.addAgent(agent.id, agent.name, agent.role, agent.color);
    });

    const mainAgent = agents.find((agent) => agent.isMain || toRoleKey(agent.role).includes("master"));
    if (mainAgent) {
      engine.setSpeech(mainAgent.id, `${mainAgent.name}: observer online.`);
    }

    engine.start();
    return () => {
      engine.stop();
    };
  }, [agents]);

  useEffect(() => {
    setLogs(orderedLogs);
  }, [orderedLogs]);

  useEffect(() => {
    if (!engineRef.current || !latestTranscript) return;
    const speechKey = [
      latestTranscript.ts,
      latestTranscript.speaker_id,
      latestTranscript.command,
      latestTranscript.text,
    ].join("|");

    if (!speechKey || speechKey === lastSpeechKeyRef.current) return;
    lastSpeechKeyRef.current = speechKey;

    const speakerId = latestTranscript.speaker_id || "main-agent";
    const speakerName = latestTranscript.speaker_name || "Agent";
    const text = latestTranscript.text || "";
    engineRef.current.setSpeech(speakerId, `${speakerName}: ${text}`);
  }, [latestTranscript]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-[#2d4a36] bg-[#0b1b12]/90 px-3 py-2">
        <div>
          <h3 className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">KD RPG World</h3>
          <p className="font-ui mt-1 text-xs text-[#85af8e]">
            {summary.recent_command ? `Recent /${summary.recent_command}` : "No recent command"}
            <span className="mx-2 text-[#3d6a49]">|</span>
            {summary.next_command ? `Next ${summary.next_command}` : "Next not set"}
          </p>
        </div>
        <div className="rounded-md border border-[#2f6d3a] bg-[#153321] px-3 py-1.5 text-right">
          <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[#9ee49f]">Main Agent XP</p>
          <p className="font-ui text-sm font-semibold text-[#d4ffdc]">
            LV {summary.level} · {summary.xp} XP
          </p>
        </div>
      </div>

      <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl border border-[#2d4a36] bg-[#060f0a]">
        <canvas ref={canvasRef} width={640} height={480} className="h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_0,rgba(22,77,38,0.11)_48%,rgba(0,0,0,0)_100%)] bg-[length:100%_4px]" />
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex min-h-[220px] flex-col rounded-xl border border-[#2d4a36] bg-[#07130c]/95 p-3">
          <h4 className="font-arcade mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Live Transcript</h4>
          <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto pr-2">
            {logs.length === 0 ? (
              <div className="font-ui mt-8 text-center text-xs text-[#5f8d66]">Waiting for transcript lines from `.kracked/runtime/transcripts.jsonl`.</div>
            ) : (
              logs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="rounded-md border border-[#183126] bg-[#0b1710] px-3 py-2">
                  <div className="font-ui flex flex-wrap items-center gap-2 text-[11px] text-[#7ca986]">
                    <span>[{log.timestamp}]</span>
                    <span className="font-semibold text-[#93f2a2]">{log.agentName}</span>
                    <span className="rounded bg-[#163122] px-1.5 py-0.5 text-[#d3ffe1]">/{log.command}</span>
                    <span className="text-[#9ccba6]">{log.messageKind}</span>
                  </div>
                  <p className="font-ui mt-2 text-sm text-[#d1e8d2]">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[220px] flex-col rounded-xl border border-[#2d4a36] bg-[#07130c]/95 p-3">
          <h4 className="font-arcade mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Project State</h4>
          <div className="space-y-3">
            <div className="rounded-lg border border-[#21412c] bg-[#0a1a11] px-3 py-2">
              <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[#88b192]">Current Stage</p>
              <p className="font-ui mt-1 text-sm font-semibold text-[#e2ffe7]">{summary.current_stage ?? "Not set"}</p>
            </div>
            <div className="rounded-lg border border-[#21412c] bg-[#0a1a11] px-3 py-2">
              <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[#88b192]">Next Command</p>
              <p className="font-ui mt-1 text-sm font-semibold text-[#d0ffd9]">{summary.next_command ?? "Not set"}</p>
            </div>
            <div className="rounded-lg border border-[#21412c] bg-[#0a1a11] px-3 py-2">
              <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[#88b192]">Status Excerpt</p>
              <p className="font-ui mt-1 text-sm leading-6 text-[#c0dac6]">{summary.status_excerpt || "No status summary available yet."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
