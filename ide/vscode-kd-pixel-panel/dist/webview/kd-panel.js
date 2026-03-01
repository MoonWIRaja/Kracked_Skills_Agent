(() => {
  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  function normalizeInjectedValue(value, fallback = null) {
    if (typeof value !== 'string') return fallback;
    const raw = value.trim();
    if (!raw) return fallback;
    if (/^__KD_[A-Z0-9_]+__$/.test(raw)) return fallback;
    return raw;
  }

  const DIST_BASE = normalizeInjectedValue(
    (typeof window !== 'undefined' ? window.__KD_WEBVIEW_DIST_BASE__ : null),
    '.'
  );
  const ASSET_BASE = normalizeInjectedValue(
    (typeof window !== 'undefined' ? window.__KD_WEBVIEW_ASSET_BASE__ : null),
    './kd-asset-pack'
  );
  const CATALOG_URI = normalizeInjectedValue(
    (typeof window !== 'undefined' ? window.__KD_WEBVIEW_CATALOG__ : null),
    null
  );
  const MANIFEST_URI = normalizeInjectedValue(
    (typeof window !== 'undefined' ? window.__KD_WEBVIEW_MANIFEST__ : null),
    null
  );

  const canvas = document.getElementById('kdCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const zoomInButton = document.getElementById('zoomIn');
  const zoomOutButton = document.getElementById('zoomOut');

  const statusEl = document.getElementById('kdStatus');
  const agentsEl = document.getElementById('kdAgents');
  const assetsEl = document.getElementById('kdAssets');
  const updatedEl = document.getElementById('kdUpdated');
  const agentListEl = document.getElementById('kdAgentList');
  const eventListEl = document.getElementById('kdEventList');
  const layoutPanelEl = document.getElementById('kdLayoutPanel');
  const layoutModeButtons = [...document.querySelectorAll('[data-layout-mode]')];
  const furnitureCategoryEl = document.getElementById('kdFurnitureCategory');
  const furnitureSelectEl = document.getElementById('kdFurnitureSelect');
  const layoutResetEl = document.getElementById('kdLayoutReset');
  const layoutHintEl = document.getElementById('kdLayoutHint');

  const TILE = 16;
  const WORLD_COLS = 52;
  const WORLD_ROWS = 32;

  const TILE_VOID = 0;
  const TILE_FLOOR_MAIN = 1;
  const TILE_FLOOR_MEETING = 2;
  const TILE_FLOOR_OPS = 3;
  const TILE_FLOOR_LOUNGE = 4;
  const TILE_WALL = 5;
  const TILE_OUTDOOR = 6;
  const TILE_WATER = 7;
  const LAYOUT_STORAGE_KEY = 'kdPixel.customLayout.v1';

  const WORLD = {
    cols: WORLD_COLS,
    rows: WORLD_ROWS,
    tiles: new Array(WORLD_COLS * WORLD_ROWS).fill(TILE_VOID),
    baseTiles: new Array(WORLD_COLS * WORLD_ROWS).fill(TILE_VOID),
    propSlots: [],
    userFurniture: [],
  };

  const state = {
    zoom: 2.8,
    catalog: null,
    pools: {
      floors: [],
      walls: [],
      outdoor: [],
      water: [],
      decor: [],
    },
    props: [],
    propsByPath: new Map(),
    furnitureByCategory: {
      all: [],
      desk: [],
      chair: [],
      storage: [],
      tech: [],
      decor: [],
      nature: [],
    },
    characterSheets: [],
    roleSprites: {},
    themeTiles: {
      main: [],
      meeting: [],
      ops: [],
      lounge: [],
      wall: [],
      outdoor: [],
      water: [],
    },
    agents: new Map(),
    events: [],
    usingWebPoll: !vscode,
    loadedAssets: 0,
    lastUpdate: null,
    ready: false,
    editor: {
      mode: 'floor',
      furnitureCategory: 'all',
      selectedFurniturePath: null,
      painting: false,
      saveTimer: null,
    },
  };

  const CHARACTER_DEFS = {
    citizen1: { walk: 'Citizen1_Walk.png', idle: 'Citizen1_Idle.png', walkCols: 6, idleCols: 8, walkRows: 4, idleRows: 4 },
    citizen2: { walk: 'Citizen2_Walk.png', idle: 'Citizen2_Idle.png', walkCols: 6, idleCols: 8, walkRows: 4, idleRows: 4 },
    fighter2: { walk: 'Fighter2_Walk.png', idle: 'Fighter2_Idle.png', walkCols: 6, idleCols: 8, walkRows: 4, idleRows: 4 },
    mage1: { walk: 'Mage1.png', idle: 'Mage1.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
    mage2: { walk: 'Mage2.png', idle: 'Mage2.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
    mage3: { walk: 'Mage3.png', idle: 'Mage3.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
    mage4: { walk: 'Mage4.png', idle: 'Mage4.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
    swordsman: {
      walk: 'Swordsman_lvl1_Walk_with_shadow.png',
      idle: 'Swordsman_lvl1_Idle_with_shadow.png',
      walkCols: 6, idleCols: 9, walkRows: 4, idleRows: 4,
    },
    guildmaster: { walk: 'Guildmaster.png', idle: 'Guildmaster.png', walkCols: 7, idleCols: 7, walkRows: 1, idleRows: 1 },
    reader1: { walk: 'Reader1.png', idle: 'Reader1.png', walkCols: 9, idleCols: 9, walkRows: 1, idleRows: 1 },
    reader2: { walk: 'Reader2.png', idle: 'Reader2.png', walkCols: 9, idleCols: 9, walkRows: 1, idleRows: 1 },
  };

  const ROLE_TO_CHARACTER = {
    'main-agent': 'citizen1',
    main: 'citizen1',
    master: 'citizen1',
    'master-agent': 'citizen1',
    'product-manager': 'citizen2',
    pm: 'citizen2',
    engineer: 'mage1',
    'tech-lead': 'mage1',
    developer: 'mage2',
    coder: 'mage2',
    analyst: 'mage3',
    architect: 'mage3',
    designer: 'mage4',
    ui: 'mage4',
    qa: 'swordsman',
    quality: 'swordsman',
    tester: 'swordsman',
    security: 'fighter2',
    guard: 'fighter2',
    devops: 'fighter2',
    ops: 'fighter2',
    'release-manager': 'guildmaster',
    release: 'guildmaster',
    manager: 'guildmaster',
    researcher: 'reader1',
    reader: 'reader1',
    writer: 'reader2',
    docs: 'reader2',
  };

  const imageCache = new Map();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function hashString(text) {
    let h = 2166136261;
    const raw = String(text || '');
    for (let i = 0; i < raw.length; i += 1) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickDeterministic(arr, seedA, seedB, seedC = 0) {
    if (!arr || arr.length === 0) return null;
    const n = hashString(`${seedA}|${seedB}|${seedC}`) % arr.length;
    return arr[n];
  }

  function nowTime() {
    return new Date().toISOString().slice(11, 19);
  }

  function pushEvent(title, meta) {
    state.events.unshift({ title, meta, ts: nowTime() });
    if (state.events.length > 48) state.events = state.events.slice(0, 48);
  }

  function setStatus(text, type) {
    statusEl.textContent = text;
    if (type === 'ok') {
      statusEl.style.color = '#87f6b6';
      return;
    }
    if (type === 'warn') {
      statusEl.style.color = '#ffd27d';
      return;
    }
    if (type === 'error') {
      statusEl.style.color = '#ff8f8f';
      return;
    }
    statusEl.style.color = '#9db1d8';
  }

  function fitCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.max(720, Math.floor(rect.width));
    canvas.height = Math.max(440, Math.floor(rect.height));
  }

  function getWorldTransform() {
    const worldWidth = WORLD.cols * TILE * state.zoom;
    const worldHeight = WORLD.rows * TILE * state.zoom;
    const offsetX = Math.floor((canvas.width - worldWidth) / 2);
    const offsetY = Math.floor((canvas.height - worldHeight) / 2);
    return { worldWidth, worldHeight, offsetX, offsetY };
  }

  function screenToTile(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { offsetX, offsetY, worldWidth, worldHeight } = getWorldTransform();
    if (px < offsetX || py < offsetY || px >= (offsetX + worldWidth) || py >= (offsetY + worldHeight)) {
      return null;
    }
    const worldX = (px - offsetX) / state.zoom;
    const worldY = (py - offsetY) / state.zoom;
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    if (tx < 0 || ty < 0 || tx >= WORLD.cols || ty >= WORLD.rows) return null;
    return { x: tx, y: ty };
  }

  function mapIndex(x, y) {
    return y * WORLD.cols + x;
  }

  function setTile(x, y, tileType) {
    if (x < 0 || y < 0 || x >= WORLD.cols || y >= WORLD.rows) return;
    WORLD.tiles[mapIndex(x, y)] = tileType;
  }

  function getTile(x, y) {
    if (x < 0 || y < 0 || x >= WORLD.cols || y >= WORLD.rows) return TILE_VOID;
    return WORLD.tiles[mapIndex(x, y)];
  }

  function fillRect(x1, y1, x2, y2, tileType) {
    for (let y = y1; y <= y2; y += 1) {
      for (let x = x1; x <= x2; x += 1) {
        setTile(x, y, tileType);
      }
    }
  }

  function drawBorder(x1, y1, x2, y2, tileType) {
    for (let x = x1; x <= x2; x += 1) {
      setTile(x, y1, tileType);
      setTile(x, y2, tileType);
    }
    for (let y = y1; y <= y2; y += 1) {
      setTile(x1, y, tileType);
      setTile(x2, y, tileType);
    }
  }

  function punchDoor(x, y) {
    const candidates = [
      [x, y],
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [cx, cy] of candidates) {
      if (cx < 0 || cy < 0 || cx >= WORLD.cols || cy >= WORLD.rows) continue;
      if (getTile(cx, cy) === TILE_WALL) {
        setTile(cx, cy, TILE_FLOOR_MAIN);
      }
    }
  }

  function buildWorldLayout() {
    WORLD.propSlots = [];

    // Background/outdoor area.
    fillRect(0, 0, WORLD.cols - 1, WORLD.rows - 1, TILE_OUTDOOR);

    // Building shell and room layout.
    fillRect(20, 2, 33, 10, TILE_FLOOR_MEETING);
    fillRect(14, 11, 33, 29, TILE_FLOOR_MAIN);
    fillRect(34, 11, 47, 19, TILE_FLOOR_OPS);
    fillRect(34, 20, 47, 29, TILE_FLOOR_LOUNGE);
    fillRect(26, 10, 27, 20, TILE_FLOOR_MAIN);
    fillRect(24, 18, 33, 20, TILE_FLOOR_MAIN);

    // Water patch outside building for visual depth.
    fillRect(38, 24, 49, 31, TILE_WATER);

    // Room walls.
    drawBorder(20, 2, 33, 10, TILE_WALL);
    drawBorder(14, 11, 33, 29, TILE_WALL);
    drawBorder(34, 11, 47, 19, TILE_WALL);
    drawBorder(34, 20, 47, 29, TILE_WALL);

    // Connectors/doors.
    punchDoor(26, 10);
    punchDoor(27, 10);
    punchDoor(33, 15);
    punchDoor(34, 15);
    punchDoor(33, 23);
    punchDoor(34, 23);
    punchDoor(24, 18);

    // Decorative prop anchor points.
    const slots = [
      { x: 23, y: 5, group: 'meeting' },
      { x: 26, y: 5, group: 'meeting' },
      { x: 30, y: 5, group: 'meeting' },
      { x: 22, y: 13, group: 'workspace' },
      { x: 28, y: 13, group: 'workspace' },
      { x: 18, y: 16, group: 'workspace' },
      { x: 24, y: 16, group: 'workspace' },
      { x: 30, y: 16, group: 'workspace' },
      { x: 18, y: 21, group: 'workspace' },
      { x: 24, y: 21, group: 'workspace' },
      { x: 30, y: 21, group: 'workspace' },
      { x: 18, y: 26, group: 'workspace' },
      { x: 24, y: 26, group: 'workspace' },
      { x: 30, y: 26, group: 'workspace' },
      { x: 38, y: 13, group: 'ops' },
      { x: 42, y: 13, group: 'ops' },
      { x: 45, y: 13, group: 'ops' },
      { x: 37, y: 17, group: 'ops' },
      { x: 42, y: 17, group: 'ops' },
      { x: 45, y: 17, group: 'ops' },
      { x: 37, y: 22, group: 'lounge' },
      { x: 42, y: 22, group: 'lounge' },
      { x: 45, y: 22, group: 'lounge' },
      { x: 37, y: 26, group: 'lounge' },
      { x: 42, y: 26, group: 'lounge' },
      { x: 45, y: 26, group: 'lounge' },
      { x: 15, y: 30, group: 'outdoor' },
      { x: 19, y: 30, group: 'outdoor' },
      { x: 24, y: 30, group: 'outdoor' },
      { x: 30, y: 30, group: 'outdoor' },
      { x: 46, y: 30, group: 'outdoor' },
    ];

    WORLD.propSlots = slots;
    WORLD.baseTiles = WORLD.tiles.slice();
    WORLD.userFurniture = [];
  }

  function roleLane(roleRaw) {
    const role = String(roleRaw || '').toLowerCase();

    if (role.includes('master') || role.includes('main')) {
      return [[26, 15], [27, 17], [25, 19], [29, 18]];
    }
    if (role.includes('analyst') || role.includes('product') || role.includes('architect')) {
      return [[23, 5], [26, 5], [30, 6], [24, 8], [29, 8]];
    }
    if (role.includes('engineer') || role.includes('tech lead')) {
      return [[18, 14], [24, 14], [30, 14], [18, 21], [24, 21], [30, 21], [24, 27]];
    }
    if (role === 'qa' || role.includes('quality') || role.includes('security')) {
      return [[37, 13], [42, 13], [45, 13], [37, 17], [42, 17], [45, 17]];
    }
    if (role.includes('devops') || role.includes('release')) {
      return [[37, 22], [42, 22], [45, 22], [37, 26], [42, 26], [45, 26]];
    }

    return [[26, 16], [24, 18], [30, 18], [27, 24]];
  }

  function randomFrom(list, fallback = null) {
    if (!Array.isArray(list) || list.length === 0) return fallback;
    return list[Math.floor(Math.random() * list.length)];
  }

  function resolveTilePool(tileType) {
    if (tileType === TILE_WALL) return state.pools.walls;
    if (tileType === TILE_WATER) return state.pools.water.length ? state.pools.water : state.pools.outdoor;
    if (tileType === TILE_OUTDOOR) return state.pools.outdoor.length ? state.pools.outdoor : state.pools.floors;
    return state.pools.floors;
  }

  function inHueRange(h, min, max) {
    if (!Number.isFinite(h)) return false;
    if (min <= max) return h >= min && h <= max;
    return h >= min || h <= max;
  }

  function rankTileCandidates(cells, matcher) {
    const list = Array.isArray(cells) ? cells : [];
    return list
      .map((cell) => {
        const stats = cell && cell.stats ? cell.stats : {};
        const base = Number(matcher(stats, cell) || 0);
        const edge = Number(stats.edgeOpaqueRatio || 0);
        const opaque = Number(stats.opaqueRatio || 0);
        const bonus = (edge * 0.3) + (opaque * 0.2);
        return { cell, score: base + bonus };
      })
      .filter((entry) => entry.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.cell);
  }

  function buildThemePool(candidates, matcher, limit, fallback) {
    const scored = rankTileCandidates(candidates, matcher);
    if (scored.length >= 4) return scored.slice(0, limit);
    if (Array.isArray(fallback) && fallback.length > 0) return fallback.slice(0, Math.max(1, limit));
    return scored.slice(0, Math.max(1, limit));
  }

  function buildThemeTiles() {
    const floors = Array.isArray(state.pools.floors) ? state.pools.floors : [];
    const walls = Array.isArray(state.pools.walls) ? state.pools.walls : [];
    const outdoor = Array.isArray(state.pools.outdoor) ? state.pools.outdoor : [];
    const water = Array.isArray(state.pools.water) ? state.pools.water : [];
    const floorWall = [...floors, ...walls];
    const outdoorFloor = [...outdoor, ...floors];

    state.themeTiles.main = buildThemePool(
      floors,
      (s) => (inHueRange(s.hue, 10, 55) ? 1 : 0) + (s.sat > 0.12 ? 0.8 : 0) + (s.lum > 0.2 && s.lum < 0.65 ? 0.4 : 0),
      28,
      floors
    );

    state.themeTiles.meeting = buildThemePool(
      floors,
      (s) => (inHueRange(s.hue, 8, 48) ? 1 : 0) + (s.sat > 0.14 ? 0.6 : 0) + (s.lum < 0.48 ? 0.6 : 0),
      24,
      state.themeTiles.main.length ? state.themeTiles.main : floors
    );

    state.themeTiles.ops = buildThemePool(
      floorWall,
      (s) => ((inHueRange(s.hue, 180, 260) || s.sat < 0.18) ? 0.9 : 0) + (s.lum > 0.2 && s.lum < 0.62 ? 0.5 : 0),
      24,
      floorWall
    );

    state.themeTiles.lounge = buildThemePool(
      floorWall,
      (s) => (inHueRange(s.hue, 185, 250) ? 1 : 0) + (s.sat > 0.1 ? 0.5 : 0) + (s.lum > 0.28 ? 0.3 : 0),
      24,
      state.themeTiles.ops.length ? state.themeTiles.ops : floorWall
    );

    state.themeTiles.wall = buildThemePool(
      walls.length ? walls : floorWall,
      (s) => (s.lum < 0.45 ? 1 : 0) + (s.edgeOpaqueRatio > 0.84 ? 0.8 : 0) + (s.sat < 0.42 ? 0.2 : 0),
      30,
      walls.length ? walls : floorWall
    );

    state.themeTiles.outdoor = buildThemePool(
      outdoorFloor,
      (s) => (inHueRange(s.hue, 70, 165) ? 1 : 0) + (s.sat > 0.11 ? 0.6 : 0) + (s.lum > 0.17 && s.lum < 0.72 ? 0.3 : 0),
      34,
      outdoorFloor
    );

    state.themeTiles.water = buildThemePool(
      water.length ? water : outdoorFloor,
      (s) => (inHueRange(s.hue, 155, 260) ? 1 : 0) + (s.sat > 0.1 ? 0.6 : 0) + (s.lum < 0.7 ? 0.2 : 0),
      20,
      water.length ? water : outdoorFloor
    );
  }

  function pickTileVariant(pool, x, y, seed) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const n = Math.floor(tileRand(x, y, seed) * pool.length) % pool.length;
    return pool[n];
  }

  function normalizeRelPath(relPath) {
    return String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  }

  function normalizeRoleKey(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function collectCatalogImages(catalog) {
    return dedupePaths([
      ...(catalog && Array.isArray(catalog.images) ? catalog.images : []),
      ...(catalog && Array.isArray(catalog.characterSheets) ? catalog.characterSheets : []),
      ...(catalog && Array.isArray(catalog.propSprites) ? catalog.propSprites : []),
      ...(catalog && Array.isArray(catalog.tileAtlases) ? catalog.tileAtlases : []),
      ...(catalog && Array.isArray(catalog.objectAtlases) ? catalog.objectAtlases : []),
    ]);
  }

  function pickCatalogImageByBase(images, baseName, options = {}) {
    const target = String(baseName || '').toLowerCase();
    if (!target) return null;
    const preferPack = String(options.preferPack || '').toLowerCase();
    const preferNoShadowless = options.preferNoShadowless !== false;
    const preferPngFolder = options.preferPngFolder !== false;

    const candidates = (images || []).filter((relPath) => {
      const lower = String(relPath || '').toLowerCase();
      return lower.endsWith(`/${target}`);
    });
    if (candidates.length === 0) return null;

    const sorted = [...candidates].sort((a, b) => {
      const al = a.toLowerCase();
      const bl = b.toLowerCase();
      let scoreA = 0;
      let scoreB = 0;

      if (preferPack) {
        if (al.includes(preferPack)) scoreA += 20;
        if (bl.includes(preferPack)) scoreB += 20;
      }
      if (preferPngFolder) {
        if (al.includes('/png/')) scoreA += 12;
        if (bl.includes('/png/')) scoreB += 12;
        if (al.includes('/tiled_files/')) scoreA -= 8;
        if (bl.includes('/tiled_files/')) scoreB -= 8;
      }
      if (preferNoShadowless) {
        if (al.includes('_without_shadow')) scoreA -= 6;
        if (bl.includes('_without_shadow')) scoreB -= 6;
      }

      if (scoreA !== scoreB) return scoreB - scoreA;
      return al.localeCompare(bl);
    });

    return sorted[0] || null;
  }

  function resolveCharacterKey(agentId, role, name) {
    const roleKey = normalizeRoleKey(role);
    const idKey = normalizeRoleKey(agentId);
    const nameKey = normalizeRoleKey(name);

    if (ROLE_TO_CHARACTER[roleKey]) return ROLE_TO_CHARACTER[roleKey];

    for (const [pattern, charKey] of Object.entries(ROLE_TO_CHARACTER)) {
      if (roleKey.includes(pattern) || idKey.includes(pattern) || nameKey.includes(pattern)) {
        return charKey;
      }
    }

    const available = Object.keys(CHARACTER_DEFS);
    if (available.length === 0) return 'citizen1';

    const token = `${idKey}|${roleKey}|${nameKey}`;
    const index = hashString(token) % available.length;
    return available[index];
  }

  async function buildRoleSpriteCatalog(catalog) {
    const images = collectCatalogImages(catalog);
    const preferredPack = 'craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack';
    const roleSprites = {};

    async function loadIfAvailable(relPath) {
      if (!relPath) return null;
      try {
        return await loadImage(relPath);
      } catch {
        return null;
      }
    }

    for (const [key, def] of Object.entries(CHARACTER_DEFS)) {
      const walkPath = pickCatalogImageByBase(images, def.walk, {
        preferPack: preferredPack,
        preferNoShadowless: true,
      });
      const idlePath = pickCatalogImageByBase(images, def.idle, {
        preferPack: preferredPack,
        preferNoShadowless: true,
      }) || walkPath;

      const walkImage = await loadIfAvailable(walkPath);
      const idleImage = await loadIfAvailable(idlePath);
      if (!walkImage) continue;

      const walkCols = Math.max(1, Number(def.walkCols || 6));
      const idleCols = Math.max(1, Number(def.idleCols || walkCols));
      const walkRows = Math.max(1, Number(def.walkRows || 4));
      const idleRows = Math.max(1, Number(def.idleRows || 4));

      const walkFrameWidth = Math.max(1, Math.floor((walkImage.naturalWidth || walkImage.width) / walkCols));
      const walkFrameHeight = Math.max(1, Math.floor((walkImage.naturalHeight || walkImage.height) / walkRows));

      const effectiveIdleImage = idleImage || walkImage;
      const idleFrameWidth = Math.max(1, Math.floor((effectiveIdleImage.naturalWidth || effectiveIdleImage.width) / idleCols));
      const idleFrameHeight = Math.max(1, Math.floor((effectiveIdleImage.naturalHeight || effectiveIdleImage.height) / idleRows));

      roleSprites[key] = {
        kind: 'roleSprite',
        key,
        walk: {
          image: walkImage,
          relPath: walkPath || null,
          cols: walkCols,
          rows: walkRows,
          frameWidth: walkFrameWidth,
          frameHeight: walkFrameHeight,
        },
        idle: {
          image: effectiveIdleImage,
          relPath: idlePath || walkPath || null,
          cols: idleCols,
          rows: idleRows,
          frameWidth: idleFrameWidth,
          frameHeight: idleFrameHeight,
        },
      };
    }

    return roleSprites;
  }

  function resolveAgentSprite(agentId, role, name) {
    const characterKey = resolveCharacterKey(agentId, role, name);
    const roleSprite = state.roleSprites && state.roleSprites[characterKey];
    if (roleSprite) {
      return { sprite: roleSprite, characterKey };
    }
    return { sprite: randomFrom(state.characterSheets, null), characterKey: null };
  }

  function buildResourceUrl(relPath) {
    const raw = String(relPath || '').trim();
    if (!raw) return '';
    if (/^(https?:|data:|vscode-webview-resource:|vscode-resource:|vscode-webview:)/i.test(raw)) {
      return raw;
    }

    const normalized = normalizeRelPath(raw);
    const base = String(DIST_BASE || '.').replace(/\/+$/, '');
    return `${base}/${normalized}`;
  }

  function inferSpriteSheet(image, relPath) {
    const pathLower = String(relPath || '').toLowerCase();
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;

    let cols = 1;
    let rows = 1;

    if (w % 12 === 0 && h % 4 === 0) {
      cols = 12;
      rows = 4;
    } else if (w % 8 === 0 && h % 4 === 0) {
      cols = 8;
      rows = 4;
    } else if (w % 6 === 0 && h % 4 === 0) {
      cols = 6;
      rows = 4;
    } else if (w % 4 === 0 && h % 4 === 0) {
      cols = 4;
      rows = 4;
    }

    if (pathLower.includes('guildmaster') && w % 9 === 0 && h % 1 === 0) {
      cols = 9;
      rows = 1;
    }

    const frameWidth = Math.max(1, Math.floor(w / cols));
    const frameHeight = Math.max(1, Math.floor(h / rows));
    const framesPerDirection = Math.max(1, Math.floor(cols / 4));

    return {
      image,
      relPath,
      cols,
      rows,
      frameWidth,
      frameHeight,
      framesPerDirection,
    };
  }

  function loadImage(relPath) {
    const normalized = normalizeRelPath(relPath);
    if (imageCache.has(normalized)) return imageCache.get(normalized);

    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load ${normalized}`));
      image.src = buildResourceUrl(normalized);
    });

    imageCache.set(normalized, promise);
    return promise;
  }

  function rgbToHsl(r, g, b) {
    const rn = clamp(r / 255, 0, 1);
    const gn = clamp(g / 255, 0, 1);
    const bn = clamp(b / 255, 0, 1);
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    return { h: h * 60, s, l };
  }

  function analyzeCell(imageData) {
    const data = imageData.data;
    const w = imageData.width || TILE;
    const h = imageData.height || TILE;
    const total = w * h;

    let opaque = 0;
    let edgeOpaque = 0;
    let edgeTotal = 0;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        const isOpaque = a > 38;
        if (isOpaque) {
          opaque += 1;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
        }
        if (x === 0 || y === 0 || x === (w - 1) || y === (h - 1)) {
          edgeTotal += 1;
          if (isOpaque) edgeOpaque += 1;
        }
      }
    }

    const opaqueCount = Math.max(1, opaque);
    const avgR = rSum / opaqueCount;
    const avgG = gSum / opaqueCount;
    const avgB = bSum / opaqueCount;
    const hsl = rgbToHsl(avgR, avgG, avgB);

    return {
      opaqueRatio: opaque / Math.max(1, total),
      edgeOpaqueRatio: edgeOpaque / Math.max(1, edgeTotal),
      avgR,
      avgG,
      avgB,
      hue: hsl.h,
      sat: hsl.s,
      lum: hsl.l,
    };
  }

  function extractCellsFromAtlas(image, relPath, options = {}) {
    const normalized = normalizeRelPath(relPath).toLowerCase();
    const skipLikelyCharacterSheet =
      /(with_shadow|idle_|walk_|run_|vampire|orc|slime|citizen|guildmaster|reader|attacked|manequin)/i.test(normalized);
    if (skipLikelyCharacterSheet && !options.allowCharacterSheet) {
      return [];
    }

    const off = document.createElement('canvas');
    off.width = image.naturalWidth || image.width;
    off.height = image.naturalHeight || image.height;
    if (off.width < TILE || off.height < TILE) return [];

    const offCtx = off.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(image, 0, 0);

    const cells = [];
    const cols = Math.floor(off.width / TILE);
    const rows = Math.floor(off.height / TILE);
    if (cols <= 0 || rows <= 0) return [];

    const isWall = /(wall|window|door)/i.test(normalized);
    const isWater = /(water|coast)/i.test(normalized);
    const isOutdoor = /(ground|grass|exterior|street|tree|rock|ruins)/i.test(normalized);
    const isDecor = /(object|interior|decorative|details|house)/i.test(normalized);

    const minRatio = Number.isFinite(options.minOpaqueRatio)
      ? Number(options.minOpaqueRatio)
      : (isWall ? 0.38 : isDecor ? 0.62 : 0.72);
    const minEdgeRatio = Number.isFinite(options.minEdgeOpaqueRatio)
      ? Number(options.minEdgeOpaqueRatio)
      : (isWater ? 0.25 : isDecor ? 0.5 : 0.78);
    const maxCells = Number.isFinite(options.maxCells) ? Math.max(1, Number(options.maxCells)) : 320;
    const stride = Math.max(1, Math.floor((cols * rows) / maxCells));
    let sampled = 0;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if ((sampled++ % stride) !== 0) continue;

        const sx = x * TILE;
        const sy = y * TILE;
        const data = offCtx.getImageData(sx, sy, TILE, TILE);
        const stats = analyzeCell(data);
        if (stats.opaqueRatio < minRatio) continue;
        if (stats.edgeOpaqueRatio < minEdgeRatio) continue;

        cells.push({
          image,
          sx,
          sy,
          sw: TILE,
          sh: TILE,
          relPath,
          wall: isWall,
          water: isWater,
          outdoor: isOutdoor,
          decor: isDecor,
          stats,
        });
      }
    }

    return cells;
  }

  function selectProps(catalog) {
    const list = Array.isArray(catalog && catalog.propSprites) ? catalog.propSprites : [];
    const prioritized = list
      .filter((rel) => !/(_source|texture_shadow|shadow_dark|coupon|free assets)/i.test(rel))
      .slice(0, 220);

    return prioritizeByKeywords(prioritized, [
      'reader',
      'guildmaster',
      'mage',
      'citizen',
      'attacked_manequin',
      'tree',
      'rock',
      'plant',
      'fire',
      'flag',
      'bridge',
      'statue',
      'crystal',
      'mushroom',
    ]);
  }

  function furnitureCategoryForPath(relPath) {
    const lower = String(relPath || '').toLowerCase();
    if (/(desk|table|workbench|counter)/i.test(lower)) return 'desk';
    if (/(chair|sofa|couch|stool|bench)/i.test(lower)) return 'chair';
    if (/(book|shelf|cabinet|drawer|closet|cupboard|crate|barrel|locker)/i.test(lower)) return 'storage';
    if (/(monitor|computer|server|terminal|console|vending|machine|clock|tv|radio)/i.test(lower)) return 'tech';
    if (/(tree|grass|plant|bush|rock|mushroom|fern|flower|water|coast)/i.test(lower)) return 'nature';
    return 'decor';
  }

  function rebuildFurnitureCategories() {
    const grouped = {
      all: [],
      desk: [],
      chair: [],
      storage: [],
      tech: [],
      decor: [],
      nature: [],
    };

    for (const item of state.props) {
      if (!item || !item.relPath) continue;
      const pathKey = normalizeRelPath(item.relPath);
      grouped.all.push(pathKey);
      const category = furnitureCategoryForPath(pathKey);
      if (grouped[category]) grouped[category].push(pathKey);
    }

    for (const [key, list] of Object.entries(grouped)) {
      grouped[key] = dedupePaths(list);
    }

    state.furnitureByCategory = grouped;
    if (!state.editor.selectedFurniturePath && grouped.all.length > 0) {
      state.editor.selectedFurniturePath = grouped.all[0];
    }
  }

  function updateLayoutHint() {
    if (!layoutHintEl) return;
    const mode = state.editor.mode;
    if (mode === 'furniture') {
      const selected = state.editor.selectedFurniturePath
        ? state.editor.selectedFurniturePath.split('/').pop()
        : 'none';
      layoutHintEl.textContent = `Mode: Furniture (${selected}). Drag to place.`;
      return;
    }
    if (mode === 'eraser') {
      layoutHintEl.textContent = 'Mode: Eraser. Drag to restore default tile and remove furniture.';
      return;
    }
    if (mode === 'wall') {
      layoutHintEl.textContent = 'Mode: Wall. Drag to paint walls.';
      return;
    }
    layoutHintEl.textContent = 'Mode: Floor. Drag to paint floor.';
  }

  function refreshFurnitureSelectors() {
    if (!furnitureCategoryEl || !furnitureSelectEl) return;
    const category = state.editor.furnitureCategory || 'all';
    const choices = state.furnitureByCategory[category] && state.furnitureByCategory[category].length
      ? state.furnitureByCategory[category]
      : state.furnitureByCategory.all;

    furnitureCategoryEl.value = category;
    furnitureSelectEl.innerHTML = '';
    for (const relPath of choices) {
      const option = document.createElement('option');
      option.value = relPath;
      option.textContent = relPath.split('/').pop();
      furnitureSelectEl.appendChild(option);
    }

    if (choices.length > 0) {
      const keep = choices.includes(state.editor.selectedFurniturePath)
        ? state.editor.selectedFurniturePath
        : choices[0];
      state.editor.selectedFurniturePath = keep;
      furnitureSelectEl.value = keep;
    } else {
      state.editor.selectedFurniturePath = null;
    }

    const showFurnitureControls = state.editor.mode === 'furniture';
    furnitureCategoryEl.style.display = showFurnitureControls ? '' : 'none';
    furnitureSelectEl.style.display = showFurnitureControls ? '' : 'none';
    updateLayoutHint();
  }

  function setEditorMode(mode) {
    const normalized = String(mode || 'floor').toLowerCase();
    state.editor.mode = ['floor', 'wall', 'furniture', 'eraser'].includes(normalized)
      ? normalized
      : 'floor';

    for (const button of layoutModeButtons) {
      const isActive = button.dataset.layoutMode === state.editor.mode;
      button.classList.toggle('is-active', isActive);
    }
    refreshFurnitureSelectors();
  }

  function serializeCustomLayout() {
    return {
      version: 1,
      cols: WORLD.cols,
      rows: WORLD.rows,
      tiles: WORLD.tiles.slice(),
      furniture: WORLD.userFurniture.map((entry) => ({
        x: entry.x,
        y: entry.y,
        relPath: normalizeRelPath(entry.relPath),
      })),
    };
  }

  function saveCustomLayoutNow() {
    const payload = serializeCustomLayout();
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
    if (vscode) {
      vscode.postMessage({ type: 'saveLayout', layout: payload });
    }
  }

  function scheduleCustomLayoutSave() {
    if (state.editor.saveTimer) {
      clearTimeout(state.editor.saveTimer);
    }
    state.editor.saveTimer = setTimeout(() => {
      saveCustomLayoutNow();
      state.editor.saveTimer = null;
    }, 180);
  }

  function clearFurnitureAt(x, y) {
    WORLD.userFurniture = WORLD.userFurniture.filter((entry) => !(entry.x === x && entry.y === y));
    for (const slot of WORLD.propSlots) {
      if (slot.x === x && slot.y === y) {
        delete slot.override;
      }
    }
  }

  function applyCustomLayoutRecord(record) {
    if (!record || typeof record !== 'object') return false;

    const expectedTileCount = WORLD.cols * WORLD.rows;
    if (Array.isArray(record.tiles) && record.tiles.length === expectedTileCount) {
      WORLD.tiles = record.tiles.map((tile) => {
        const n = Number(tile);
        if (!Number.isFinite(n)) return TILE_OUTDOOR;
        return clamp(Math.round(n), TILE_VOID, TILE_WATER);
      });
    }

    WORLD.userFurniture = [];
    const list = Array.isArray(record.furniture) ? record.furniture : [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const tx = Number(item.x);
      const ty = Number(item.y);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
      const x = Math.floor(tx);
      const y = Math.floor(ty);
      if (x < 0 || y < 0 || x >= WORLD.cols || y >= WORLD.rows) continue;
      const relPath = normalizeRelPath(item.relPath);
      if (!relPath) continue;
      const sprite = state.propsByPath.get(relPath);
      if (!sprite) continue;
      WORLD.userFurniture.push({ x, y, relPath, sprite });
    }
    return true;
  }

  function restoreCustomLayout(payload) {
    if (applyCustomLayoutRecord(payload)) {
      pushEvent('layout', 'restored from panel state');
      return true;
    }

    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (applyCustomLayoutRecord(parsed)) {
        pushEvent('layout', 'restored from local storage');
        return true;
      }
    } catch {
      // ignore parse/storage failures
    }
    return false;
  }

  function resetToDefaultLayout() {
    WORLD.tiles = WORLD.baseTiles.slice();
    WORLD.userFurniture = [];
    assignPropsToWorld();
    scheduleCustomLayoutSave();
    pushEvent('layout', 'reset to default');
  }

  function prioritizeByKeywords(paths, keywords) {
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    return [...paths].sort((a, b) => {
      const al = String(a || '').toLowerCase();
      const bl = String(b || '').toLowerCase();

      const ai = lowerKeywords.findIndex((k) => al.includes(k));
      const bi = lowerKeywords.findIndex((k) => bl.includes(k));

      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        if (ai !== bi) return ai - bi;
      }

      return al.localeCompare(bl);
    });
  }

  function dedupePaths(paths) {
    return [...new Set((paths || []).map((item) => normalizeRelPath(item)).filter(Boolean))];
  }

  function filterAtlasPaths(paths, options = {}) {
    const include = (options.include || []).map((s) => String(s || '').toLowerCase()).filter(Boolean);
    const exclude = (options.exclude || []).map((s) => String(s || '').toLowerCase()).filter(Boolean);
    const limit = Number.isFinite(options.limit) ? Math.max(1, Number(options.limit)) : 12;

    const filtered = dedupePaths(paths).filter((relPath) => {
      const lower = String(relPath || '').toLowerCase();
      if (!lower.endsWith('.png')) return false;
      if (exclude.some((token) => lower.includes(token))) return false;
      if (include.length > 0 && !include.some((token) => lower.includes(token))) return false;
      if (/(with_shadow|idle_|walk_|run_|vampire|orc|slime|citizen|guildmaster|reader|attacked|manequin)/i.test(lower)) {
        return false;
      }
      return true;
    });

    return prioritizeByKeywords(filtered, include).slice(0, limit);
  }

  async function loadCatalog() {
    const candidates = [];
    if (CATALOG_URI) candidates.push(CATALOG_URI);
    if (MANIFEST_URI) candidates.push(MANIFEST_URI);
    candidates.push(`${String(ASSET_BASE).replace(/\/+$/, '')}/catalog.json`);
    candidates.push(`${String(ASSET_BASE).replace(/\/+$/, '')}/manifest.json`);
    candidates.push('./kd-asset-pack/catalog.json');
    candidates.push('./kd-asset-pack/manifest.json');

    for (const rel of candidates) {
      try {
        const res = await fetch(rel, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data || typeof data !== 'object') continue;

        if (rel.endsWith('manifest.json')) {
          const images = Array.isArray(data.images) ? data.images : [];
          const fallbackCatalog = {
            total_images: images.length,
            tileAtlases: images.filter((p) => /(walls?|floor|ground|interior|exterior|objects|details|water|coast)/i.test(p)).slice(0, 120),
            objectAtlases: images.filter((p) => /(objects|interior|house|windows|decorative)/i.test(p)).slice(0, 120),
            propSprites: images.filter((p) => /(reader|guildmaster|mage|citizen|manequin|tree|rock|plant|fire|flag|statue|bridge|crystal|mushroom)/i.test(p)).slice(0, 220),
            characterSheets: images.filter((p) => /with_shadow/i.test(p) && /(idle|walk|run)_with_shadow/i.test(p)).slice(0, 180),
          };
          return fallbackCatalog;
        }

        return data;
      } catch {
        // try next source
      }
    }

    return null;
  }

  async function buildAssetPools(catalog) {
    const atlasUniverse = dedupePaths([...(catalog.tileAtlases || []), ...(catalog.objectAtlases || [])]);

    const floorAtlases = filterAtlasPaths(atlasUniverse, {
      include: ['walls_floor', 'floor', 'interior'],
      exclude: ['objects', 'interior_objects', 'windows_doors', 'house_details', 'water', 'coast', 'exterior', 'street'],
      limit: 3,
    });
    const wallAtlases = filterAtlasPaths(atlasUniverse, {
      include: ['walls_interior', 'wall', 'windows_doors'],
      exclude: ['water', 'coast', 'floor', 'ground'],
      limit: 3,
    });
    const outdoorAtlases = filterAtlasPaths(atlasUniverse, {
      include: ['ground', 'grass', 'exterior'],
      exclude: ['water', 'coast', 'interior_objects', 'objects', 'floor', 'wall'],
      limit: 3,
    });
    const waterAtlases = filterAtlasPaths(atlasUniverse, {
      include: ['water', 'coast'],
      exclude: [],
      limit: 2,
    });

    async function loadAtlasGroup(paths, extractOptions) {
      const atlasImages = await Promise.all(
        paths.map(async (relPath) => {
          try {
            const image = await loadImage(relPath);
            return { relPath, image };
          } catch {
            return null;
          }
        })
      );

      const cells = [];
      for (const entry of atlasImages) {
        if (!entry) continue;
        const extracted = extractCellsFromAtlas(entry.image, entry.relPath, extractOptions);
        cells.push(...extracted);
      }
      return cells;
    }

    const floors = await loadAtlasGroup(floorAtlases, { minOpaqueRatio: 0.86, minEdgeOpaqueRatio: 0.86, maxCells: 120 });
    const walls = await loadAtlasGroup(wallAtlases, { minOpaqueRatio: 0.62, minEdgeOpaqueRatio: 0.74, maxCells: 110 });
    const outdoor = await loadAtlasGroup(outdoorAtlases, { minOpaqueRatio: 0.84, minEdgeOpaqueRatio: 0.82, maxCells: 120 });
    const water = await loadAtlasGroup(waterAtlases, { minOpaqueRatio: 0.54, minEdgeOpaqueRatio: 0.3, maxCells: 80 });

    const decorAtlases = filterAtlasPaths(atlasUniverse, {
      include: ['interior_objects', 'objects'],
      exclude: ['with_shadow', 'idle_', 'walk_', 'run_', 'windows_doors'],
      limit: 2,
    });
    const decor = await loadAtlasGroup(decorAtlases, { minOpaqueRatio: 0.72, minEdgeOpaqueRatio: 0.45, maxCells: 60 });

    state.pools = {
      floors: floors.slice(0, 120),
      walls: walls.slice(0, 110),
      outdoor: outdoor.slice(0, 120),
      water: water.slice(0, 80),
      decor: decor.slice(0, 60),
    };

    const propPaths = selectProps(catalog).slice(0, 30);
    const propImages = await Promise.all(
      propPaths.map(async (relPath) => {
        try {
          const image = await loadImage(relPath);
          const lower = String(relPath || '').toLowerCase();
          if (/(with_shadow|idle_|walk_|run_|animation|sheet|sprite|atlas)/i.test(lower)) return null;
          const w = image.naturalWidth || image.width;
          const h = image.naturalHeight || image.height;
          if (w < 8 || h < 8 || w > 192 || h > 192) return null;
          const ratio = w / h;
          if (ratio < 0.45 || ratio > 2.4) return null;
          if ((w * h) > 22000) return null;
          return { relPath, image, w, h };
        } catch {
          return null;
        }
      })
    );

    state.props = propImages.filter(Boolean);
    state.propsByPath = new Map(state.props.map((item) => [normalizeRelPath(item.relPath), item]));
    rebuildFurnitureCategories();

    const charPaths = prioritizeByKeywords(catalog.characterSheets || [], [
      'unarmed_idle_with_shadow',
      'sword_idle_with_shadow',
      'vampires1_idle_with_shadow',
      'vampires2_idle_with_shadow',
      'orc1_idle_with_shadow',
      'orc2_idle_with_shadow',
      'slime1_idle_with_shadow',
      'slime2_idle_with_shadow',
      'slime3_idle_with_shadow',
    ]).slice(0, 96);

    const charSheets = await Promise.all(
      charPaths.map(async (relPath) => {
        try {
          const image = await loadImage(relPath);
          return inferSpriteSheet(image, relPath);
        } catch {
          return null;
        }
      })
    );

    state.characterSheets = charSheets.filter(Boolean);
    state.roleSprites = await buildRoleSpriteCatalog(catalog);
    buildThemeTiles();
    const themedTileCount = Object.values(state.themeTiles)
      .reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
    if (themedTileCount < 12) {
      pushEvent('tiles', `low themed tile coverage (${themedTileCount})`);
    }

    // Re-assign roleSprites to any agents that were created before loading finished
    if (Object.keys(state.roleSprites).length > 0) {
      for (const agent of state.agents.values()) {
        if (!agent.sprite || agent.sprite.kind !== 'roleSprite') {
          const resolved = resolveAgentSprite(agent.id, agent.role, agent.name);
          if (resolved.sprite && resolved.sprite.kind === 'roleSprite') {
            agent.sprite = resolved.sprite;
            agent.characterKey = resolved.characterKey;
          }
        }
      }
    }

    state.loadedAssets =
      state.pools.floors.length
      + state.pools.walls.length
      + state.pools.outdoor.length
      + state.pools.water.length
      + state.props.length
      + state.characterSheets.length
      + Object.keys(state.roleSprites).length
      + themedTileCount;
  }

  function pickPropForGroup(group, props) {
    if (!Array.isArray(props) || props.length === 0) return null;
    const tokenMap = {
      meeting: ['desk', 'table', 'chair', 'book', 'monitor', 'computer', 'lamp', 'vending'],
      workspace: ['desk', 'chair', 'computer', 'monitor', 'bookcase', 'plant', 'books'],
      ops: ['monitor', 'computer', 'server', 'console', 'desk', 'chair', 'vending'],
      lounge: ['sofa', 'couch', 'plant', 'book', 'table', 'lamp', 'chair'],
      outdoor: ['tree', 'rock', 'plant', 'fern', 'mushroom', 'flag', 'fire', 'statue'],
    };

    const keywords = tokenMap[group] || [];
    if (keywords.length === 0) return randomFrom(props);

    const scoped = props.filter((item) => {
      const lower = String(item && item.relPath ? item.relPath : '').toLowerCase();
      return keywords.some((key) => lower.includes(key));
    });
    return randomFrom(scoped.length > 0 ? scoped : props);
  }

  function assignPropsToWorld() {
    if (!Array.isArray(WORLD.propSlots)) return;
    for (const slot of WORLD.propSlots) {
      if (slot.override) {
        slot.sprite = slot.override;
        continue;
      }
      const sprite = pickPropForGroup(slot.group, state.props);
      if (!sprite) continue;
      slot.sprite = sprite;
    }
  }

  function ensureAgent(id, patch = {}) {
    const key = String(id || '').trim() || `agent-${Math.floor(Math.random() * 9999)}`;

    if (!state.agents.has(key)) {
      const initialRole = patch.role || 'Professional Agent';
      const initialName = patch.name || `Agent ${key}`;
      const lane = roleLane(initialRole);
      const start = randomFrom(lane, [26, 16]);
      const resolved = resolveAgentSprite(key, initialRole, initialName);

      state.agents.set(key, {
        id: key,
        name: initialName,
        role: initialRole,
        status: patch.status || 'active',
        x: start[0],
        y: start[1],
        tx: start[0],
        ty: start[1],
        lane,
        sprite: resolved.sprite,
        characterKey: resolved.characterKey,
        bubble: '',
        bubbleUntil: 0,
        lastSeen: Date.now(),
      });
    }

    const agent = state.agents.get(key);
    let refreshSprite = false;
    if (patch.name) {
      agent.name = patch.name;
      refreshSprite = true;
    }
    if (patch.role) {
      agent.role = patch.role;
      agent.lane = roleLane(agent.role);
      refreshSprite = true;
    }
    if (patch.status) agent.status = patch.status;
    if (patch.message) {
      agent.bubble = String(patch.message).trim().slice(0, 64);
      agent.bubbleUntil = Date.now() + 4200;
    }
    if (refreshSprite) {
      const resolved = resolveAgentSprite(agent.id, agent.role, agent.name);
      if (resolved.sprite) agent.sprite = resolved.sprite;
      agent.characterKey = resolved.characterKey || agent.characterKey || null;
    }
    if (!agent.sprite && state.characterSheets.length > 0) {
      agent.sprite = randomFrom(state.characterSheets);
    }
    agent.lastSeen = Date.now();

    return agent;
  }

  function removeAgent(id) {
    const key = String(id || '').trim();
    if (!key) return;
    state.agents.delete(key);
  }

  function updateAgentTargets() {
    for (const agent of state.agents.values()) {
      if (!Array.isArray(agent.lane) || agent.lane.length === 0) {
        agent.lane = roleLane(agent.role);
      }

      if (Math.random() < 0.03) {
        const target = randomFrom(agent.lane, [26, 16]);
        agent.tx = target[0];
        agent.ty = target[1];
      }
    }
  }

  function moveAgents(dt) {
    const speed = 2.2;
    for (const agent of state.agents.values()) {
      const dx = agent.tx - agent.x;
      const dy = agent.ty - agent.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const step = Math.min(dist, speed * dt);
        agent.x += (dx / dist) * step;
        agent.y += (dy / dist) * step;
      }
    }
  }

  function applyEditorAtTile(tileX, tileY, modeOverride = null) {
    if (!state.ready) return;
    if (tileX < 0 || tileY < 0 || tileX >= WORLD.cols || tileY >= WORLD.rows) return;

    const mode = modeOverride || state.editor.mode;
    if (mode === 'floor') {
      setTile(tileX, tileY, TILE_FLOOR_MAIN);
      clearFurnitureAt(tileX, tileY);
      scheduleCustomLayoutSave();
      return;
    }
    if (mode === 'wall') {
      setTile(tileX, tileY, TILE_WALL);
      clearFurnitureAt(tileX, tileY);
      scheduleCustomLayoutSave();
      return;
    }
    if (mode === 'eraser') {
      const idx = mapIndex(tileX, tileY);
      WORLD.tiles[idx] = WORLD.baseTiles[idx];
      clearFurnitureAt(tileX, tileY);
      scheduleCustomLayoutSave();
      return;
    }
    if (mode === 'furniture') {
      const relPath = normalizeRelPath(state.editor.selectedFurniturePath);
      if (!relPath) return;
      const sprite = state.propsByPath.get(relPath);
      if (!sprite) return;

      let placedInSlot = false;
      for (const slot of WORLD.propSlots) {
        if (slot.x === tileX && slot.y === tileY) {
          slot.override = sprite;
          slot.sprite = sprite;
          placedInSlot = true;
          break;
        }
      }
      if (!placedInSlot) {
        WORLD.userFurniture = WORLD.userFurniture.filter((entry) => !(entry.x === tileX && entry.y === tileY));
        WORLD.userFurniture.push({ x: tileX, y: tileY, relPath, sprite });
      }
      scheduleCustomLayoutSave();
    }
  }

  function onCanvasPointer(event) {
    const tile = screenToTile(event.clientX, event.clientY);
    if (!tile) return;
    const mode = event.button === 2 ? 'eraser' : state.editor.mode;
    applyEditorAtTile(tile.x, tile.y, mode);
  }

  // Seeded random for deterministic per-tile variation
  function tileRand(x, y, seed) {
    let h = 2166136261;
    h ^= x * 374761393; h = Math.imul(h, 16777619);
    h ^= y * 668265263; h = Math.imul(h, 16777619);
    h ^= (seed || 0) * 123456789; h = Math.imul(h, 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }

  function drawTile(ctx, tileType, px, py, x, y) {
    const T = TILE;
    const checker = (x + y) % 2 === 0;
    const r1 = tileRand(x, y, 0);
    const r2 = tileRand(x, y, 1);
    const r3 = tileRand(x, y, 2);

    function drawFromPool(pool, seed = 0) {
      const cell = pickTileVariant(pool, x, y, seed);
      if (!cell) return false;
      ctx.drawImage(cell.image, cell.sx, cell.sy, cell.sw, cell.sh, px, py, T, T);
      return true;
    }

    function drawFallbackFloor(colorA, colorB) {
      ctx.fillStyle = checker ? colorA : colorB;
      ctx.fillRect(px, py, T, T);
    }

    if (tileType === TILE_VOID) return;

    if (tileType === TILE_FLOOR_MAIN) {
      const pool = state.themeTiles.main.length ? state.themeTiles.main : state.pools.floors;
      if (drawFromPool(pool, 10)) return;
      drawFallbackFloor('#8a6036', '#7d5531');
      return;
    }

    if (tileType === TILE_FLOOR_MEETING) {
      const pool = state.themeTiles.meeting.length ? state.themeTiles.meeting : state.themeTiles.main;
      if (drawFromPool(pool, 12)) return;
      drawFallbackFloor('#6e4928', '#634022');
      return;
    }

    if (tileType === TILE_FLOOR_OPS) {
      const pool = state.themeTiles.ops.length ? state.themeTiles.ops : state.pools.floors;
      if (drawFromPool(pool, 14)) return;
      drawFallbackFloor('#8a8a98', '#7e7e8c');
      return;
    }

    if (tileType === TILE_FLOOR_LOUNGE) {
      const pool = state.themeTiles.lounge.length ? state.themeTiles.lounge : state.themeTiles.ops;
      if (drawFromPool(pool, 16)) return;
      drawFallbackFloor('#3b6080', '#345874');
      return;
    }

    if (tileType === TILE_WALL) {
      const pool = state.themeTiles.wall.length ? state.themeTiles.wall : state.pools.walls;
      if (drawFromPool(pool, 18)) return;
      drawFallbackFloor('#1c2236', '#252d44');
      return;
    }

    if (tileType === TILE_OUTDOOR) {
      const pool = state.themeTiles.outdoor.length ? state.themeTiles.outdoor : state.pools.outdoor;
      if (drawFromPool(pool, 20)) {
        if (r2 > 0.84) {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(px + Math.floor(r1 * 8) + 2, py + Math.floor(r3 * 8) + 2, 2, 2);
        }
        return;
      }
      const baseG = checker ? 62 : 56;
      const gVar = Math.floor(r1 * 12) - 6;
      ctx.fillStyle = 'rgb(' + (45 + gVar) + ', ' + (baseG + gVar) + ', ' + (38 + gVar) + ')';
      ctx.fillRect(px, py, T, T);
      return;
    }

    if (tileType === TILE_WATER) {
      const pool = state.themeTiles.water.length ? state.themeTiles.water : state.pools.water;
      if (drawFromPool(pool, 22)) {
        const wave = Math.sin((x * 0.85 + y * 0.6) + performance.now() / 900) * 0.5 + 0.5;
        ctx.fillStyle = 'rgba(92, 160, 220, ' + (0.08 + (wave * 0.08)) + ')';
        ctx.fillRect(px + 1, py + 1, T - 2, 2);
        ctx.fillStyle = 'rgba(15, 30, 55, ' + (0.08 + ((1 - wave) * 0.08)) + ')';
        ctx.fillRect(px, py + T - 3, T, 3);
        return;
      }
      const waveOff = Math.sin((x * 0.8 + y * 0.5) + performance.now() / 1200) * 0.12;
      const baseBlue = checker ? 80 : 72;
      ctx.fillStyle = 'rgb(' + (35 + Math.floor(waveOff * 20)) + ', ' + (55 + Math.floor(waveOff * 15)) + ', ' + (baseBlue + Math.floor(waveOff * 25)) + ')';
      ctx.fillRect(px, py, T, T);
      return;
    }

    const defaultPool = state.themeTiles.main.length ? state.themeTiles.main : state.pools.floors;
    if (drawFromPool(defaultPool, 24)) return;
    drawFallbackFloor('#8a6036', '#7d5531');
  }

  function drawWorld() {
    const worldWidth = WORLD.cols * TILE * state.zoom;
    const worldHeight = WORLD.rows * TILE * state.zoom;
    const offsetX = Math.floor((canvas.width - worldWidth) / 2);
    const offsetY = Math.floor((canvas.height - worldHeight) / 2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bg = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height * 0.35,
      30,
      canvas.width / 2,
      canvas.height * 0.35,
      canvas.height * 0.9
    );
    bg.addColorStop(0, '#202a50');
    bg.addColorStop(1, '#080d1d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(state.zoom, state.zoom);
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < WORLD.rows; y += 1) {
      for (let x = 0; x < WORLD.cols; x += 1) {
        const tileType = getTile(x, y);
        const px = x * TILE;
        const py = y * TILE;

        drawTile(ctx, tileType, px, py, x, y);
      }
    }

    // Props.
    for (const slot of WORLD.propSlots) {
      if (!slot.sprite) continue;

      const image = slot.sprite.image;
      const iw = slot.sprite.w;
      const ih = slot.sprite.h;

      const targetH = clamp(Math.round((ih / 16) * 7), 10, 64);
      const targetW = Math.round((iw / ih) * targetH);

      const px = slot.x * TILE + Math.floor((TILE - targetW) / 2);
      const py = slot.y * TILE + (TILE - targetH);

      ctx.drawImage(image, 0, 0, iw, ih, px, py, targetW, targetH);
    }

    for (const item of WORLD.userFurniture) {
      if (!item || !item.sprite || !item.sprite.image) continue;

      const image = item.sprite.image;
      const iw = item.sprite.w;
      const ih = item.sprite.h;
      const targetH = clamp(Math.round((ih / 16) * 7), 10, 64);
      const targetW = Math.round((iw / ih) * targetH);
      const px = item.x * TILE + Math.floor((TILE - targetW) / 2);
      const py = item.y * TILE + (TILE - targetH);
      ctx.drawImage(image, 0, 0, iw, ih, px, py, targetW, targetH);
    }

    // Agents sorted by Y for depth.
    const agents = [...state.agents.values()].sort((a, b) => a.y - b.y);
    const time = performance.now() / 1000;
    const now = Date.now();

    for (const agent of agents) {
      const px = agent.x * TILE;
      const py = agent.y * TILE;
      const centerX = px + TILE / 2;

      const vx = agent.tx - agent.x;
      const vy = agent.ty - agent.y;
      const moving = Math.hypot(vx, vy) > 0.08;
      let row = 0;
      if (Math.abs(vy) > Math.abs(vx)) {
        row = vy < 0 ? 3 : 0;
      } else {
        row = vx < 0 ? 1 : 2;
      }

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(centerX, py + 14, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      let drewSprite = false;
      if (agent.sprite && agent.sprite.kind === 'roleSprite') {
        const roleSprite = agent.sprite;
        const sheet = moving ? roleSprite.walk : (roleSprite.idle || roleSprite.walk);
        if (sheet && sheet.image && sheet.frameWidth > 0 && sheet.frameHeight > 0) {
          const maxFrames = moving
            ? Math.max(1, Math.min(sheet.cols, 6))
            : Math.max(1, Math.min(sheet.cols, 4));
          const frameInDir = moving
            ? Math.floor(time * 6.66) % maxFrames
            : Math.floor(time * 3.33) % maxFrames;

          const safeRow = clamp(row, 0, Math.max(0, sheet.rows - 1));
          const sx = frameInDir * sheet.frameWidth;
          const sy = safeRow * sheet.frameHeight;
          const dx = Math.round(px + (TILE - 24) / 2);
          const dy = Math.round(py + TILE - 32);
          ctx.drawImage(sheet.image, sx, sy, sheet.frameWidth, sheet.frameHeight, dx, dy, 24, 32);
          drewSprite = true;
        }
      } else if (agent.sprite && agent.sprite.image) {
        const sprite = agent.sprite;
        const fw = sprite.frameWidth;
        const fh = sprite.frameHeight;

        const perDir = Math.max(1, sprite.framesPerDirection);
        const walkFrames = Math.max(1, Math.min(perDir, 6));
        const idleFrames = Math.max(1, Math.min(perDir, 4));
        const frameInDir = moving
          ? Math.floor(time * 6.66) % walkFrames
          : Math.floor(time * 3.33) % idleFrames;

        row = clamp(row, 0, Math.max(0, sprite.rows - 1));
        const frameIndex = row * perDir + frameInDir;

        const sx = clamp(frameIndex, 0, sprite.cols - 1) * fw;
        const sy = row * fh;
        const dx = Math.round(px + (TILE - 24) / 2);
        const dy = Math.round(py + TILE - 32);
        ctx.drawImage(sprite.image, sx, sy, fw, fh, dx, dy, 24, 32);
        drewSprite = true;
      }

      if (!drewSprite) {
        ctx.fillStyle = '#f4c9a2';
        ctx.fillRect(centerX - 3, py - 10, 6, 5);
        ctx.fillStyle = '#7cd4ff';
        ctx.fillRect(centerX - 4, py - 5, 8, 6);
      }

      const nameY = py - 20;
      ctx.font = '5px "Silkscreen", Consolas, monospace';
      ctx.textAlign = 'center';
      const nameWidth = ctx.measureText(agent.name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(centerX - nameWidth / 2 - 2, nameY - 5, nameWidth + 4, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(agent.name, centerX, nameY);

      if (agent.bubble && now < agent.bubbleUntil) {
        const text = agent.bubble;
        ctx.font = '5px "Silkscreen", Consolas, monospace';
        const padding = 3;
        const width = Math.min(130, ctx.measureText(text).width + padding * 2);
        const height = 10;
        const bx = centerX - (width / 2);
        const by = nameY - 14;

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(bx, by, width, height, 2);
          ctx.fill();
        } else {
          ctx.fillRect(bx, by, width, height);
        }

        ctx.beginPath();
        ctx.moveTo(centerX, by + height + 2);
        ctx.lineTo(centerX - 3, by + height);
        ctx.lineTo(centerX + 3, by + height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.fillText(text, centerX, by + 7, width - padding * 2);
      }
    }

    ctx.restore();
  }

  function renderSidebar() {
    agentsEl.textContent = String(state.agents.size);
    assetsEl.textContent = String(state.loadedAssets);
    updatedEl.textContent = state.lastUpdate || '-';

    const sortedAgents = [...state.agents.values()].sort((a, b) => a.name.localeCompare(b.name));
    agentListEl.innerHTML = sortedAgents.slice(0, 32).map((agent) => {
      const status = agent.status || 'active';
      return `<div class="kd-item"><div class="name">${escapeHtml(agent.name)}</div><div class="meta">${escapeHtml(agent.role)} | ${escapeHtml(status)}</div></div>`;
    }).join('') || '<div class="kd-item"><div class="meta">No agents yet</div></div>';

    eventListEl.innerHTML = state.events.slice(0, 24).map((event) => {
      return `<div class="kd-item"><div class="name">${escapeHtml(event.ts)} ${escapeHtml(event.title)}</div><div class="meta">${escapeHtml(event.meta || '-')}</div></div>`;
    }).join('') || '<div class="kd-item"><div class="meta">No events yet</div></div>';
  }

  function markUpdated() {
    state.lastUpdate = nowTime();
  }

  function handleExistingAgents(message) {
    const ids = Array.isArray(message.agents) ? message.agents : [];
    const identity = message.agentIdentity && typeof message.agentIdentity === 'object' ? message.agentIdentity : {};

    for (const idValue of ids) {
      const id = String(idValue);
      const info = identity[id] || {};
      ensureAgent(id, {
        name: info.name || `Agent ${id}`,
        role: info.role || 'Professional Agent',
      });
    }

    pushEvent('existingAgents', `count=${ids.length}`);
  }

  function handleVscodeMessage(message) {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'layoutLoaded' && message.layout && typeof message.layout === 'object') {
      if (state.ready) {
        restoreCustomLayout(message.layout);
      }
      return;
    }

    if (message.type === 'existingAgents') {
      handleExistingAgents(message);
      markUpdated();
      return;
    }

    if (message.type === 'agentCreated') {
      const id = String(message.id);
      ensureAgent(id, { name: `Agent ${id}`, role: 'Professional Agent' });
      pushEvent('agentCreated', id);
      markUpdated();
      return;
    }

    if (message.type === 'agentClosed') {
      const id = String(message.id);
      removeAgent(id);
      pushEvent('agentClosed', id);
      markUpdated();
      return;
    }

    if (message.type === 'agentStatus') {
      const id = String(message.id);
      ensureAgent(id, { status: message.status || 'active' });
      markUpdated();
      return;
    }

    if (message.type === 'agentToolStart') {
      const id = String(message.id);
      const summary = String(message.status || '').trim();
      ensureAgent(id, { message: summary, status: 'active' });
      if (summary) pushEvent(`agent ${id}`, summary);
      markUpdated();
      return;
    }

    if (message.type === 'agentPulse') {
      const id = String(message.id);
      ensureAgent(id, {
        name: message.agentName || `Agent ${id}`,
        role: message.role || 'Professional Agent',
        status: /wait|idle/i.test(String(message.action || '')) ? 'waiting' : 'active',
        message: message.message || message.task || message.action || '',
      });
      if (message.message || message.task) {
        pushEvent(message.agentName || id, message.message || message.task || message.action || '-');
      }
      markUpdated();
      return;
    }
  }

  async function pollWebState() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();

      const live = new Set();
      const agents = Array.isArray(payload.agents) ? payload.agents : [];
      for (const entry of agents) {
        const id = String(entry.id || entry.agent_id || entry.name || `agent-${Math.random()}`);
        live.add(id);

        const role = entry.role || 'Professional Agent';
        const name = entry.name || id;
        const message = entry.last_message || entry.last_task || entry.last_action || '';

        ensureAgent(id, {
          name,
          role,
          status: /wait|idle/i.test(String(entry.last_action || '')) ? 'waiting' : 'active',
          message,
        });
      }

      for (const id of [...state.agents.keys()]) {
        if (!live.has(id)) {
          const agent = state.agents.get(id);
          if (!agent) continue;
          if (Date.now() - agent.lastSeen > 90000) {
            state.agents.delete(id);
          }
        }
      }

      const recent = Array.isArray(payload.recent) ? payload.recent.slice(0, 18) : [];
      state.events = recent.map((item) => ({
        ts: String(item.ts || '').slice(11, 19) || nowTime(),
        title: `${item.agent_name || item.agent_id || 'agent'}: ${item.action || '-'}`,
        meta: item.message || item.task || '-',
      }));

      markUpdated();
      setStatus('Online', 'ok');
    } catch {
      setStatus('Offline', 'error');
    }
  }

  let lastAnimationTs = performance.now();
  function animationLoop(ts) {
    const dt = Math.min(0.05, (ts - lastAnimationTs) / 1000);
    lastAnimationTs = ts;

    updateAgentTargets();
    moveAgents(dt);
    drawWorld();
    renderSidebar();

    requestAnimationFrame(animationLoop);
  }

  async function boot() {
    fitCanvas();
    buildWorldLayout();

    setStatus('Loading assets...', 'warn');

    const catalog = await loadCatalog();
    if (!catalog) {
      setStatus('Asset catalog missing', 'error');
      pushEvent('catalog', 'kd-asset-pack/catalog.json not found');
      renderSidebar();
      drawWorld();
      requestAnimationFrame(animationLoop);
      return;
    }

    state.catalog = catalog;

    await buildAssetPools(catalog);
    assignPropsToWorld();
    restoreCustomLayout(null);
    refreshFurnitureSelectors();

    if (state.loadedAssets > 0) {
      setStatus('Online', 'ok');
      pushEvent('assets', `loaded=${state.loadedAssets}`);
    } else {
      setStatus('Assets loaded with fallback', 'warn');
      pushEvent('assets', 'fallback rendering enabled');
    }

    state.ready = true;
    markUpdated();

    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
      state.usingWebPoll = false;
    } else {
      state.usingWebPoll = true;
      pollWebState();
      setInterval(pollWebState, 1200);
    }

    requestAnimationFrame(animationLoop);
  }

  zoomInButton.addEventListener('click', () => {
    state.zoom = clamp(state.zoom + 0.25, 1.5, 5);
  });

  zoomOutButton.addEventListener('click', () => {
    state.zoom = clamp(state.zoom - 0.25, 1.25, 5);
  });

  for (const button of layoutModeButtons) {
    button.addEventListener('click', () => {
      setEditorMode(button.dataset.layoutMode || 'floor');
    });
  }

  if (furnitureCategoryEl) {
    furnitureCategoryEl.addEventListener('change', () => {
      state.editor.furnitureCategory = furnitureCategoryEl.value || 'all';
      refreshFurnitureSelectors();
    });
  }

  if (furnitureSelectEl) {
    furnitureSelectEl.addEventListener('change', () => {
      state.editor.selectedFurniturePath = furnitureSelectEl.value || null;
      updateLayoutHint();
    });
  }

  if (layoutResetEl) {
    layoutResetEl.addEventListener('click', () => {
      resetToDefaultLayout();
    });
  }

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  canvas.addEventListener('mousedown', (event) => {
    if (!state.ready) return;
    if (event.button !== 0 && event.button !== 2) return;
    state.editor.painting = true;
    onCanvasPointer(event);
  });

  canvas.addEventListener('mousemove', (event) => {
    if (!state.editor.painting || !state.ready) return;
    onCanvasPointer(event);
  });

  window.addEventListener('mouseup', () => {
    state.editor.painting = false;
  });

  window.addEventListener('resize', fitCanvas);
  window.addEventListener('message', (event) => handleVscodeMessage(event.data));
  window.addEventListener('beforeunload', () => {
    if (state.editor.saveTimer) clearTimeout(state.editor.saveTimer);
    saveCustomLayoutNow();
  });

  setEditorMode('floor');
  boot().catch((err) => {
    setStatus('Panel init failed', 'error');
    pushEvent('init error', err && err.message ? err.message : String(err));
    drawWorld();
    renderSidebar();
  });
})();
