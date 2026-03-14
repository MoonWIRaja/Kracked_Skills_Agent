(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const state = {
    roster: null,
    transcripts: [],
    summary: null,
    xp: 0,
    level: 1,
  };

  let root = null;
  let mounted = false;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.id = 'kd-live-overlay';
    root.style.position = 'fixed';
    root.style.right = '16px';
    root.style.bottom = '16px';
    root.style.width = '360px';
    root.style.maxHeight = '52vh';
    root.style.zIndex = '9999';
    root.style.pointerEvents = 'none';
    document.body.appendChild(root);
    return root;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render() {
    const container = ensureRoot();
    const mainName = state.summary && state.summary.main_agent
      ? state.summary.main_agent
      : (state.roster && state.roster.main && state.roster.main.name) || 'Main Agent';

    const transcriptItems = state.transcripts.slice(0, 6).map((line) => `
      <div style="border:1px solid #21412c;background:#0a1710;border-radius:10px;padding:10px 12px;margin-top:8px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:#7fb189;text-transform:uppercase;letter-spacing:.08em;">
          <span>${escapeHtml(line.speaker_name || line.speaker_id || 'Agent')}</span>
          <span>/${escapeHtml(line.command || '-')}</span>
          <span>${escapeHtml(line.message_kind || 'message')}</span>
        </div>
        <div style="margin-top:6px;font-size:12px;line-height:1.55;color:#d3ecd7;">
          ${escapeHtml(line.text || '')}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="pointer-events:auto;border:1px solid #2b4d36;border-radius:14px;background:rgba(6,16,10,.94);box-shadow:0 20px 40px rgba(0,0,0,.28);padding:14px 14px 12px;color:#e3ffe8;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#96e5a4;">KD Live Overlay</div>
            <div style="margin-top:6px;font-size:16px;font-weight:700;">${escapeHtml(mainName)}</div>
            <div style="margin-top:4px;font-size:12px;color:#9ecaa7;">
              ${state.summary && state.summary.current_stage ? `Stage: ${escapeHtml(state.summary.current_stage)}` : 'Stage: waiting'}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8dc79a;">XP</div>
            <div style="margin-top:6px;font-size:14px;font-weight:700;">LV ${escapeHtml(state.level)} · ${escapeHtml(state.xp)}</div>
          </div>
        </div>
        <div style="margin-top:10px;border:1px solid #21412c;background:#0a1710;border-radius:10px;padding:10px 12px;">
          <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7fb189;">Flow</div>
          <div style="margin-top:6px;font-size:12px;color:#d3ecd7;">
            <div>Recent: ${escapeHtml(state.summary && state.summary.recent_command ? `/${state.summary.recent_command}` : 'none')}</div>
            <div style="margin-top:4px;">Next: ${escapeHtml(state.summary && state.summary.next_command ? state.summary.next_command : 'not set')}</div>
          </div>
        </div>
        <div style="margin-top:10px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8dc79a;">Recent Transcript</div>
        ${transcriptItems || '<div style="margin-top:8px;border:1px dashed #21412c;border-radius:10px;padding:12px;font-size:12px;color:#86b790;">Waiting for transcript data...</div>'}
      </div>
    `;
  }

  function handleMessage(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'rosterLoaded' && payload.roster) {
      state.roster = payload.roster;
      render();
    }
    if (payload.type === 'transcriptBatch' && Array.isArray(payload.transcripts)) {
      state.transcripts = payload.transcripts;
      render();
    }
    if (payload.type === 'commandState' && payload.summary) {
      state.summary = payload.summary;
      render();
    }
    if (payload.type === 'xpUpdated') {
      state.xp = Number(payload.xp) || 0;
      state.level = Number(payload.level) || 1;
      render();
    }
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    ensureRoot();
    render();
    window.addEventListener('message', (event) => handleMessage(event.data));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
