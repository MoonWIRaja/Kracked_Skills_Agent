const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const MAX_EVENTS = 1200;
const VIEW_ID = 'kdPixel.panelView';

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
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    this.ready = false;

    this.view.webview.options = { enableScripts: true };
    this.view.webview.html = this.getWebviewHtml();

    this.view.onDidDispose(() => {
      this.stopPolling();
      this.ready = false;
      this.view = null;
    });

    this.view.webview.onDidReceiveMessage((message) => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'webviewReady') {
        this.ready = true;
        this.refresh();
        return;
      }
      if (message.type === 'refresh') {
        this.refresh();
      }
    });

    this.startPolling();
    this.refresh();
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

  buildState() {
    const root = this.getWorkspaceRoot();
    const eventsPath = this.getEventsPath(root);
    const events = readEvents(eventsPath);
    const roster = loadAgentRoster(root);
    const stream = synthesizeDelegationEvents(events, roster);
    return buildDisplayState(stream);
  }

  refresh() {
    if (!this.view || !this.ready) return;
    const state = this.buildState();
    this.view.webview.postMessage({ type: 'state', state });
  }

  async resetLayout(showToast = false) {
    if (showToast) {
      vscode.window.showInformationMessage('KD RPG WORLD panel uses a fixed layout.');
    }
    this.refresh();
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

  getWebviewHtml() {
    const nonce = getNonce();
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KD RPG WORLD</title>
  <style>
    :root{--bg:#070b1d;--panel:rgba(11,20,34,.9);--line:#44608b;--text:#e6f4ff;--muted:#95aac7;--ok:#86f5b0;--warn:#ffd77a}
    *{box-sizing:border-box}
    html,body{margin:0;height:100%;font-family:Consolas,"JetBrains Mono",monospace;background:radial-gradient(circle at center,#20254b 0%,var(--bg) 72%);color:var(--text)}
    .root{height:100%;display:grid;grid-template-columns:1fr 320px;gap:12px;padding:12px}
    .stage{position:relative;border:1px solid var(--line);background:linear-gradient(180deg,#0a1225,#080f1f);overflow:hidden}
    #world{width:100%;height:100%;display:block;image-rendering:pixelated}
    .hud{position:absolute;top:8px;left:8px;display:grid;gap:6px;z-index:5}
    .btn{width:38px;height:38px;border:1px solid #7889a8;background:rgba(34,41,74,.9);color:#d7e5ff;font-size:23px;cursor:pointer}
    .legend{position:absolute;left:8px;bottom:8px;display:flex;gap:6px;background:rgba(5,10,18,.72);border:1px solid #35517e;padding:6px;z-index:5}
    .chip{font-size:11px;border:1px solid #4f6f9f;padding:4px 6px;color:#cde0ff}
    .side{border:1px solid var(--line);background:var(--panel);display:grid;grid-template-rows:auto auto 1fr}
    .box{padding:10px;border-bottom:1px solid rgba(97,127,166,.3)}
    .title{font-size:12px;letter-spacing:.1em;color:#a6c2e9;text-transform:uppercase;margin-bottom:8px}
    .kpi{display:grid;gap:6px;font-size:12px;color:var(--muted)} .kpi b{color:var(--ok)}
    .agent-list,.log-list{overflow:auto;max-height:100%}
    .agent{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:6px 0;border-bottom:1px dashed rgba(96,124,160,.3)}
    .name{font-size:12px;color:#e8f5ff} .meta{font-size:11px;color:var(--muted)}
    .badge{font-size:10px;border:1px solid #5675a6;color:var(--warn);padding:2px 5px}
    .event{padding:6px 0;border-bottom:1px dashed rgba(96,124,160,.3)}
    .event-time{color:#87b8ff;font-size:11px} .event-msg{color:#d8ecff;font-size:12px;margin-top:2px} .event-meta{color:var(--muted);font-size:11px}
    @media (max-width:1100px){.root{grid-template-columns:1fr;grid-template-rows:1fr 320px}}
  </style>
</head>
<body>
  <div class="root">
    <section class="stage">
      <canvas id="world" width="960" height="720"></canvas>
      <div class="hud">
        <button class="btn" id="zoomIn" title="Zoom In">+</button>
        <button class="btn" id="zoomOut" title="Zoom Out">-</button>
        <button class="btn" id="refreshNow" title="Refresh">R</button>
      </div>
      <div class="legend"><span class="chip">KD RPG WORLD</span><span class="chip">Guild Command</span><span class="chip">Dark Ops</span><span class="chip">Wild Frontier</span></div>
    </section>
    <aside class="side">
      <div class="box"><div class="title">System</div><div class="kpi"><div>Status: <b id="status">Connecting...</b></div><div>Total events: <b id="kEvents">0</b></div><div>Agents: <b id="kAgents">0</b></div><div>Updated: <b id="kUpdated">-</b></div></div></div>
      <div class="box"><div class="title">Agents</div><div class="agent-list" id="agentList"></div></div>
      <div class="box" style="border-bottom:none"><div class="title">Recent Events</div><div class="log-list" id="logList"></div></div>
    </aside>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const T={F:0,D:1,W:2,T:3,S:4,C:5,WA:6,R:7,RU:8,CA:9,B:10,SH:11,P:12,PA:13},COLS=20,ROWS=15,TILE=16,BUBBLE=5000,WALK=3.4;
    let SCALE=3,last=performance.now(),lastStateAt=0;
    const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
    const statusEl=document.getElementById('status'),kEvents=document.getElementById('kEvents'),kAgents=document.getElementById('kAgents'),kUpdated=document.getElementById('kUpdated');
    const agentList=document.getElementById('agentList'),logList=document.getElementById('logList');
    const agents=new Map();
    const world=(()=>{const g=Array.from({length:ROWS},()=>Array.from({length:COLS},()=>T.F));const z=Array.from({length:ROWS},()=>Array.from({length:COLS},()=> 'guild'));
      const set=(x,y,v)=>{if(x>=0&&x<COLS&&y>=0&&y<ROWS)g[y][x]=v},zone=(x1,y1,x2,y2,n)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(x>=0&&x<COLS&&y>=0&&y<ROWS)z[y][x]=n};
      zone(1,1,11,13,'guild'); zone(12,1,18,7,'darkops'); zone(12,8,18,13,'wild');
      for(let x=0;x<COLS;x++){set(x,0,T.W);set(x,ROWS-1,T.W)} for(let y=0;y<ROWS;y++){set(0,y,T.W);set(COLS-1,y,T.W)}
      for(let x=2;x<=17;x++)set(x,7,T.PA); for(let y=2;y<=12;y++)set(10,y,T.PA); for(let y=5;y<=9;y++)set(12,y,T.PA);
      [[3,3],[7,3],[3,8],[7,8]].forEach(p=>set(p[0],p[1],T.D)); [[2,2],[4,2],[6,2],[8,2],[2,11],[8,11]].forEach(p=>set(p[0],p[1],T.SH)); set(5,1,T.P);
      [[14,2],[15,2],[16,2],[14,4],[15,4],[16,4]].forEach(p=>set(p[0],p[1],T.S)); [[13,2],[17,2],[13,4],[17,4]].forEach(p=>set(p[0],p[1],T.C)); [[14,6],[15,6],[16,6]].forEach(p=>set(p[0],p[1],T.RU));
      for(let x=12;x<=18;x++)set(x,10,T.WA); set(14,10,T.B); set(15,10,T.B); [[13,9],[17,9],[12,12],[18,12],[16,12]].forEach(p=>set(p[0],p[1],T.T)); [[13,11],[17,11],[18,9]].forEach(p=>set(p[0],p[1],T.R)); set(15,8,T.CA);
      return {g,z};
    })();
    const walk=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS&&[T.F,T.PA,T.B,T.RU].includes(world.g[y][x]);
    const norm=(v)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const roleColor=(r)=>{r=String(r||'').toLowerCase(); if(r.includes('master'))return '#7ef29a'; if(r.includes('analyst'))return '#ffe082'; if(r.includes('product'))return '#68d1ff'; if(r.includes('architect'))return '#ff9b67'; if(r.includes('tech lead'))return '#bba4ff'; if(r.includes('engineer'))return '#8ce7ff'; if(r==='qa'||r.includes('quality'))return '#f4ffa9'; if(r.includes('security'))return '#ff7d7d'; if(r.includes('devops'))return '#87b8ff'; if(r.includes('release'))return '#ffc07a'; return '#d2f5dc';};
    const rand=()=>{for(let i=0;i<200;i++){const x=Math.floor(Math.random()*COLS),y=Math.floor(Math.random()*ROWS); if(walk(x,y))return{x,y}} return{x:1,y:1}};
    const spawn=(role,id)=>{const r=norm(role).replace(/-agent$/,''),k=norm(id); if(k.includes('main'))return[{x:10,y:7},{x:11,y:7}]; if(r.includes('engineer')||r.includes('tech-lead'))return[{x:4,y:4},{x:8,y:4},{x:4,y:9},{x:8,y:9}]; if(r.includes('security')||r.includes('qa')||r.includes('devops'))return[{x:14,y:5},{x:15,y:5},{x:16,y:5},{x:13,y:6}]; if(r.includes('analyst')||r.includes('pm')||r.includes('architect')||r.includes('release'))return[{x:14,y:8},{x:16,y:8},{x:15,y:11}]; return[{x:10,y:8},{x:9,y:7},{x:11,y:8}]};
    const pick=(role,id)=>{for(const p of spawn(role,id))if(walk(p.x,p.y))return p; return rand()};
    const fit=()=>{const r=canvas.parentElement.getBoundingClientRect(); canvas.width=Math.max(640,Math.floor(r.width)); canvas.height=Math.max(420,Math.floor(r.height));};
    const time=(ts)=>{if(!ts)return '-'; const d=new Date(ts); return Number.isNaN(d.getTime())?'-':d.toISOString().slice(11,19)};
    function drawTile(x,y,t,now){const px=x*TILE,py=y*TILE,z=world.z[y][x];
      ctx.fillStyle=t===T.PA?((x+y)%2===0?'#8f6a3f':'#7d5a34'):(z==='guild'?((x+y)%2===0?'#9b6c3d':'#8d6135'):(z==='darkops'?((x+y)%2===0?'#2a3448':'#222c3f'):((x+y)%2===0?'#4e7898':'#446c8b'))); ctx.fillRect(px,py,TILE,TILE);
      if(t===T.W){ctx.fillStyle='#1b2230';ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle='#2a3347';ctx.fillRect(px+1,py+1,TILE-2,TILE-2);}
      else if(t===T.D){ctx.fillStyle='#6c431f';ctx.fillRect(px+2,py+4,TILE-4,TILE-6);ctx.fillStyle='#b7ccf6';ctx.fillRect(px+6,py+6,TILE-12,4);}
      else if(t===T.SH){ctx.fillStyle='#5c3d25';ctx.fillRect(px+2,py+3,TILE-4,TILE-6);ctx.fillStyle='#b3d08f';ctx.fillRect(px+4,py+5,3,2);ctx.fillStyle='#86a9db';ctx.fillRect(px+8,py+5,3,2);}
      else if(t===T.S){ctx.fillStyle='#0f172a';ctx.fillRect(px+2,py+2,TILE-4,TILE-4);ctx.fillStyle='#1d2942';ctx.fillRect(px+4,py+4,TILE-8,TILE-8);ctx.fillStyle=now%1000<500?'#00f0a6':'#0b5a43';ctx.fillRect(px+6,py+6,2,2);ctx.fillRect(px+9,py+6,2,2);}
      else if(t===T.C){ctx.fillStyle='#5f89ff';ctx.beginPath();ctx.moveTo(px+8,py+3);ctx.lineTo(px+11,py+7);ctx.lineTo(px+8,py+12);ctx.lineTo(px+5,py+7);ctx.closePath();ctx.fill();}
      else if(t===T.WA){ctx.fillStyle='#2c5f8d';ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle='#4f84b1';ctx.fillRect(px+2,py+5,5,1);ctx.fillRect(px+9,py+9,4,1);}
      else if(t===T.B){ctx.fillStyle='#2c5f8d';ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle='#7f5a36';ctx.fillRect(px,py+4,TILE,8);ctx.fillStyle='#9a7248';for(let i=1;i<TILE;i+=4)ctx.fillRect(px+i,py+4,1,8);}
      else if(t===T.T){ctx.fillStyle='#67412a';ctx.fillRect(px+7,py+9,2,5);ctx.fillStyle='#3d8b4a';ctx.fillRect(px+4,py+4,8,6);ctx.fillStyle='#58ad63';ctx.fillRect(px+6,py+3,4,3);}
      else if(t===T.R){ctx.fillStyle='#7a7f8f';ctx.fillRect(px+4,py+7,8,5);}
      else if(t===T.RU){ctx.fillStyle='#5e71c3';ctx.fillRect(px+4,py+4,8,8);ctx.fillStyle='#9bb0ff';ctx.fillRect(px+7,py+5,2,6);ctx.fillRect(px+5,py+7,6,2);}
      else if(t===T.CA){ctx.fillStyle='#6f4d2b';ctx.fillRect(px+5,py+11,6,2);ctx.fillStyle='#ff7f2a';ctx.fillRect(px+7,py+7,2,4);}
      else if(t===T.P){ctx.fillStyle='#2e1d4d';ctx.fillRect(px+3,py+3,10,10);ctx.fillStyle='#8c5bff';ctx.fillRect(px+4,py+4,8,8);ctx.fillStyle=now%1000<500?'#d2b5ff':'#b58eff';ctx.fillRect(px+6,py+6,4,4);}
    }
    function drawMap(now){for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)drawTile(x,y,world.g[y][x],now);}
    function drawAgent(a){const px=a.x*TILE,py=a.y*TILE; ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px+5,py+13,6,2); ctx.fillStyle='#f5c9a3';ctx.fillRect(px+5,py+3,6,5); ctx.fillStyle=a.color;ctx.fillRect(px+4,py+8,8,6); if(a.state==='active'){ctx.fillStyle='#d9f4ff';ctx.fillRect(px+6,py+10,1,1);ctx.fillRect(px+9,py+10,1,1);} ctx.fillStyle='#f0fbff';ctx.font='5px Consolas,monospace';ctx.textAlign='center';ctx.fillText(a.name,px+8,py+1); if(a.bubble&&Date.now()<a.bubbleUntil){const txt=a.bubble;ctx.font='5px Consolas,monospace';const w=Math.min(ctx.measureText(txt).width+6,132),h=10,bx=px+8-w/2,by=py-12;ctx.fillStyle='rgba(11,18,34,.93)';ctx.fillRect(bx,by,w,h);ctx.strokeStyle='#6d8dbd';ctx.strokeRect(bx,by,w,h);ctx.fillStyle='#dff0ff';ctx.fillText(txt,px+8,by+7,w-4);}}
    function pickTarget(a){const opts=spawn(a.role,a.id); if(Math.random()<.75&&opts.length){const p=opts[Math.floor(Math.random()*opts.length)]; if(walk(p.x,p.y))return p;} return rand();}
    function renderSidebar(state){const list=Array.isArray(state.agents)?state.agents:[],recent=Array.isArray(state.recent)?state.recent:[]; agentList.innerHTML=list.slice(0,18).map((a)=>{const top=Object.entries(a.actions||{}).sort((x,y)=>y[1]-x[1])[0];const act=top?top[0]:'-';return '<div class="agent"><div><div class="name">'+(a.name||a.id||'-')+'</div><div class="meta">'+(a.role||'-')+' | '+act+'</div></div><span class="badge">'+(a.total||0)+' evt</span></div>';}).join('')||'<div class="meta">Waiting for agents...</div>'; logList.innerHTML=recent.slice(0,18).map((e)=>'<div class="event"><div class="event-time">['+time(e.ts)+'] '+(e.agent_name||e.agent_id||'-')+'</div><div class="event-msg">'+(e.message||e.task||e.action||'-')+'</div><div class="event-meta">'+(e.action||'-')+(e.task?' | '+e.task:'')+'</div></div>').join('')||'<div class="meta">No events yet.</div>';}
    function updateState(state){const now=Date.now(),seen=new Set(),roster=Array.isArray(state.agents)?state.agents:[],recent=Array.isArray(state.recent)?state.recent:[]; for(const a of roster){const id=String(a.id||a.name||'unknown');seen.add(id); let e=agents.get(id); if(!e){const s=pick(a.role,id); e={id,name:a.name||id,role:a.role||'-',x:s.x,y:s.y,tx:s.x,ty:s.y,color:roleColor(a.role),state:'active',bubble:'',bubbleUntil:0,lastSeen:now}; agents.set(id,e);} e.name=String(a.name||e.name); e.role=String(a.role||e.role); e.color=roleColor(e.role); e.lastSeen=now; const top=Object.entries(a.actions||{}).sort((x,y)=>y[1]-x[1])[0]; const action=top?String(top[0]):String(a.last_action||''); e.state=/wait|idle|done|complete/i.test(action)?'waiting':'active'; const evt=recent.find((r)=>String(r.agent_id||r.id||'')===id||String(r.agent_name||'')===e.name); if(evt){const msg=String(evt.message||evt.task||evt.action||'').trim(); if(msg){e.bubble=msg.length>42?msg.slice(0,39)+'...':msg; e.bubbleUntil=now+BUBBLE;}} if(Math.random()<.18){const p=pickTarget(e);e.tx=p.x;e.ty=p.y;}} for(const pair of agents){const id=pair[0],e=pair[1]; if(!seen.has(id)&&now-e.lastSeen>120000) agents.delete(id);} kEvents.textContent=String(state.total_events||0); kAgents.textContent=String(roster.length); kUpdated.textContent=time(state.updated_at); renderSidebar(state);}
    function update(dt){const speed=WALK*dt; for(const e of agents.values()){const dx=e.tx-e.x,dy=e.ty-e.y,dist=Math.sqrt(dx*dx+dy*dy); if(dist>.05){const step=Math.min(speed,dist);e.x+=(dx/dist)*step;e.y+=(dy/dist)*step;} else if(Math.random()<.002){const p=pickTarget(e);e.tx=p.x;e.ty=p.y;}}}
    function draw(now){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height); const ww=COLS*TILE*SCALE,wh=ROWS*TILE*SCALE,ox=Math.floor((canvas.width-ww)/2),oy=Math.floor((canvas.height-wh)/2); ctx.translate(ox,oy);ctx.scale(SCALE,SCALE);ctx.imageSmoothingEnabled=false; drawMap(now); const sorted=[...agents.values()].sort((a,b)=>a.y-b.y); for(const a of sorted) drawAgent(a); ctx.restore();}
    function loop(now){const dt=Math.min(.05,(now-last)/1000); last=now; update(dt); draw(now); requestAnimationFrame(loop);}
    document.getElementById('zoomIn').addEventListener('click',()=>{SCALE=Math.min(5,SCALE+.5); draw(performance.now());});
    document.getElementById('zoomOut').addEventListener('click',()=>{SCALE=Math.max(2,SCALE-.5); draw(performance.now());});
    document.getElementById('refreshNow').addEventListener('click',()=>{vscode.postMessage({type:'refresh'});});
    window.addEventListener('resize',()=>{fit(); draw(performance.now());});
    window.addEventListener('message',(ev)=>{const msg=ev.data||{}; if(msg.type==='state'){ lastStateAt=Date.now(); statusEl.textContent='Online'; statusEl.style.color='#86f5b0'; updateState(msg.state||{}); }});
    setInterval(()=>{if(Date.now()-lastStateAt>5000){statusEl.textContent='Waiting events';statusEl.style.color='#ffd77a';}},1000);
    fit();
    requestAnimationFrame(loop);
    vscode.postMessage({type:'webviewReady'});
  </script>
</body>
</html>`;
  }
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
        if (parsed && typeof parsed === 'object') events.push(parsed);
      } catch {
        // ignore malformed line
      }
    }
    return events;
  } catch {
    return [];
  }
}

function eventTime(event) {
  const ts = new Date(event && event.ts ? event.ts : 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function isMainEvent(event) {
  const id = String(event && event.agent_id ? event.agent_id : '').toLowerCase();
  const role = String(event && event.role ? event.role : '').toLowerCase();
  return id === 'main-agent' || role.includes('master') || role.includes('main');
}

function loadAgentRoster(root) {
  const defaults = {
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
    if (parsed && parsed.byRole && typeof parsed.byRole === 'object') {
      for (const entry of Object.entries(parsed.byRole)) {
        const role = entry[0];
        const name = entry[1];
        if (typeof name === 'string' && name.trim()) byRole[role] = name.trim();
      }
    }
    return { byRole };
  } catch {
    return defaults;
  }
}

function normalizeTask(rawTask) {
  let task = String(rawTask || '').trim().toLowerCase();
  if (!task) return '';
  task = task.split(/\s+/)[0];
  task = task.replace(/^\/+/, '').replace(/\.md$/, '').replace(/^kd_/, 'kd-');
  return task;
}

function rolesForTask(taskRaw) {
  const task = normalizeTask(taskRaw);
  if (!task) return [];

  if (TASK_DELEGATION_MAP[task]) return [...TASK_DELEGATION_MAP[task]];

  if (task.startsWith('kd-role-')) {
    const role = task.slice('kd-role-'.length);
    if (ROLE_TITLES[role]) return [role];
  }

  for (const entry of Object.entries(TASK_DELEGATION_MAP)) {
    const key = entry[0];
    const roles = entry[1];
    if (task.includes(key)) return [...roles];
  }

  return [];
}

function rolesFromText(rawText) {
  const text = String(rawText || '').trim().toLowerCase();
  if (!text) return [];
  const roles = new Set();
  for (const entry of Object.entries(ROLE_HINTS)) {
    const role = entry[0];
    const hints = entry[1];
    if (hints.some((hint) => text.includes(hint))) roles.add(role);
  }
  return [...roles];
}

function rolesFromTarget(rawTarget, roster) {
  const target = String(rawTarget || '').trim().toLowerCase();
  if (!target) return [];

  const parts = target.split(/[,\n;|]+/).map((s) => s.trim()).filter(Boolean);
  const segments = parts.length > 0 ? parts : [target];
  const roles = new Set();

  for (const segment of segments) {
    for (const role of Object.keys(ROLE_TITLES)) {
      if (segment === role || segment === `${role}-agent`) roles.add(role);
    }

    for (const entry of Object.entries((roster && roster.byRole) || {})) {
      const role = entry[0];
      const name = entry[1];
      if (String(name || '').toLowerCase() === segment) roles.add(role);
    }

    for (const role of rolesFromText(segment)) roles.add(role);
  }

  return [...roles];
}

function inferDelegatedAction(mainAction, role) {
  const action = String(mainAction || '').toLowerCase();
  if (action.includes('wait') || action.includes('idle')) return 'waiting';
  if (role === 'engineer') return 'typing';
  if (role === 'qa' || role === 'security' || role === 'analyst' || role === 'architect') return 'reading';
  if (role === 'devops') return 'running';
  return 'working';
}

function hasRecentActivityForRole(events, role, rosterName, sinceTs) {
  const id = `${role}-agent`;
  const since = Number.isFinite(sinceTs) ? sinceTs : 0;
  const name = String(rosterName || '').trim().toLowerCase();

  return events.some((event) => {
    if (eventTime(event) < since) return false;
    const eventId = String(event.agent_id || '').trim().toLowerCase();
    const eventName = String(event.agent_name || '').trim().toLowerCase();
    const eventRole = String(event.role || '').trim().toLowerCase();

    if (eventId === id) return true;
    if (name && eventName === name) return true;
    if (eventRole.includes(role.replace('-', ' ')) || eventRole.includes(role)) return true;
    return false;
  });
}

function synthesizeDelegationEvents(events, roster) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const synthetic = [];
  const latestMain = [...events].filter((event) => isMainEvent(event)).sort((a, b) => eventTime(b) - eventTime(a))[0];

  if (latestMain) {
    const roleSet = new Set([
      ...rolesForTask(latestMain.task),
      ...rolesFromText(latestMain.message),
      ...rolesFromText(latestMain.action),
    ]);
    let roles = [...roleSet];

    if (roles.length === 0) {
      const signal = `${String(latestMain.action || '')} ${String(latestMain.message || '')}`.toLowerCase();
      if (/(delegat|consult|ask|help|assist)/.test(signal)) roles = ['analyst'];
    }

    const mainTs = eventTime(latestMain);
    for (const role of roles) {
      const name = (roster && roster.byRole && roster.byRole[role]) || ROLE_TITLES[role] || 'Professional Agent';
      if (hasRecentActivityForRole(events, role, name, mainTs)) continue;

      synthetic.push({
        ts: latestMain.ts || new Date().toISOString(),
        agent_id: `${role}-agent`,
        agent_name: name,
        role: ROLE_TITLES[role] || 'Professional Agent',
        action: inferDelegatedAction(latestMain.action, role),
        source: latestMain.source || 'kd',
        task: latestMain.task || '',
        message: `${name} handling delegated task`,
      });
    }
  }

  const targetLatestByRole = new Map();
  for (const event of events) {
    if (!event || !event.target_agent_id) continue;
    const roles = rolesFromTarget(event.target_agent_id, roster);
    for (const role of roles) {
      const current = targetLatestByRole.get(role);
      if (!current || eventTime(event) >= eventTime(current)) targetLatestByRole.set(role, event);
    }
  }

  for (const entry of targetLatestByRole.entries()) {
    const role = entry[0];
    const parentEvent = entry[1];
    const name = (roster && roster.byRole && roster.byRole[role]) || ROLE_TITLES[role] || 'Professional Agent';
    if (hasRecentActivityForRole(events, role, name, eventTime(parentEvent))) continue;

    synthetic.push({
      ts: parentEvent.ts || new Date().toISOString(),
      agent_id: `${role}-agent`,
      agent_name: name,
      role: ROLE_TITLES[role] || 'Professional Agent',
      action: inferDelegatedAction(parentEvent.action, role),
      source: parentEvent.source || 'kd',
      task: parentEvent.task || '',
      message: `${name} responding to main-agent delegation`,
    });
  }

  return synthetic.length > 0 ? [...events, ...synthetic] : events;
}

function buildDisplayState(events) {
  const byAgent = new Map();
  for (const event of events) {
    const id = String(event.agent_id || event.agent_name || 'unknown');
    if (!byAgent.has(id)) {
      byAgent.set(id, {
        id,
        name: String(event.agent_name || id),
        role: String(event.role || '-'),
        actions: {},
        total: 0,
        source: String(event.source || '-'),
      });
    }

    const agent = byAgent.get(id);
    const action = String(event.action || 'unknown');
    agent.name = String(event.agent_name || agent.name);
    agent.role = String(event.role || agent.role);
    agent.source = String(event.source || agent.source);
    agent.total += 1;
    agent.last_ts = event.ts || agent.last_ts;
    agent.last_action = action;
    agent.last_task = String(event.task || '');
    agent.last_message = String(event.message || '');
    agent.actions[action] = (agent.actions[action] || 0) + 1;
  }

  const agents = [...byAgent.values()].sort((a, b) => {
    if (a.id === 'main-agent' && b.id !== 'main-agent') return -1;
    if (b.id === 'main-agent' && a.id !== 'main-agent') return 1;
    return b.total - a.total;
  });

  return {
    total_events: events.length,
    agents,
    recent: events.slice(-120).reverse(),
    updated_at: new Date().toISOString(),
  };
}

function getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < 24; i++) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

module.exports = {
  activate,
  deactivate,
};
