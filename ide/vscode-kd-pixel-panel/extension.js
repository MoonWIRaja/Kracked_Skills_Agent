const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const MAX_EVENTS = 600;
const VIEW_ID = 'kdPixel.panelView';
const LAYOUT_STATE_KEY = 'kdPixel.officeLayout';
const AGENT_ID_MAP_KEY = 'kdPixel.agentIdByKey';
const NEXT_AGENT_ID_KEY = 'kdPixel.nextAgentNumericId';
const AGENT_SEATS_KEY = 'kdPixel.agentSeats';
const SOUND_ENABLED_KEY = 'kdPixel.soundEnabled';

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

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    this.ready = false;
    this.activeNumericIds.clear();
    this.lastSignatureById.clear();

    this.view.webview.options = { enableScripts: true };
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
    if (saved && typeof saved === 'object') return saved;
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
        webview.postMessage({ type: 'agentCreated', id, folderName: folderNames[id] || undefined });
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
    }
  }

  buildAgentSnapshot() {
    const root = this.getWorkspaceRoot();
    const eventsPath = this.getEventsPath(root);
    const events = readEvents(eventsPath);
    const latest = getLatestEventsByAgent(events);
    const ids = [];
    const folderNames = {};
    const agentMeta = {};
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
    }

    return {
      latest,
      ids: ids.sort((a, b) => a - b),
      folderNames,
      agentMeta,
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
      if (!parsed || typeof parsed !== 'object') {
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

  isKDWorkspace() {
    const root = this.getWorkspaceRoot();
    return Boolean(root && fs.existsSync(path.join(root, '.kracked', 'runtime', 'events.jsonl')));
  }
}

function loadBundledDefaultLayout(extensionPath) {
  const layoutPath = path.join(extensionPath, 'dist', 'webview', 'assets', 'default-layout.json');
  if (fs.existsSync(layoutPath)) {
    try {
      const raw = fs.readFileSync(layoutPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      // fall through
    }
  }

  return {
    version: 1,
    cols: 20,
    rows: 11,
    tiles: [],
    furniture: [],
  };
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
