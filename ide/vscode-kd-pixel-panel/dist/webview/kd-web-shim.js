(() => {
  if (typeof window === 'undefined') return;
  if (typeof window.acquireVsCodeApi === 'function') return;

  const POLL_INTERVAL_MS = 1200;
  const STATE_ENDPOINT = '/api/state';
  const LAYOUT_ENDPOINT = '/api/layout';
  const DEFAULT_LAYOUT_PATH = './assets/default-layout.json';
  const SOUND_KEY = 'kdPixel.web.soundEnabled';
  const LAYOUT_KEY = 'kdPixel.web.layout.v1';
  const AGENT_ID_MAP_KEY = 'kdPixel.web.agentIdByKey';
  const NEXT_AGENT_ID_KEY = 'kdPixel.web.nextAgentId';
  const AGENT_SEATS_KEY = 'kdPixel.web.agentSeats';

  let pollTimer = null;
  let initialized = false;
  let localState = null;
  let knownIds = new Set();
  const lastSignatureById = new Map();

  const agentIdByKey = safeParseJson(readStorage(AGENT_ID_MAP_KEY), {});
  let nextAgentId = Number.parseInt(readStorage(NEXT_AGENT_ID_KEY) || '1', 10);
  if (!Number.isFinite(nextAgentId) || nextAgentId < 1) nextAgentId = 1;

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore storage errors in private mode
    }
  }

  function safeParseJson(value, fallback) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function hash32(input) {
    const text = String(input || '');
    let h = 0;
    for (let i = 0; i < text.length; i += 1) {
      h = ((h << 5) - h) + text.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function dispatchToUi(message) {
    window.postMessage(message, '*');
  }

  function persistAgentMapping() {
    writeStorage(AGENT_ID_MAP_KEY, JSON.stringify(agentIdByKey));
    writeStorage(NEXT_AGENT_ID_KEY, String(nextAgentId));
  }

  function mapAgentId(agentKey) {
    const key = String(agentKey || '').trim() || 'unknown-agent';
    if (Number.isInteger(agentIdByKey[key])) {
      return agentIdByKey[key];
    }
    const id = nextAgentId++;
    agentIdByKey[key] = id;
    persistAgentMapping();
    return id;
  }

  function parseBool(raw, fallback) {
    if (raw == null) return fallback;
    const value = String(raw).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(value)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(value)) return false;
    return fallback;
  }

  function isWaitingAction(actionRaw) {
    const action = String(actionRaw || '').toLowerCase();
    return action.includes('wait') || action.includes('idle') || action.includes('done') || action.includes('complete');
  }

  function makeStatusText(agent) {
    const action = String(agent.last_action || 'working').trim() || 'working';
    const task = String(agent.last_task || '').trim();
    return task ? `${action}: ${task}` : action;
  }

  async function fetchJson(url, options) {
    try {
      const response = await window.fetch(url, {
        cache: 'no-store',
        ...options,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function resolveLayout() {
    const fromStorage = safeParseJson(readStorage(LAYOUT_KEY), null);
    if (fromStorage) return fromStorage;

    const fromApi = await fetchJson(LAYOUT_ENDPOINT);
    if (fromApi && typeof fromApi === 'object') return fromApi;

    const fallback = await fetchJson(DEFAULT_LAYOUT_PATH);
    if (fallback && typeof fallback === 'object') return fallback;
    return null;
  }

  async function sendLayout() {
    const layout = await resolveLayout();
    dispatchToUi({ type: 'layoutLoaded', layout });
  }

  async function saveLayout(layout) {
    if (!layout || typeof layout !== 'object') return;
    writeStorage(LAYOUT_KEY, JSON.stringify(layout));
    await fetchJson(LAYOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(layout),
    });
  }

  function ensureUiAgentState(agent) {
    const key = String(agent.id || agent.name || 'unknown-agent');
    const id = mapAgentId(key);
    return {
      key,
      id,
      name: String(agent.name || key),
      role: String(agent.role || 'Professional Agent'),
      source: String(agent.source || 'kd'),
      status: isWaitingAction(agent.last_action) ? 'waiting' : 'active',
      signature: [
        agent.last_ts || '',
        agent.last_action || '',
        agent.last_task || '',
        agent.last_message || '',
      ].join('|'),
      toolStatus: makeStatusText(agent),
    };
  }

  async function pollState() {
    const state = await fetchJson(STATE_ENDPOINT);
    if (!state || !Array.isArray(state.agents)) return;

    const uiAgents = state.agents.map((agent) => ensureUiAgentState(agent));
    const currentIds = new Set(uiAgents.map((agent) => agent.id));

    if (!initialized) {
      const agentMeta = {};
      const agentIdentity = {};
      const folderNames = {};
      for (const agent of uiAgents) {
        agentMeta[agent.id] = {
          palette: (agent.id - 1) % 6,
          hueShift: 0,
          seatId: null,
        };
        agentIdentity[agent.id] = {
          id: agent.key,
          name: agent.name,
          role: agent.role,
        };
        folderNames[agent.id] = agent.source;
      }
      dispatchToUi({
        type: 'existingAgents',
        agents: [...currentIds].sort((a, b) => a - b),
        agentMeta,
        agentIdentity,
        folderNames,
      });
      knownIds = currentIds;
      initialized = true;
    } else {
      for (const id of currentIds) {
        if (!knownIds.has(id)) {
          dispatchToUi({ type: 'agentCreated', id });
        }
      }
      for (const id of knownIds) {
        if (!currentIds.has(id)) {
          dispatchToUi({ type: 'agentClosed', id });
          lastSignatureById.delete(id);
        }
      }
      knownIds = currentIds;
    }

    for (const agent of uiAgents) {
      if (agent.signature && lastSignatureById.get(agent.id) !== agent.signature) {
        lastSignatureById.set(agent.id, agent.signature);
        dispatchToUi({ type: 'agentToolsClear', id: agent.id });
        dispatchToUi({
          type: 'agentToolStart',
          id: agent.id,
          toolId: `web-${hash32(agent.signature)}`,
          status: agent.toolStatus,
        });
      }
      dispatchToUi({ type: 'agentStatus', id: agent.id, status: agent.status });
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollState();
    pollTimer = setInterval(pollState, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function handleIncomingMessage(message) {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'webviewReady') {
      const soundEnabled = parseBool(readStorage(SOUND_KEY), true);
      dispatchToUi({ type: 'settingsLoaded', soundEnabled });
      dispatchToUi({ type: 'workspaceFolders', folders: [] });
      sendLayout();
      startPolling();
      return;
    }

    if (message.type === 'saveLayout') {
      saveLayout(message.layout);
      return;
    }

    if (message.type === 'saveAgentSeats') {
      writeStorage(AGENT_SEATS_KEY, JSON.stringify(message.seats || {}));
      return;
    }

    if (message.type === 'setSoundEnabled') {
      writeStorage(SOUND_KEY, String(Boolean(message.enabled)));
      return;
    }

    if (message.type === 'refresh') {
      pollState();
    }
  }

  const vscodeApi = {
    postMessage: handleIncomingMessage,
    setState(value) {
      localState = value;
      return value;
    },
    getState() {
      return localState;
    },
  };

  window.acquireVsCodeApi = () => vscodeApi;
  window.addEventListener('beforeunload', stopPolling);
})();
