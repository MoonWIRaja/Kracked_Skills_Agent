const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_EVENTS = 600;
const VIEW_ID = 'kdPixel.panelView';
const LAYOUT_STATE_KEY = 'kdPixel.layoutPreset.v5';
const LEGACY_LAYOUT_STATE_KEYS = ['kdPixel.officeLayout.v4', 'kdPixel.officeLayout.v3', 'kdPixel.officeLayout.v2'];
const LAYOUT_BUNDLE_SIG_KEY = 'kdPixel.layoutBundleSig';
const AGENT_ID_MAP_KEY = 'kdPixel.agentIdByKey';
const NEXT_AGENT_ID_KEY = 'kdPixel.nextAgentNumericId';
const AGENT_SEATS_KEY = 'kdPixel.agentSeats';
const SOUND_ENABLED_KEY = 'kdPixel.soundEnabled';

const ROLE_TITLES = {
  analyst: 'Analyst',
  pm: 'Product Manager',
  architect: 'Architect',
  'tech-lead': 'Tech Lead',
  engineer: 'Engineer',
  qa: 'QA',
  security: 'Security',
  devops: 'DevOps',
  'release-manager': 'Release Manager',
};

const TASK_DELEGATION_MAP = {
  'kd-analyze': ['analyst'],
  'kd-brainstorm': ['analyst', 'pm'],
  'kd-prd': ['pm'],
  'kd-arch': ['architect', 'security'],
  'kd-story': ['tech-lead'],
  'kd-dev-story': ['engineer'],
  'kd-code-review': ['qa', 'security'],
  'kd-deploy': ['devops'],
  'kd-release': ['release-manager'],
  'kd-api-design': ['architect'],
  'kd-db-schema': ['architect'],
  'kd-test': ['qa'],
  'kd-security-audit': ['security'],
  'kd-refactor': ['tech-lead', 'engineer'],
  'kd-sprint-planning': ['pm', 'tech-lead'],
  'kd-sprint-review': ['pm', 'qa'],
  'kd-validate': ['qa'],
};

const ROLE_HINTS = {
  analyst: ['analyst', 'analysis', 'discover', 'research', 'stakeholder'],
  pm: ['pm', 'product manager', 'prd', 'roadmap', 'backlog'],
  architect: ['architect', 'architecture', 'system design', 'api design', 'db schema'],
  'tech-lead': ['tech lead', 'tl', 'lead', 'story breakdown', 'refactor'],
  engineer: ['engineer', 'developer', 'dev story', 'implement', 'coding', 'code'],
  qa: ['qa', 'quality', 'testing', 'test'],
  security: ['security', 'audit', 'owasp', 'vulnerability'],
  devops: ['devops', 'deploy', 'deployment', 'ci/cd', 'pipeline'],
  'release-manager': ['release manager', 'release', 'changelog'],
};

let provider = null;

function activate(context) {
  provider = new KDPanelViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    vscode.commands.registerCommand('kdPixel.openPanel', () => vscode.commands.executeCommand(`${VIEW_ID}.focus`)),
    vscode.commands.registerCommand('kdPixel.refreshPanel', () => provider.refresh()),
    vscode.commands.registerCommand('kdPixel.resetLayout', async () => provider.resetLayout(true))
  );

  const autoOpen = vscode.workspace.getConfiguration('kdPixel').get('autoOpen', true);
  if (autoOpen && provider.isKDWorkspace()) {
    vscode.commands.executeCommand(`${VIEW_ID}.focus`);
  }
}

function deactivate() {
  if (provider) provider.dispose();
}

class KDPanelViewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.interval = null;
    this.ready = false;
    this.activeNumericIds = new Set();
    this.lastSignatureById = new Map();
    this.agentIdByKey = this.context.workspaceState.get(AGENT_ID_MAP_KEY, {});
    this.nextNumericId = Number(this.context.workspaceState.get(NEXT_AGENT_ID_KEY, 1)) || 1;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    this.ready = false;
    this.activeNumericIds.clear();
    this.lastSignatureById.clear();
    await this.migrateLayoutStateIfNeeded();

    const distPath = path.join(this.context.extensionPath, 'dist', 'webview');
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(distPath)],
    };
    this.view.webview.html = this.getWebviewHtml();

    this.view.onDidDispose(() => {
      this.stopPolling();
      this.ready = false;
      this.view = null;
    });

    this.view.webview.onDidReceiveMessage(async (message) => {
      if (!message || typeof message !== 'object') return;

      if (message.type === 'webviewReady') {
        this.ready = true;
        this.bootstrapWebview();
        this.refresh();
        return;
      }

      if (message.type === 'openClaude') {
        vscode.window.showInformationMessage('KD panel runs in observer mode. Use your IDE chat to run workflows.');
        return;
      }

      if (message.type === 'openSessionsFolder') {
        const root = this.getWorkspaceRoot();
        if (root) {
          vscode.env.openExternal(vscode.Uri.file(root));
        }
        return;
      }

      if (message.type === 'exportLayout') {
        await this.exportLayout();
        return;
      }

      if (message.type === 'importLayout') {
        await this.importLayout();
        return;
      }

      if (message.type === 'saveLayout' && message.layout && typeof message.layout === 'object') {
        await this.context.workspaceState.update(LAYOUT_STATE_KEY, message.layout);
        return;
      }

      if (message.type === 'saveAgentSeats' && message.seats && typeof message.seats === 'object') {
        await this.context.workspaceState.update(AGENT_SEATS_KEY, message.seats);
        return;
      }

      if (message.type === 'setSoundEnabled') {
        const enabled = Boolean(message.enabled);
        await this.context.workspaceState.update(SOUND_ENABLED_KEY, enabled);
        return;
      }

      if (message.type === 'focusAgent' || message.type === 'closeAgent') {
        return;
      }

      if (message.type === 'refresh') {
        this.refresh();
      }
    });

    this.startPolling();
    this.refresh();
  }

  bootstrapWebview() {
    if (!this.view || !this.ready) return;
    const webview = this.view.webview;

    const soundEnabled = this.context.workspaceState.get(SOUND_ENABLED_KEY, true);
    webview.postMessage({ type: 'settingsLoaded', soundEnabled });

    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 1) {
      webview.postMessage({
        type: 'workspaceFolders',
        folders: folders.map((f) => ({ name: f.name, path: f.uri.fsPath })),
      });
    }

    const bootstrapState = this.buildAgentSnapshot();
    if (bootstrapState.ids.length > 0) {
      this.activeNumericIds = new Set(bootstrapState.ids);
      webview.postMessage({
        type: 'existingAgents',
        agents: bootstrapState.ids,
        agentMeta: bootstrapState.agentMeta,
        agentIdentity: bootstrapState.agentIdentity,
        folderNames: bootstrapState.folderNames,
      });
    }

    webview.postMessage({ type: 'layoutLoaded', layout: this.getLayout() });
  }

  getWebviewHtml() {
    const webview = this.view ? this.view.webview : null;
    if (!webview) return '';

    const distPath = path.join(this.context.extensionPath, 'dist', 'webview');
    const indexPath = path.join(distPath, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    html = html.replace(/<link rel="icon"[^>]*>/i, '');

    html = html.replace(/(href|src)="\.\/([^"]+)"/g, (_match, attr, relPath) => {
      const fileUri = vscode.Uri.file(path.join(distPath, relPath));
      return `${attr}="${webview.asWebviewUri(fileUri)}"`;
    });

    const distBaseUri = webview.asWebviewUri(vscode.Uri.file(distPath)).toString().replace(/\/+$/, '');
    const assetBaseUri = webview
      .asWebviewUri(vscode.Uri.file(path.join(distPath, 'kd-asset-pack')))
      .toString()
      .replace(/\/+$/, '');
    const catalogUri = webview.asWebviewUri(vscode.Uri.file(path.join(distPath, 'kd-asset-pack', 'catalog.json'))).toString();
    const manifestUri = webview
      .asWebviewUri(vscode.Uri.file(path.join(distPath, 'kd-asset-pack', 'manifest.json')))
      .toString();

    html = html
      .replace(/__KD_DIST_BASE__/g, distBaseUri)
      .replace(/__KD_ASSET_BASE__/g, assetBaseUri)
      .replace(/__KD_CATALOG_URI__/g, catalogUri)
      .replace(/__KD_MANIFEST_URI__/g, manifestUri);

    return html;
  }

  getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length ? folders[0].uri.fsPath : null;
  }

  getEventsPath(root) {
    const configured = vscode.workspace.getConfiguration('kdPixel').get('eventsPath', '.kracked/runtime/events.jsonl');
    if (!configured) return root ? path.join(root, '.kracked', 'runtime', 'events.jsonl') : null;
    if (path.isAbsolute(configured)) return configured;
    return root ? path.join(root, configured) : configured;
  }

  getLayout() {
    const saved = this.context.workspaceState.get(LAYOUT_STATE_KEY);
    if (isValidLayout(saved)) return saved;
    return loadBundledDefaultLayout(this.context.extensionPath);
  }

  async resetLayout(showToast = false) {
    const layout = loadBundledDefaultLayout(this.context.extensionPath);
    await this.context.workspaceState.update(LAYOUT_STATE_KEY, layout);
    if (showToast) {
      vscode.window.showInformationMessage('KD Pixel office layout has been reset.');
    }
    if (this.view && this.ready) {
      this.view.webview.postMessage({ type: 'layoutLoaded', layout });
    }
    this.refresh();
  }

  ensureNumericId(agentKey) {
    const key = String(agentKey || '').trim() || 'unknown-agent';
    if (Number.isInteger(this.agentIdByKey[key])) {
      return this.agentIdByKey[key];
    }

    const id = this.nextNumericId++;
    this.agentIdByKey[key] = id;
    this.context.workspaceState.update(AGENT_ID_MAP_KEY, this.agentIdByKey);
    this.context.workspaceState.update(NEXT_AGENT_ID_KEY, this.nextNumericId);
    return id;
  }

  refresh() {
    if (!this.view || !this.ready) return;

    const snapshot = this.buildAgentSnapshot();
    const latest = snapshot.latest;
    const webview = this.view.webview;
    const seenNow = new Set(snapshot.ids);

    for (const id of seenNow) {
      if (!this.activeNumericIds.has(id)) {
        this.activeNumericIds.add(id);
        webview.postMessage({ type: 'agentCreated', id, folderName: snapshot.folderNames[id] || undefined });
      }
    }

    for (const id of Array.from(this.activeNumericIds)) {
      if (!seenNow.has(id)) {
        this.activeNumericIds.delete(id);
        this.lastSignatureById.delete(id);
        webview.postMessage({ type: 'agentClosed', id });
      }
    }

    for (const event of latest) {
      const agentKey = String(event.agent_id || event.agent_name || 'unknown-agent');
      const numericId = this.ensureNumericId(agentKey);
      if (!seenNow.has(numericId)) continue;

      const signature = buildEventSignature(event);
      if (this.lastSignatureById.get(numericId) === signature) continue;
      this.lastSignatureById.set(numericId, signature);

      webview.postMessage({ type: 'agentToolsClear', id: numericId });

      const statusText = makeToolStatus(event);
      const toolId = `kd-${hash32(signature)}`;
      webview.postMessage({
        type: 'agentToolStart',
        id: numericId,
        toolId,
        status: statusText,
      });

      if (event.target_agent_id) {
        const label = String(event.target_agent_id);
        webview.postMessage({
          type: 'agentToolStart',
          id: numericId,
          toolId: `${toolId}-sub`,
          status: `Subtask: delegate to ${label}`,
        });
      }

      const waiting = isWaitingAction(event.action);
      webview.postMessage({
        type: 'agentStatus',
        id: numericId,
        status: waiting ? 'waiting' : 'active',
      });

      webview.postMessage({
        type: 'agentPulse',
        id: numericId,
        agentName: String(event.agent_name || agentKey),
        role: String(event.role || 'Professional Agent'),
        action: String(event.action || ''),
        task: String(event.task || ''),
        message: String(event.message || ''),
      });
    }
  }

  buildAgentSnapshot() {
    const root = this.getWorkspaceRoot();
    const eventsPath = this.getEventsPath(root);
    const events = readEvents(eventsPath);
    const roster = loadAgentRoster(root);
    const augmentedEvents = synthesizeDelegationEvents(events, roster);
    const latest = getLatestEventsByAgent(augmentedEvents);
    const ids = [];
    const folderNames = {};
    const agentMeta = {};
    const agentIdentity = {};
    const seats = this.context.workspaceState.get(AGENT_SEATS_KEY, {});

    for (const event of latest) {
      const agentKey = String(event.agent_id || event.agent_name || 'unknown-agent');
      const numericId = this.ensureNumericId(agentKey);
      ids.push(numericId);
      folderNames[numericId] = String(event.source || '');

      const seatMeta = seats && typeof seats === 'object' ? seats[numericId] : null;
      const palette = Number.isInteger(seatMeta && seatMeta.palette) ? seatMeta.palette : (numericId - 1) % 6;
      const hueShift = Number.isInteger(seatMeta && seatMeta.hueShift) ? seatMeta.hueShift : 0;
      const seatId = seatMeta && typeof seatMeta.seatId === 'string' ? seatMeta.seatId : null;
      agentMeta[numericId] = { palette, hueShift, seatId };
      agentIdentity[numericId] = {
        id: agentKey,
        name: String(event.agent_name || agentKey),
        role: String(event.role || 'Professional Agent'),
      };
    }

    return {
      latest,
      ids: ids.sort((a, b) => a - b),
      folderNames,
      agentMeta,
      agentIdentity,
    };
  }

  async exportLayout() {
    const uri = await vscode.window.showSaveDialog({
      filters: { 'JSON Files': ['json'] },
      defaultUri: vscode.Uri.file(path.join(this.getWorkspaceRoot() || process.cwd(), 'kd-layout.json')),
    });
    if (!uri) return;
    fs.writeFileSync(uri.fsPath, JSON.stringify(this.getLayout(), null, 2), 'utf8');
    vscode.window.showInformationMessage('KD layout exported.');
  }

  async importLayout() {
    const uris = await vscode.window.showOpenDialog({
      filters: { 'JSON Files': ['json'] },
      canSelectMany: false,
    });
    if (!uris || uris.length === 0) return;
    try {
      const raw = fs.readFileSync(uris[0].fsPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!isValidLayout(parsed)) {
        vscode.window.showErrorMessage('Invalid layout file.');
        return;
      }
      await this.context.workspaceState.update(LAYOUT_STATE_KEY, parsed);
      if (this.view && this.ready) {
        this.view.webview.postMessage({ type: 'layoutLoaded', layout: parsed });
      }
      vscode.window.showInformationMessage('KD layout imported.');
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to import layout: ${err && err.message ? err.message : 'unknown error'}`);
    }
  }

  startPolling() {
    this.stopPolling();
    const intervalMs = vscode.workspace.getConfiguration('kdPixel').get('refreshIntervalMs', 1500);
    this.interval = setInterval(() => this.refresh(), Math.max(500, Number(intervalMs) || 1500));
  }

  stopPolling() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  dispose() {
    this.stopPolling();
  }

  async migrateLayoutStateIfNeeded() {
    const current = this.context.workspaceState.get(LAYOUT_STATE_KEY);
    const bundleSig = getBundledLayoutSignature(this.context.extensionPath);
    const savedSig = this.context.workspaceState.get(LAYOUT_BUNDLE_SIG_KEY);
    const bundledLayout = loadBundledDefaultLayout(this.context.extensionPath);
    const bundledFingerprint = getLayoutFingerprint(bundledLayout);
    const currentFingerprint = getLayoutFingerprint(current);
    const currentFurnitureCount = countLayoutFurniture(current);
    const needsReset = !isValidLayout(current)
      || !savedSig
      || savedSig !== bundleSig
      || currentFurnitureCount < 20
      || currentFingerprint !== bundledFingerprint;

    if (needsReset) {
      await this.context.workspaceState.update(LAYOUT_STATE_KEY, bundledLayout);
    }
    await this.context.workspaceState.update(LAYOUT_BUNDLE_SIG_KEY, bundleSig);

    for (const key of LEGACY_LAYOUT_STATE_KEYS) {
      const legacy = this.context.workspaceState.get(key);
      if (legacy !== undefined) {
        await this.context.workspaceState.update(key, undefined);
      }
    }
  }

  isKDWorkspace() {
    const root = this.getWorkspaceRoot();
    return Boolean(root && fs.existsSync(path.join(root, '.kracked', 'runtime', 'events.jsonl')));
  }
}

function loadBundledDefaultLayout(extensionPath) {
  const cols = 52;
  const rows = 32;
  const tiles = new Array(cols * rows).fill('floor');
  return {
    version: 1,
    cols,
    rows,
    tiles,
    furniture: [],
  };
}

function isValidLayout(layout) {
  if (!layout || typeof layout !== 'object') return false;
  const cols = Number(layout.cols);
  const rows = Number(layout.rows);
  const tiles = Array.isArray(layout.tiles) ? layout.tiles : null;
  const furniture = Array.isArray(layout.furniture) ? layout.furniture : null;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) return false;
  if (!tiles || !furniture) return false;
  if (tiles.length !== cols * rows) return false;
  return true;
}

function countLayoutFurniture(layout) {
  if (!layout || typeof layout !== 'object') return 0;
  const furniture = Array.isArray(layout.furniture) ? layout.furniture : [];
  return furniture.length;
}

function getLayoutFingerprint(layout) {
  if (!isValidLayout(layout)) return 'invalid-layout';
  const normalizedFurniture = (layout.furniture || []).map((item) => ({
    type: item && item.type ? String(item.type) : '',
    col: Number(item && item.col),
    row: Number(item && item.row),
    state: item && item.state ? String(item.state) : '',
    rotation: Number(item && item.rotation || 0),
    variant: item && item.variant ? String(item.variant) : '',
    color: item && item.color && typeof item.color === 'object'
      ? {
        r: Number(item.color.r),
        g: Number(item.color.g),
        b: Number(item.color.b),
      }
      : null,
  }));

  const payload = JSON.stringify({
    version: Number(layout.version || 1),
    cols: Number(layout.cols),
    rows: Number(layout.rows),
    tiles: Array.isArray(layout.tiles) ? layout.tiles : [],
    tileColors: Array.isArray(layout.tileColors) ? layout.tileColors : [],
    furniture: normalizedFurniture,
  });

  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

function getBundledLayoutSignature(extensionPath) {
  return 'kd-rpg-world-layout-v1';
}

function readEvents(eventsPath) {
  if (!eventsPath || !fs.existsSync(eventsPath)) return [];
  try {
    const raw = fs.readFileSync(eventsPath, 'utf8');
    if (!raw.trim()) return [];
    const lines = raw.split(/\r?\n/).filter(Boolean).slice(-MAX_EVENTS);
    const events = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
          events.push(parsed);
        }
      } catch {
        // ignore malformed event lines
      }
    }
    return events;
  } catch {
    return [];
  }
}

function eventTime(event) {
  const ts = new Date(event.ts || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function isMainEvent(event) {
  const agentId = String(event.agent_id || '').toLowerCase();
  const role = String(event.role || '').toLowerCase();
  return agentId === 'main-agent' || role.includes('master') || role.includes('main');
}

function getLatestEventsByAgent(events) {
  const latestByAgent = new Map();

  for (const event of events) {
    const key = String(event.agent_id || event.agent_name || 'unknown-agent');
    const current = latestByAgent.get(key);
    if (!current || eventTime(event) >= eventTime(current)) {
      latestByAgent.set(key, event);
    }
  }

  return Array.from(latestByAgent.values()).sort((a, b) => {
    const aMain = isMainEvent(a);
    const bMain = isMainEvent(b);
    if (aMain && !bMain) return -1;
    if (bMain && !aMain) return 1;
    return eventTime(b) - eventTime(a);
  });
}

function loadAgentRoster(root) {
  const defaults = {
    mainName: 'Main Agent',
    byRole: {
      analyst: 'Analyst',
      pm: 'PM',
      architect: 'Architect',
      'tech-lead': 'Tech Lead',
      engineer: 'Engineer',
      qa: 'QA',
      security: 'Security',
      devops: 'DevOps',
      'release-manager': 'Release Manager',
    },
  };

  if (!root) return defaults;
  const rosterPath = path.join(root, '.kracked', 'config', 'agents.json');
  if (!fs.existsSync(rosterPath)) return defaults;

  try {
    const parsed = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    const byRole = { ...defaults.byRole };
    if (parsed.byRole && typeof parsed.byRole === 'object') {
      for (const [role, name] of Object.entries(parsed.byRole)) {
        if (typeof name === 'string' && name.trim()) {
          byRole[role] = name.trim();
        }
      }
    }

    const mainName = parsed.main && typeof parsed.main === 'object' && typeof parsed.main.name === 'string'
      ? parsed.main.name.trim() || defaults.mainName
      : defaults.mainName;

    return { mainName, byRole };
  } catch {
    return defaults;
  }
}

function normalizeTask(taskRaw) {
  const raw = String(taskRaw || '').trim().toLowerCase();
  if (!raw) return '';

  // keep first token only so "kd-dev-story story-1" still maps.
  let token = raw.split(/\s+/)[0];
  token = token.replace(/^\/+/, '');
  token = token.replace(/\.md$/, '');
  token = token.replace(/^kd_/, 'kd-');
  return token;
}

function taskCandidates(taskRaw) {
  const raw = String(taskRaw || '').trim().toLowerCase();
  if (!raw) return [];

  const compact = raw
    .replace(/\.md/g, ' ')
    .replace(/[(){}[\],]/g, ' ')
    .trim();

  const tokens = compact.split(/\s+/).filter(Boolean).map((t) => t.replace(/^\/+/, '').replace(/^kd_/, 'kd-'));
  const first = normalizeTask(raw);
  const out = [];

  if (first) out.push(first);
  for (const token of tokens) {
    if (!out.includes(token)) out.push(token);
  }

  return out;
}

function roleToAgentId(role) {
  return `${role}-agent`;
}

function roleTitle(role) {
  return ROLE_TITLES[role] || 'Professional Agent';
}

function rolesForTask(taskRaw) {
  const candidates = taskCandidates(taskRaw);
  if (candidates.length === 0) return [];

  const roles = new Set();

  for (const task of candidates) {
    if (TASK_DELEGATION_MAP[task]) {
      for (const role of TASK_DELEGATION_MAP[task]) roles.add(role);
      continue;
    }

    if (task.startsWith('kd-role-')) {
      const role = task.slice('kd-role-'.length);
      if (ROLE_TITLES[role]) roles.add(role);
      continue;
    }

    // Fuzzy match for strings like "workflows/KD-dev-story.md".
    for (const [key, mappedRoles] of Object.entries(TASK_DELEGATION_MAP)) {
      if (task.includes(key)) {
        for (const role of mappedRoles) roles.add(role);
      }
    }
  }

  return [...roles];
}

function rolesFromText(textRaw) {
  const text = String(textRaw || '').trim().toLowerCase();
  if (!text) return [];

  const roles = new Set();
  for (const [role, hints] of Object.entries(ROLE_HINTS)) {
    if (hints.some((hint) => text.includes(hint))) {
      roles.add(role);
    }
  }
  return [...roles];
}

function rolesFromTarget(targetRaw, roster) {
  const target = String(targetRaw || '').trim().toLowerCase();
  if (!target) return [];

  const segments = target
    .split(/[,\n;|]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length === 0) segments.push(target);

  const roles = new Set();
  for (const segment of segments) {
    for (const role of Object.keys(ROLE_TITLES)) {
      if (segment === role || segment === `${role}-agent`) roles.add(role);
    }

    for (const [role, name] of Object.entries(roster.byRole || {})) {
      if (String(name || '').trim().toLowerCase() === segment) roles.add(role);
    }

    for (const role of rolesFromText(segment)) {
      if (ROLE_TITLES[role]) roles.add(role);
    }
  }

  return [...roles];
}

function inferDelegatedAction(mainActionRaw, role) {
  const mainAction = String(mainActionRaw || '').toLowerCase();
  if (mainAction.includes('wait') || mainAction.includes('idle')) return 'waiting';
  if (role === 'engineer') return 'typing';
  if (role === 'qa' || role === 'security' || role === 'analyst' || role === 'architect') return 'reading';
  if (role === 'devops') return 'running';
  return 'working';
}

function hasRecentActivityForRole(events, role, rosterName, sinceTs) {
  const id = roleToAgentId(role);
  const since = Number.isFinite(sinceTs) ? sinceTs : 0;
  const rosterLower = String(rosterName || '').trim().toLowerCase();

  return events.some((event) => {
    const t = eventTime(event);
    if (t < since) return false;

    const eventId = String(event.agent_id || '').trim().toLowerCase();
    const eventName = String(event.agent_name || '').trim().toLowerCase();
    const eventRole = String(event.role || '').trim().toLowerCase();

    if (eventId === id) return true;
    if (rosterLower && eventName === rosterLower) return true;
    if (eventRole.includes(role.replace('-', ' ')) || eventRole.includes(role)) return true;
    return false;
  });
}

function synthesizeDelegationEvents(events, roster) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const synthetic = [];
  const latestMain = [...events]
    .filter((event) => isMainEvent(event))
    .sort((a, b) => eventTime(b) - eventTime(a))[0];

  if (latestMain) {
    const roleSet = new Set([
      ...rolesForTask(latestMain.task),
      ...rolesFromText(latestMain.message),
      ...rolesFromText(latestMain.action),
    ]);
    let roles = [...roleSet];
    if (roles.length === 0) {
      const signal = `${String(latestMain.action || '')} ${String(latestMain.message || '')}`.toLowerCase();
      if (/(delegat|consult|ask|help|assist)/.test(signal)) {
        roles = ['analyst'];
      }
    }
    const mainTs = eventTime(latestMain);
    for (const role of roles) {
      const name = roster.byRole[role] || roleTitle(role);
      if (hasRecentActivityForRole(events, role, name, mainTs)) continue;

      synthetic.push({
        ts: latestMain.ts || new Date().toISOString(),
        agent_id: roleToAgentId(role),
        agent_name: name,
        role: roleTitle(role),
        action: inferDelegatedAction(latestMain.action, role),
        source: latestMain.source || 'kd',
        task: latestMain.task || '',
        message: `${name} handling delegated task`,
      });
    }
  }

  const targetLatestByRole = new Map();
  for (const event of events) {
    if (!event.target_agent_id) continue;
    const roles = rolesFromTarget(event.target_agent_id, roster);
    if (roles.length === 0) continue;
    for (const role of roles) {
      const current = targetLatestByRole.get(role);
      if (!current || eventTime(event) >= eventTime(current)) {
        targetLatestByRole.set(role, event);
      }
    }
  }

  for (const [role, parentEvent] of targetLatestByRole.entries()) {
    const name = roster.byRole[role] || roleTitle(role);
    if (hasRecentActivityForRole(events, role, name, eventTime(parentEvent))) continue;

    synthetic.push({
      ts: parentEvent.ts || new Date().toISOString(),
      agent_id: roleToAgentId(role),
      agent_name: name,
      role: roleTitle(role),
      action: inferDelegatedAction(parentEvent.action, role),
      source: parentEvent.source || 'kd',
      task: parentEvent.task || '',
      message: `${name} responding to main-agent delegation`,
    });
  }

  if (synthetic.length === 0) return events;
  return [...events, ...synthetic];
}

function buildEventSignature(event) {
  return [
    event.ts || '',
    event.action || '',
    event.task || '',
    event.message || '',
    event.source || '',
    event.target_agent_id || '',
  ].join('|');
}

function isWaitingAction(actionRaw) {
  const action = String(actionRaw || '').toLowerCase();
  return action.includes('wait') || action.includes('idle') || action.includes('done') || action.includes('complete');
}

function makeToolStatus(event) {
  const action = String(event.action || 'working').trim() || 'working';
  const task = String(event.task || '').trim();
  if (task) return `${action}: ${task}`;
  return action;
}

function hash32(input) {
  const s = String(input || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

module.exports = {
  activate,
  deactivate,
};
