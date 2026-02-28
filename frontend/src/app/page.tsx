"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Bug,
  ChevronRight,
  Cpu,
  Rocket,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import PixelObserver, { ObserverAgent } from "@/components/PixelObserver";

type ConnectionState = "connecting" | "connected" | "offline";

interface ApiAgent {
  id: string;
  name: string;
  role: string;
  level: number;
  xp: number;
}

interface DisplayAgent extends ObserverAgent {
  level: number;
  xp: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_KD_BACKEND_URL ?? "http://localhost:4891";
const RANDOM_NAME_POOL = [
  "Denial",
  "Adam",
  "Akmal",
  "Amad",
  "Kaizer",
  "Matnep",
  "Aizad",
  "Kito",
  "Iquzo",
  "Naim",
  "Moon",
  "Qih",
  "Hakim",
  "Faris",
  "Iman",
];

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
  if (key.includes("devops")) return "#7ec2ff";
  if (key.includes("release")) return "#ffc07a";
  return "#b8d5c0";
}

function isMainRole(role: string): boolean {
  return toRoleKey(role).includes("master");
}

function roleIcon(role: string) {
  const key = toRoleKey(role);
  if (key.includes("master")) return <Cpu size={16} className="text-[#7ef29a]" />;
  if (key.includes("analyst")) return <Search size={16} className="text-[#ffe082]" />;
  if (key.includes("security")) return <ShieldCheck size={16} className="text-[#ff7d7d]" />;
  if (key === "qa" || key.includes("quality")) return <Bug size={16} className="text-[#f4ffa9]" />;
  if (key.includes("devops") || key.includes("release")) return <Rocket size={16} className="text-[#ffc07a]" />;
  if (key.includes("engineer")) return <Wrench size={16} className="text-[#a4f0ff]" />;
  return <Bot size={16} className="text-[#a4f0ff]" />;
}

function shuffle(items: string[]): string[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cloned[i];
    cloned[i] = cloned[j];
    cloned[j] = temp;
  }
  return cloned;
}

function buildFallbackAgents(): DisplayAgent[] {
  const roles = [
    { id: "main-agent", role: "Master Agent" },
    { id: "analyst-agent", role: "Analyst" },
    { id: "pm-agent", role: "Product Manager" },
    { id: "architect-agent", role: "Architect" },
    { id: "engineer-agent", role: "Engineer" },
    { id: "security-agent", role: "Security" },
  ];

  const names = shuffle(RANDOM_NAME_POOL).slice(0, roles.length);
  return roles.map((role, index) => ({
    id: role.id,
    name: names[index],
    role: role.role,
    level: index === 0 ? 5 : 2 + (index % 3),
    xp: index === 0 ? 1240 : 180 + index * 75,
    color: roleColor(role.role),
    isMain: role.id === "main-agent",
  }));
}

function mapApiAgent(agent: ApiAgent): DisplayAgent {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    level: Number(agent.level) || 1,
    xp: Number(agent.xp) || 0,
    color: roleColor(agent.role),
    isMain: isMainRole(agent.role) || agent.id === "main-agent",
  };
}

export default function Home() {
  const [agents, setAgents] = useState<DisplayAgent[]>([]);
  const [status, setStatus] = useState<ConnectionState>("connecting");

  const fallbackAgents = useMemo(() => buildFallbackAgents(), []);
  const displayAgents = agents.length > 0 ? agents : fallbackAgents;
  const mainAgent = displayAgents.find((agent) => agent.isMain) || displayAgents[0];
  const totalXp = displayAgents.reduce((total, agent) => total + agent.xp, 0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const healthResponse = await fetch(`${BACKEND_URL}/api/health`, { signal: controller.signal });
        if (!healthResponse.ok) throw new Error(`Health check failed: ${healthResponse.status}`);
        setStatus("connected");

        const agentsResponse = await fetch(`${BACKEND_URL}/api/agents`, { signal: controller.signal });
        if (!agentsResponse.ok) throw new Error(`Agent query failed: ${agentsResponse.status}`);

        const payload = await agentsResponse.json();
        if (payload && Array.isArray(payload.agents)) {
          setAgents(payload.agents.map(mapApiAgent));
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("offline");
          setAgents([]);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-kd-stage px-4 py-6 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#21452f_0%,rgba(5,10,8,0)_56%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="kd-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-arcade text-[10px] uppercase tracking-[0.24em] text-[#9ee49f]">Kracked Skills Agent</p>
            <h1 className="font-ui mt-2 text-2xl font-bold text-[#e2ffe7]">Pixel Mission Console</h1>
            <p className="font-ui mt-1 text-sm text-[#84ad8e]">
              Main Agent: <span className="font-semibold text-[#c9ffd2]">{mainAgent?.name ?? "N/A"}</span>
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
                {displayAgents.length} Online
              </span>
            </div>

            <div className="custom-scrollbar max-h-[510px] space-y-2 overflow-y-auto pr-1">
              {displayAgents.map((agent) => (
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
                    <span>LV {agent.level}</span>
                    <span>{agent.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[#315a3d] bg-[#0d2015] px-3 py-2">
              <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">IDE Note</p>
              <p className="font-ui mt-2 text-xs text-[#b7d7be]">
                Some IDEs do not show slash-command suggestions automatically. You can still run KD by typing commands manually like
                <span className="ml-1 rounded bg-[#183226] px-1 py-0.5 text-[#d0ffd9]">/kd</span>.
              </p>
            </div>
          </aside>

          <div className="kd-panel flex min-h-[680px] flex-col p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-[#2f5f3a] bg-[#0f2617] px-3 py-1.5">
                <Users size={15} className="text-[#9ee49f]" />
                <span className="font-ui text-xs text-[#c9f4d1]">KD RPG World</span>
              </div>
              <div className="font-ui flex items-center gap-2 text-xs text-[#96bea0]">
                <ChevronRight size={14} />
                Multi-zone map: Guild, Dark Ops, Wild Frontier
              </div>
            </div>
            <div className="flex-1">
              <PixelObserver agents={displayAgents} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Total XP</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{totalXp.toLocaleString()}</p>
          </div>
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Main Agent</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{mainAgent?.name ?? "N/A"}</p>
          </div>
          <div className="kd-panel px-4 py-3">
            <p className="font-arcade text-[10px] uppercase tracking-[0.2em] text-[#9ee49f]">Swarm Size</p>
            <p className="font-ui mt-2 text-2xl font-bold text-[#e8ffec]">{displayAgents.length}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
