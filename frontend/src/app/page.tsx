"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Bug,
  ChevronRight,
  Cpu,
  LayoutTemplate,
  Network,
  Rocket,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import PixelObserver, { ObserverAgent, ObserverTranscript, ProjectSummary } from "@/components/PixelObserver";

type ConnectionState = "connecting" | "connected" | "offline";

interface ApiRosterAgent {
  id?: string;
  role?: string;
  label?: string;
  name: string;
  mention?: string;
}

interface ApiRoster {
  main: {
    id: string;
    name: string;
    role?: string;
    mention?: string;
    level?: number;
    xp?: number;
  };
  detailsByRole?: Record<string, ApiRosterAgent>;
  professional?: ApiRosterAgent[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_KD_BACKEND_URL ?? "http://localhost:4891";

function toRoleKey(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function roleColor(role: string): string {
  const key = toRoleKey(role);
  if (key.includes("master")) return "#7ef29a";
  if (key.includes("analyst")) return "#ffe082";
  if (key.includes("product")) return "#62d2ff";
  if (key.includes("architect")) return "#ffa15a";
  if (key.includes("tech-lead")) return "#c5a4ff";
  if (key.includes("engineer")) return "#a4f0ff";
  if (key === "qa" || key.includes("quality")) return "#f4ffa9";
  if (key.includes("security")) return "#ff7d7d";
  if (key.includes("devops") || key.includes("release")) return "#ffc07a";
  if (key.includes("ui-ux")) return "#ffb8d7";
  if (key.includes("backend") || key.includes("api")) return "#8ad1ff";
  return "#b8d5c0";
}

function roleIcon(role: string) {
  const key = toRoleKey(role);
  if (key.includes("master")) return <Cpu size={16} className="text-[#7ef29a]" />;
  if (key.includes("analyst")) return <Search size={16} className="text-[#ffe082]" />;
  if (key.includes("security")) return <ShieldCheck size={16} className="text-[#ff7d7d]" />;
  if (key === "qa" || key.includes("quality")) return <Bug size={16} className="text-[#f4ffa9]" />;
  if (key.includes("devops") || key.includes("release")) return <Rocket size={16} className="text-[#ffc07a]" />;
  if (key.includes("engineer")) return <Wrench size={16} className="text-[#a4f0ff]" />;
  if (key.includes("ui-ux")) return <LayoutTemplate size={16} className="text-[#ffb8d7]" />;
  if (key.includes("backend") || key.includes("api")) return <Network size={16} className="text-[#8ad1ff]" />;
  return <Bot size={16} className="text-[#a4f0ff]" />;
}

function fallbackSummary(): ProjectSummary {
  return {
    main_agent: "Main Agent",
    current_stage: null,
    recent_command: null,
    next_command: "/kd-analyze",
    level: 1,
    xp: 0,
    status_excerpt: "Backend offline. Showing static console shell.",
    updated_at: new Date().toISOString(),
  };
}

function fallbackAgents(): ObserverAgent[] {
  return [
    { id: "main-agent", name: "Main Agent", role: "Master Agent", mention: "@main-agent", color: "#7ef29a", isMain: true, level: 1, xp: 0 },
    { id: "analyst-agent", name: "Analyst", role: "Analyst", mention: "@analyst", color: "#ffe082", level: 1, xp: 0 },
    { id: "pm-agent", name: "PM", role: "Product Manager", mention: "@pm", color: "#62d2ff", level: 1, xp: 0 },
  ];
}

function mapRoster(roster: ApiRoster | null): ObserverAgent[] {
  if (!roster) return fallbackAgents();

  const main: ObserverAgent = {
    id: roster.main.id || "main-agent",
    name: roster.main.name || "Main Agent",
    role: roster.main.role || "Master Agent",
    mention: roster.main.mention || "@main-agent",
    color: roleColor(roster.main.role || "Master Agent"),
    isMain: true,
    level: Number(roster.main.level) || 1,
    xp: Number(roster.main.xp) || 0,
  };

  const professional = Object.entries(roster.detailsByRole || {}).map(([role, entry]) => ({
    id: entry.id || `${role}-agent`,
    name: entry.name,
    role: entry.label || role,
    mention: entry.mention || `@${entry.name.toLowerCase()}`,
    color: roleColor(entry.label || role),
    level: 1,
    xp: 0,
  }));

  return [main, ...professional];
}

export default function Home() {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [roster, setRoster] = useState<ApiRoster | null>(null);
  const [summary, setSummary] = useState<ProjectSummary>(fallbackSummary());
  const [transcripts, setTranscripts] = useState<ObserverTranscript[]>([]);

  const agents = useMemo(() => mapRoster(roster), [roster]);
  const mainAgent = agents.find((agent) => agent.isMain) || agents[0];
  const totalXp = agents.reduce((total, agent) => total + (agent.xp || 0), 0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const healthResponse = await fetch(`${BACKEND_URL}/api/health`, { signal: controller.signal });
        if (!healthResponse.ok) throw new Error(`Health check failed: ${healthResponse.status}`);

        const [rosterResponse, summaryResponse, transcriptsResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/roster`, { signal: controller.signal }),
          fetch(`${BACKEND_URL}/api/project-summary`, { signal: controller.signal }),
          fetch(`${BACKEND_URL}/api/transcripts/recent?limit=24`, { signal: controller.signal }),
        ]);

        if (!rosterResponse.ok || !summaryResponse.ok || !transcriptsResponse.ok) {
          throw new Error("Backend payload fetch failed");
        }

        const [rosterPayload, summaryPayload, transcriptsPayload] = await Promise.all([
          rosterResponse.json(),
          summaryResponse.json(),
          transcriptsResponse.json(),
        ]);

        setRoster(rosterPayload);
        setSummary(summaryPayload);
        setTranscripts(Array.isArray(transcriptsPayload.transcripts) ? transcriptsPayload.transcripts : []);
        setStatus("connected");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("offline");
          setRoster(null);
          setSummary(fallbackSummary());
          setTranscripts([]);
        }
      }
    }

    loadData();
    const interval = window.setInterval(loadData, 5000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-kd-stage px-4 py-6 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#21452f_0%,rgba(5,10,8,0)_56%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="kd-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-arcade text-[10px] uppercase tracking-[0.24em] text-[#9ee49f]">Kracked Skills Agent</p>
            <h1 className="font-ui mt-2 text-2xl font-bold text-[#e2ffe7]">Live Multi-Agent Console</h1>
            <p className="font-ui mt-1 text-sm text-[#84ad8e]">
              Main Agent: <span className="font-semibold text-[#c9ffd2]">{mainAgent?.name ?? "N/A"}</span>
              <span className="ml-2 text-[#6fd484]">{mainAgent?.mention ?? "@main-agent"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[#2b4d36] bg-[#0b1c12] px-3 py-2">
            <Activity size={16} className="text-[#9ee49f]" />
            <span className="font-ui text-xs uppercase tracking-[0.2em] text-[#9cd7a6]">Backend</span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "connected"
                  ? "bg-[#6fff8f] shadow-[0_0_8px_#6fff8f]"
                  : status === "connecting"
                    ? "bg-[#ffe082] animate-pulse"
                    : "bg-[#ff7d7d]"
              }`}
            />
            <span className="font-ui text-xs text-[#d6f5dc]">{status}</span>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="kd-panel flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Agent Roster</h2>
              <span className="font-ui rounded-md border border-[#315a3d] bg-[#102116] px-2 py-0.5 text-xs text-[#bddfc5]">
                {agents.length} Active
              </span>
            </div>

            <div className="custom-scrollbar max-h-[510px] space-y-2 overflow-y-auto pr-1">
              {agents.map((agent) => (
                <div key={agent.id} className="rounded-lg border border-[#22412d] bg-[#0a1a11] px-3 py-2">
                  <div className="flex items-center gap-2">
                    {roleIcon(agent.role)}
                    <p className="font-ui text-sm font-semibold text-[#e2ffe7]">{agent.name}</p>
                    {agent.isMain && (
                      <span className="font-ui rounded bg-[#1a3724] px-1.5 py-0.5 text-[10px] uppercase text-[#9ee49f]">Main</span>
                    )}
                  </div>
                  <p className="font-ui mt-1 text-xs text-[#83b08c]">{agent.role}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#9ec7a6]">
                    <span>{agent.mention}</span>
                    <span>{agent.isMain ? `${agent.xp} XP` : "specialist"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[#315a3d] bg-[#0d2015] px-3 py-2">
              <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Current Flow</p>
              <p className="font-ui mt-2 text-xs text-[#b7d7be]">
                {summary.recent_command ? `Recent: /${summary.recent_command}` : "Recent: none"}
              </p>
              <p className="font-ui mt-1 text-xs text-[#d0ffd9]">
                {summary.next_command ? `Next: ${summary.next_command}` : "Next command not set"}
              </p>
            </div>
          </aside>

          <div className="kd-panel flex min-h-[680px] flex-col p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-[#2f5f3a] bg-[#0f2617] px-3 py-1.5">
                <Users size={15} className="text-[#9ee49f]" />
                <span className="font-ui text-xs text-[#c9f4d1]">Live Transcript World</span>
              </div>
              <div className="font-ui flex items-center gap-2 text-xs text-[#96bea0]">
                <ChevronRight size={14} />
                {summary.current_stage ? `Stage: ${summary.current_stage}` : "Waiting for first command"}
              </div>
            </div>
            <div className="flex-1">
              <PixelObserver agents={agents} transcripts={transcripts} summary={summary} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Main XP</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{summary.xp.toLocaleString()}</p>
          </div>
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Swarm Size</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{agents.length}</p>
          </div>
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Transcript Lines</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{transcripts.length}</p>
          </div>
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Team XP View</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{totalXp.toLocaleString()}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
