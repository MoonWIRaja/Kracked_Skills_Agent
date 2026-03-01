(() => {
  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  const DIST_BASE = (typeof window !== 'undefined' && typeof window.__KD_WEBVIEW_DIST_BASE__ === 'string')
    ? window.__KD_WEBVIEW_DIST_BASE__
    : '.';
  const ASSET_BASE = (typeof window !== 'undefined' && typeof window.__KD_WEBVIEW_ASSET_BASE__ === 'string')
    ? window.__KD_WEBVIEW_ASSET_BASE__
    : './kd-asset-pack';
  const CATALOG_URI = (typeof window !== 'undefined' && typeof window.__KD_WEBVIEW_CATALOG__ === 'string')
    ? window.__KD_WEBVIEW_CATALOG__
    : null;
  const MANIFEST_URI = (typeof window !== 'undefined' && typeof window.__KD_WEBVIEW_MANIFEST__ === 'string')
    ? window.__KD_WEBVIEW_MANIFEST__
    : null;

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

  const WORLD = {
    cols: WORLD_COLS,
    rows: WORLD_ROWS,
    tiles: new Array(WORLD_COLS * WORLD_ROWS).fill(TILE_VOID),
    propSlots: [],
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
    characterSheets: [],
    agents: new Map(),
    events: [],
    usingWebPoll: !vscode,
    loadedAssets: 0,
    lastUpdate: null,
    ready: false,
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

  function normalizeRelPath(relPath) {
    return String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
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

  function isOpaqueCell(imageData, minRatio) {
    const data = imageData.data;
    let opaque = 0;
    const total = data.length / 4;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 38) opaque += 1;
    }

    return (opaque / total) >= minRatio;
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
    const maxCells = Number.isFinite(options.maxCells) ? Math.max(1, Number(options.maxCells)) : 320;
    const stride = Math.max(1, Math.floor((cols * rows) / maxCells));
    let sampled = 0;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if ((sampled++ % stride) !== 0) continue;

        const sx = x * TILE;
        const sy = y * TILE;
        const data = offCtx.getImageData(sx, sy, TILE, TILE);
        if (!isOpaqueCell(data, minRatio)) continue;

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

    const floors = await loadAtlasGroup(floorAtlases, { minOpaqueRatio: 0.82, maxCells: 80 });
    const walls = await loadAtlasGroup(wallAtlases, { minOpaqueRatio: 0.55, maxCells: 60 });
    const outdoor = await loadAtlasGroup(outdoorAtlases, { minOpaqueRatio: 0.78, maxCells: 60 });
    const water = await loadAtlasGroup(waterAtlases, { minOpaqueRatio: 0.58, maxCells: 40 });

    const decorAtlases = filterAtlasPaths(atlasUniverse, {
      include: ['interior_objects', 'objects'],
      exclude: ['with_shadow', 'idle_', 'walk_', 'run_', 'windows_doors'],
      limit: 2,
    });
    const decor = await loadAtlasGroup(decorAtlases, { minOpaqueRatio: 0.72, maxCells: 40 });

    state.pools = {
      floors: floors.slice(0, 80),
      walls: walls.slice(0, 60),
      outdoor: outdoor.slice(0, 60),
      water: water.slice(0, 40),
      decor: decor.slice(0, 40),
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

    state.loadedAssets =
      state.pools.floors.length
      + state.pools.walls.length
      + state.props.length
      + state.characterSheets.length;
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
      const sprite = pickPropForGroup(slot.group, state.props);
      if (!sprite) continue;
      slot.sprite = sprite;
    }
  }

  function ensureAgent(id, patch = {}) {
    const key = String(id || '').trim() || `agent-${Math.floor(Math.random() * 9999)}`;

    if (!state.agents.has(key)) {
      const initialRole = patch.role || 'Professional Agent';
      const lane = roleLane(initialRole);
      const start = randomFrom(lane, [26, 16]);
      const sprite = randomFrom(state.characterSheets, null);

      state.agents.set(key, {
        id: key,
        name: patch.name || `Agent ${key}`,
        role: initialRole,
        status: patch.status || 'active',
        x: start[0],
        y: start[1],
        tx: start[0],
        ty: start[1],
        lane,
        sprite,
        bubble: '',
        bubbleUntil: 0,
        lastSeen: Date.now(),
      });
    }

    const agent = state.agents.get(key);
    if (patch.name) agent.name = patch.name;
    if (patch.role) {
      agent.role = patch.role;
      agent.lane = roleLane(agent.role);
    }
    if (patch.status) agent.status = patch.status;
    if (patch.message) {
      agent.bubble = String(patch.message).trim().slice(0, 64);
      agent.bubbleUntil = Date.now() + 4200;
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

    switch (tileType) {
      case TILE_VOID:
        return; // transparent, background shows through

      case TILE_FLOOR_MAIN: {
        // Warm wood plank floor
        ctx.fillStyle = checker ? '#8a6036' : '#7d5531';
        ctx.fillRect(px, py, T, T);
        // Wood grain lines
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(px, py + 4, T, 1);
        ctx.fillRect(px, py + 10, T, 1);
        // Plank gap
        if (checker) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(px + Math.floor(r1 * 8) + 3, py, 1, T);
        }
        // Subtle highlight
        ctx.fillStyle = 'rgba(255,220,160,0.06)';
        ctx.fillRect(px + 1, py + 1, T - 2, 2);
        break;
      }

      case TILE_FLOOR_MEETING: {
        // Rich dark wood - meeting room
        ctx.fillStyle = checker ? '#6e4928' : '#634022';
        ctx.fillRect(px, py, T, T);
        // Parquet pattern
        ctx.fillStyle = 'rgba(255,200,120,0.06)';
        if (checker) {
          ctx.fillRect(px + 1, py + 1, 6, T - 2);
          ctx.fillRect(px + 9, py + 1, 6, T - 2);
        } else {
          ctx.fillRect(px + 1, py + 1, T - 2, 6);
          ctx.fillRect(px + 1, py + 9, T - 2, 6);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(px, py + 7, T, 1);
        break;
      }

      case TILE_FLOOR_OPS: {
        // Clean stone/tile - ops room
        ctx.fillStyle = checker ? '#8a8a98' : '#7e7e8c';
        ctx.fillRect(px, py, T, T);
        // Tile grout
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(px + T - 1, py, 1, T);
        ctx.fillRect(px, py + T - 1, T, 1);
        // Subtle sheen
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(px + 2, py + 2, 4, 4);
        break;
      }

      case TILE_FLOOR_LOUNGE: {
        // Soft blue carpet - lounge
        ctx.fillStyle = checker ? '#3b6080' : '#345874';
        ctx.fillRect(px, py, T, T);
        // Carpet texture
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(px + Math.floor(r1 * 6) + 2, py + Math.floor(r2 * 6) + 2, 2, 2);
        ctx.fillRect(px + Math.floor(r3 * 6) + 6, py + Math.floor(r1 * 6) + 7, 2, 2);
        break;
      }

      case TILE_WALL: {
        // Stone brick wall
        ctx.fillStyle = '#1c2236';
        ctx.fillRect(px, py, T, T);
        ctx.fillStyle = '#252d44';
        ctx.fillRect(px + 1, py + 1, T - 2, 6);
        ctx.fillRect(px + 1, py + 9, T - 2, 6);
        // Mortar lines
        ctx.fillStyle = '#161c2e';
        ctx.fillRect(px, py + 7, T, 2);
        ctx.fillRect(px + (checker ? 5 : 11), py, 1, 7);
        ctx.fillRect(px + (checker ? 11 : 5), py + 9, 1, 7);
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(px + 1, py + 1, T - 2, 1);
        break;
      }

      case TILE_OUTDOOR: {
        // Grass with variation
        const baseG = checker ? 62 : 56;
        const gVar = Math.floor(r1 * 12) - 6;
        ctx.fillStyle = `rgb(${45 + gVar}, ${baseG + gVar}, ${38 + gVar})`;
        ctx.fillRect(px, py, T, T);
        // Grass tufts
        if (r2 > 0.6) {
          ctx.fillStyle = 'rgba(80,140,70,0.35)';
          ctx.fillRect(px + Math.floor(r1 * 10) + 2, py + Math.floor(r3 * 8) + 3, 1, 3);
          ctx.fillRect(px + Math.floor(r3 * 8) + 5, py + Math.floor(r2 * 6) + 6, 1, 2);
        }
        // Dirt speck
        if (r3 > 0.8) {
          ctx.fillStyle = 'rgba(90,70,40,0.2)';
          ctx.fillRect(px + Math.floor(r2 * 12) + 1, py + Math.floor(r1 * 12) + 1, 2, 2);
        }
        // Occasional flower
        if (r1 > 0.92 && r2 > 0.5) {
          ctx.fillStyle = r3 > 0.5 ? '#e8c84a' : '#d66b8f';
          ctx.fillRect(px + Math.floor(r3 * 10) + 3, py + Math.floor(r2 * 8) + 4, 2, 2);
        }
        break;
      }

      case TILE_WATER: {
        // Animated water
        const waveOff = Math.sin((x * 0.8 + y * 0.5) + performance.now() / 1200) * 0.12;
        const baseBlue = checker ? 80 : 72;
        ctx.fillStyle = `rgb(${35 + Math.floor(waveOff * 20)}, ${55 + Math.floor(waveOff * 15)}, ${baseBlue + Math.floor(waveOff * 25)})`;
        ctx.fillRect(px, py, T, T);
        // Wave highlight
        const waveX = Math.floor(Math.sin((x * 1.3 + performance.now() / 800)) * 4 + 6);
        ctx.fillStyle = 'rgba(120,180,220,0.2)';
        ctx.fillRect(px + waveX, py + 4, 4, 1);
        ctx.fillRect(px + (T - waveX - 2), py + 10, 3, 1);
        // Depth gradient
        ctx.fillStyle = 'rgba(0,10,30,0.1)';
        ctx.fillRect(px, py + T - 3, T, 3);
        break;
      }

      default: {
        ctx.fillStyle = checker ? '#8a6036' : '#7d5531';
        ctx.fillRect(px, py, T, T);
        break;
      }
    }
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

    // Agents sorted by Y for depth.
    const agents = [...state.agents.values()].sort((a, b) => a.y - b.y);
    const time = performance.now() / 1000;

    for (const agent of agents) {
      const px = agent.x * TILE;
      const py = agent.y * TILE;

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(px + 4, py + 13, 8, 2);

      if (agent.sprite && agent.sprite.image) {
        const sprite = agent.sprite;
        const fw = sprite.frameWidth;
        const fh = sprite.frameHeight;

        const vx = agent.tx - agent.x;
        const vy = agent.ty - agent.y;
        let row = 0;
        if (Math.abs(vy) > Math.abs(vx)) {
          row = vy < 0 ? 3 : 0;
        } else {
          row = vx < 0 ? 1 : 2;
        }
        row = clamp(row, 0, Math.max(0, sprite.rows - 1));

        const moving = Math.hypot(vx, vy) > 0.08;
        const perDir = Math.max(1, sprite.framesPerDirection);
        const frameInDir = moving ? Math.floor(time * 6) % perDir : 0;
        const frameIndex = row * perDir + frameInDir;

        const sx = clamp(frameIndex, 0, sprite.cols - 1) * fw;
        const sy = row * fh;

        const targetH = 28;
        const targetW = Math.round((fw / fh) * targetH);
        const dx = Math.round(px + (TILE - targetW) / 2);
        const dy = Math.round(py + TILE - targetH);

        ctx.drawImage(sprite.image, sx, sy, fw, fh, dx, dy, targetW, targetH);
      } else {
        ctx.fillStyle = '#f4c9a2';
        ctx.fillRect(px + 5, py + 4, 6, 5);
        ctx.fillStyle = '#7cd4ff';
        ctx.fillRect(px + 4, py + 9, 8, 6);
      }

      ctx.fillStyle = '#ebf5ff';
      ctx.font = '5px Consolas';
      ctx.textAlign = 'center';
      ctx.fillText(agent.name, px + 8, py + 2);

      if (agent.bubble && Date.now() < agent.bubbleUntil) {
        const text = agent.bubble;
        ctx.font = '5px Consolas';
        const width = Math.min(152, ctx.measureText(text).width + 8);
        const height = 11;
        const bx = px + 8 - (width / 2);
        const by = py - 13;

        ctx.fillStyle = 'rgba(8,14,27,0.92)';
        ctx.fillRect(bx, by, width, height);
        ctx.strokeStyle = '#5e82bb';
        ctx.strokeRect(bx, by, width, height);
        ctx.fillStyle = '#dcedff';
        ctx.fillText(text, px + 8, by + 7, width - 4);
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

  window.addEventListener('resize', fitCanvas);
  window.addEventListener('message', (event) => handleVscodeMessage(event.data));

  boot().catch((err) => {
    setStatus('Panel init failed', 'error');
    pushEvent('init error', err && err.message ? err.message : String(err));
    drawWorld();
    renderSidebar();
  });
})();
