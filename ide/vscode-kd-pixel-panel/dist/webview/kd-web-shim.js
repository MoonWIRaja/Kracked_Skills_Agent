(() => {
  if (typeof window === 'undefined') return;

  const POLL_INTERVAL_MS = 1200;
  const STATE_ENDPOINT = '/api/state';
  const LAYOUT_ENDPOINT = '/api/layout';
  const SOUND_KEY = 'kdPixel.web.soundEnabled';
  const LAYOUT_KEY = 'kdPixel.web.layout.v5';
  const AGENT_ID_MAP_KEY = 'kdPixel.web.agentIdByKey';
  const NEXT_AGENT_ID_KEY = 'kdPixel.web.nextAgentId';
  const AGENT_SEATS_KEY = 'kdPixel.web.agentSeats';
  const ALPHA_THRESHOLD = 16;
  const DEFAULT_TILE_SIZE = 16;
  const FURNITURE_CATEGORIES = ['desks', 'chairs', 'storage', 'electronics', 'decor', 'wall', 'misc'];

  const hasNativeVscode = typeof window.acquireVsCodeApi === 'function';
  const nativeAcquire = hasNativeVscode ? window.acquireVsCodeApi.bind(window) : null;
  const nativeApi = hasNativeVscode ? nativeAcquire() : null;
  const KD_DIST_BASE = typeof window.__KD_DIST_BASE__ === 'string' && window.__KD_DIST_BASE__.trim()
    ? window.__KD_DIST_BASE__.trim()
    : '.';
  const KD_ASSET_BASE = typeof window.__KD_ASSET_BASE__ === 'string' && window.__KD_ASSET_BASE__.trim()
    ? window.__KD_ASSET_BASE__.trim()
    : joinBase(KD_DIST_BASE, 'assets');
  const DEFAULT_LAYOUT_PATH = assetUrl('default-layout.json');

  let pollTimer = null;
  let initialized = false;
  let localState = null;
  let knownIds = new Set();
  let visualAssetsSent = false;
  const lastSignatureById = new Map();

  function joinBase(base, relPath) {
    const cleanBase = String(base || '').replace(/\/+$/, '');
    const cleanRel = String(relPath || '').replace(/^\/+/, '');
    return cleanRel ? `${cleanBase}/${cleanRel}` : cleanBase;
  }

  function assetUrl(relPath) {
    return joinBase(KD_ASSET_BASE, relPath);
  }

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
    const colorSet = new Set();
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
          const hex = rgbaToHex(r, g, b);
          row.push(hex);
          if (colorSet.size < 48) colorSet.add(hex);
        }
      }
      sprite.push(row);
    }
    return { sprite, opaqueCount, uniqueColors: colorSet.size };
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

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`failed to load image: ${src}`));
      image.src = src;
    });
  }

  async function loadImage(src) {
    try {
      const response = await window.fetch(src, { cache: 'no-store' });
      if (!response.ok) throw new Error(`fetch ${src} -> ${response.status}`);
      const blob = await response.blob();
      if (typeof window.createImageBitmap === 'function') {
        return await window.createImageBitmap(blob);
      }
      const blobUrl = URL.createObjectURL(blob);
      try {
        return await loadImageElement(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      return loadImageElement(src);
    }
  }

  async function loadOfficeSpritePack() {
    const pack = await fetchJson(assetUrl('office-sprite-pack.json'));
    if (!pack || typeof pack !== 'object') return null;

    const floorSprites = Array.isArray(pack.floorSprites) ? pack.floorSprites : [];
    const wallSprites = Array.isArray(pack.wallSprites) ? pack.wallSprites : [];
    const furniture = pack.furniture && typeof pack.furniture === 'object' ? pack.furniture : null;
    const catalog = furniture && Array.isArray(furniture.catalog) ? furniture.catalog : [];
    const sprites = furniture && furniture.sprites && typeof furniture.sprites === 'object'
      ? furniture.sprites
      : {};

    return { floorSprites, wallSprites, catalog, sprites };
  }

  function parseAssetNumbers(assetId) {
    const matches = String(assetId || '').match(/\d+/g);
    if (!matches) return [];
    return matches.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isFinite(value));
  }

  function assetNumericSignature(assetId) {
    const numbers = parseAssetNumbers(assetId);
    if (numbers.length === 0) return hash32(assetId);
    let signature = 0;
    for (let i = 0; i < numbers.length; i += 1) {
      signature = (signature * 131 + (numbers[i] * (i + 1))) >>> 0;
    }
    return signature;
  }

  function firstAssetNumber(assetId) {
    const numbers = parseAssetNumbers(assetId);
    return numbers.length > 0 ? numbers[0] : -1;
  }

  function categoryForAsset(assetId) {
    const n = firstAssetNumber(assetId);
    if ([18, 72, 106, 109, 139, 140, 141, 142, 143].includes(n)) return 'storage';
    if ([33, 34, 41, 42, 49, 61, 83, 84, 90].includes(n)) return 'chairs';
    if ([7, 44, 99, 100, 101, 102, 111, 112, 123].includes(n)) return 'electronics';
    if ([17, 27, 40, 51, 110].includes(n)) return 'desks';
    if (n >= 0) return FURNITURE_CATEGORIES[n % FURNITURE_CATEGORIES.length];
    return 'misc';
  }

  function labelForAsset(assetId) {
    return String(assetId || 'Asset')
      .replace(/^ASSET_NEW_/i, 'Asset ')
      .replace(/^ASSET_/i, 'Asset ')
      .replace(/_/g, ' ')
      .trim();
  }

  function footprintForAsset(assetId) {
    const n = firstAssetNumber(assetId);
    if ([17, 40, 51, 109, 110].includes(n)) return { width: 2, height: 2 };
    if ([18, 72, 106, 139, 140, 141, 142, 143].includes(n)) return { width: 1, height: 2 };
    if ([100, 101, 102].includes(n)) return { width: 2, height: 1 };
    return { width: 1, height: 1 };
  }

  function isLikelyFurnitureTile(tile) {
    if (!tile) return false;
    if (tile.opaqueCount < 18) return false;
    if (tile.uniqueColors < 2) return false;
    if (tile.opaqueCount > 245 && tile.uniqueColors < 4) return false;
    return true;
  }

  async function buildFurnitureTilePool() {
    const sheetPaths = [
      assetUrl('office/B-C-D-E Office 1 No Shadows.png'),
      assetUrl('office/B-C-D-E Office 2 No Shadows.png'),
      assetUrl('office/Office Tileset All 16x16 no shadow.png'),
    ];

    const pool = [];
    for (let sheetIndex = 0; sheetIndex < sheetPaths.length; sheetIndex += 1) {
      const src = sheetPaths[sheetIndex];
      try {
        const image = await loadImage(src);
        const { ctx } = makeCanvasFromImage(image);
        const cols = Math.floor(image.width / DEFAULT_TILE_SIZE);
        const rows = Math.floor(image.height / DEFAULT_TILE_SIZE);

        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const tile = imageToSprite(
              ctx,
              x * DEFAULT_TILE_SIZE,
              y * DEFAULT_TILE_SIZE,
              DEFAULT_TILE_SIZE,
              DEFAULT_TILE_SIZE,
            );
            if (!isLikelyFurnitureTile(tile)) continue;
            pool.push({
              sheetIndex,
              x,
              y,
              sprite: tile.sprite,
              opaqueCount: tile.opaqueCount,
              uniqueColors: tile.uniqueColors,
            });
          }
        }
      } catch {
        // Continue with other sheets.
      }
    }
    return pool;
  }

  function buildCatalogEntry(assetId, category, footprint) {
    return {
      id: assetId,
      name: assetId,
      label: labelForAsset(assetId),
      category,
      file: `office://${assetId}.png`,
      width: footprint.width * DEFAULT_TILE_SIZE,
      height: footprint.height * DEFAULT_TILE_SIZE,
      footprintW: footprint.width,
      footprintH: footprint.height,
      isDesk: category === 'desks',
      canPlaceOnWalls: category === 'wall',
      canPlaceOnSurfaces: category === 'electronics' || category === 'decor',
      backgroundTiles: 0,
    };
  }

  function pickSpriteForAsset(assetId, tilePool) {
    if (!tilePool || tilePool.length === 0) return null;
    const sig = assetNumericSignature(assetId);
    return tilePool[sig % tilePool.length].sprite;
  }

  async function loadFurnitureAssets() {
    const pack = await loadOfficeSpritePack();
    if (!pack) return null;
    if (!Array.isArray(pack.catalog) || pack.catalog.length === 0) return null;
    return { catalog: pack.catalog, sprites: pack.sprites || {} };
  }

  async function sendVisualAssets(force = false) {
    if (visualAssetsSent && !force) return;
    visualAssetsSent = true;

    const pack = await loadOfficeSpritePack().catch(() => null);
    if (pack) {
      if (Array.isArray(pack.wallSprites) && pack.wallSprites.length > 0) {
        dispatchToUi({ type: 'wallTilesLoaded', sprites: pack.wallSprites });
      }
      if (Array.isArray(pack.floorSprites) && pack.floorSprites.length > 0) {
        dispatchToUi({ type: 'floorTilesLoaded', sprites: pack.floorSprites });
      }
      if (Array.isArray(pack.catalog) && pack.catalog.length > 0) {
        dispatchToUi({
          type: 'furnitureAssetsLoaded',
          catalog: pack.catalog,
          sprites: pack.sprites || {},
        });
      }
    }
  }

  function triggerVisualAssetsSync() {
    // Immediate send plus delayed resend to avoid race with UI listeners.
    setTimeout(() => sendVisualAssets(false), 0);
    setTimeout(() => sendVisualAssets(true), 900);
  }

  function handleIncomingMessage(message, fromNativeBridge = false) {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'webviewReady') {
      triggerVisualAssetsSync();

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
        const isReadyMsg = message && typeof message === 'object' && message.type === 'webviewReady';
        handleIncomingMessage(message, true);
        if (isReadyMsg) {
          setTimeout(() => nativeApi.postMessage(message), 80);
          return true;
        }
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
