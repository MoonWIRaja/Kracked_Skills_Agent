(() => {
  if (typeof window === 'undefined') return;

  const POLL_INTERVAL_MS = 1200;
  const STATE_ENDPOINT = '/api/state';
  const LAYOUT_ENDPOINT = '/api/layout';
  const DEFAULT_LAYOUT_PATH = './assets/default-layout.json';
  const SOUND_KEY = 'kdPixel.web.soundEnabled';
  const LAYOUT_KEY = 'kdPixel.web.layout.v2';
  const AGENT_ID_MAP_KEY = 'kdPixel.web.agentIdByKey';
  const NEXT_AGENT_ID_KEY = 'kdPixel.web.nextAgentId';
  const AGENT_SEATS_KEY = 'kdPixel.web.agentSeats';
  const ALPHA_THRESHOLD = 16;

  const hasNativeVscode = typeof window.acquireVsCodeApi === 'function';
  const nativeAcquire = hasNativeVscode ? window.acquireVsCodeApi.bind(window) : null;
  const nativeApi = hasNativeVscode ? nativeAcquire() : null;

  let pollTimer = null;
  let initialized = false;
  let localState = null;
  let knownIds = new Set();
  let visualAssetsSent = false;
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

  function componentToHex(value) {
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0').toUpperCase();
  }

  function rgbaToHex(r, g, b) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
  }

  function imageToSprite(ctx, sx, sy, width, height) {
    const data = ctx.getImageData(sx, sy, width, height).data;
    const sprite = [];
    let opaqueCount = 0;
    for (let y = 0; y < height; y += 1) {
      const row = [];
      for (let x = 0; x < width; x += 1) {
        const idx = ((y * width) + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < ALPHA_THRESHOLD) {
          row.push('');
        } else {
          opaqueCount += 1;
          row.push(rgbaToHex(r, g, b));
        }
      }
      sprite.push(row);
    }
    return { sprite, opaqueCount };
  }

  function makeCanvasFromImage(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d context unavailable');
    ctx.drawImage(image, 0, 0);
    return { canvas, ctx };
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`failed to load image: ${src}`));
      image.src = src;
    });
  }

  async function loadWallSprites() {
    const image = await loadImage('./assets/walls.png');
    const { ctx } = makeCanvasFromImage(image);
    const sprites = [];
    for (let mask = 0; mask < 16; mask += 1) {
      const sx = (mask % 4) * 16;
      const sy = Math.floor(mask / 4) * 32;
      sprites.push(imageToSprite(ctx, sx, sy, 16, 32).sprite);
    }
    return sprites;
  }

  async function loadCharacterSprites() {
    const characters = [];
    for (let i = 0; i < 6; i += 1) {
      const image = await loadImage(`./assets/characters/char_${i}.png`);
      const { ctx } = makeCanvasFromImage(image);
      const directions = { down: [], up: [], right: [] };
      const names = ['down', 'up', 'right'];
      for (let row = 0; row < 3; row += 1) {
        for (let frame = 0; frame < 7; frame += 1) {
          const sx = frame * 16;
          const sy = row * 32;
          directions[names[row]].push(imageToSprite(ctx, sx, sy, 16, 32).sprite);
        }
      }
      characters.push(directions);
    }
    return characters;
  }

  async function loadFloorSprites() {
    const candidatePaths = [
      './assets/office/Office Tileset All 16x16 no shadow.png',
      './assets/office/A2 Office Floors.png',
    ];

    for (const src of candidatePaths) {
      try {
        const image = await loadImage(src);
        const { ctx } = makeCanvasFromImage(image);
        const sprites = [];
        const cols = Math.floor(image.width / 16);
        const rows = Math.floor(image.height / 16);
        for (let y = 0; y < rows && sprites.length < 7; y += 1) {
          for (let x = 0; x < cols && sprites.length < 7; x += 1) {
            const tile = imageToSprite(ctx, x * 16, y * 16, 16, 16);
            if (tile.opaqueCount > 24) {
              sprites.push(tile.sprite);
            }
          }
        }
        if (sprites.length === 7) {
          return sprites;
        }
      } catch {
        // try next source
      }
    }
    return null;
  }

  function buildDefaultCatalogEntry(assetId) {
    return {
      id: assetId,
      name: assetId,
      label: assetId.replace(/_/g, ' '),
      category: 'decor',
      file: `generated/${assetId}.png`,
      width: 16,
      height: 16,
      footprintW: 1,
      footprintH: 1,
      isDesk: false,
      canPlaceOnWalls: false,
    };
  }

  async function loadFurnitureAssets() {
    const layout = await fetchJson(DEFAULT_LAYOUT_PATH);
    if (!layout || !Array.isArray(layout.furniture)) return null;

    const ids = [...new Set(layout.furniture
      .map((item) => item && item.type)
      .filter((value) => typeof value === 'string' && value.trim() !== ''))]
      .sort((a, b) => a.localeCompare(b));
    if (ids.length === 0) return null;

    const sheetPaths = [
      './assets/office/B-C-D-E Office 1 No Shadows.png',
      './assets/office/B-C-D-E Office 2 No Shadows.png',
      './assets/office/Office Tileset All 16x16 no shadow.png',
    ];

    const tiles = [];
    for (const src of sheetPaths) {
      try {
        const image = await loadImage(src);
        const { ctx } = makeCanvasFromImage(image);
        const cols = Math.floor(image.width / 16);
        const rows = Math.floor(image.height / 16);
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const tile = imageToSprite(ctx, x * 16, y * 16, 16, 16);
            if (tile.opaqueCount > 24) {
              tiles.push(tile.sprite);
            }
          }
        }
      } catch {
        // try next source
      }
    }

    if (tiles.length === 0) return null;

    const catalog = [];
    const sprites = {};
    for (let i = 0; i < ids.length; i += 1) {
      const assetId = ids[i];
      catalog.push(buildDefaultCatalogEntry(assetId));
      sprites[assetId] = tiles[i % tiles.length];
    }

    return { catalog, sprites };
  }

  async function sendVisualAssets() {
    if (visualAssetsSent) return;
    visualAssetsSent = true;

    try {
      const [wallSprites, characterSprites, floorSprites, furnitureAssets] = await Promise.all([
        loadWallSprites().catch(() => null),
        loadCharacterSprites().catch(() => null),
        loadFloorSprites().catch(() => null),
        loadFurnitureAssets().catch(() => null),
      ]);

      if (characterSprites && characterSprites.length > 0) {
        dispatchToUi({ type: 'characterSpritesLoaded', characters: characterSprites });
      }
      if (wallSprites && wallSprites.length > 0) {
        dispatchToUi({ type: 'wallTilesLoaded', sprites: wallSprites });
      }
      if (floorSprites && floorSprites.length > 0) {
        dispatchToUi({ type: 'floorTilesLoaded', sprites: floorSprites });
      }
      if (furnitureAssets && furnitureAssets.catalog.length > 0) {
        dispatchToUi({
          type: 'furnitureAssetsLoaded',
          catalog: furnitureAssets.catalog,
          sprites: furnitureAssets.sprites,
        });
      }
    } catch {
      // keep panel functional even when some assets fail
    }
  }

  function handleIncomingMessage(message, fromNativeBridge = false) {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'webviewReady') {
      sendVisualAssets();

      if (hasNativeVscode && fromNativeBridge) {
        return;
      }

      const soundEnabled = parseBool(readStorage(SOUND_KEY), true);
      dispatchToUi({ type: 'settingsLoaded', soundEnabled });
      dispatchToUi({ type: 'workspaceFolders', folders: [] });
      sendLayout();
      startPolling();
      return;
    }

    if (hasNativeVscode && fromNativeBridge) {
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

  if (hasNativeVscode) {
    const proxiedApi = {
      postMessage(message) {
        handleIncomingMessage(message, true);
        return nativeApi.postMessage(message);
      },
      setState(value) {
        return typeof nativeApi.setState === 'function' ? nativeApi.setState(value) : value;
      },
      getState() {
        return typeof nativeApi.getState === 'function' ? nativeApi.getState() : undefined;
      },
    };

    window.acquireVsCodeApi = () => proxiedApi;
  } else {
    const shimApi = {
      postMessage(message) {
        handleIncomingMessage(message, false);
      },
      setState(value) {
        localState = value;
        return value;
      },
      getState() {
        return localState;
      },
    };
    window.acquireVsCodeApi = () => shimApi;
    window.addEventListener('beforeunload', stopPolling);
  }
})();
