/**
 * CharacterSprite — Loads craftpix-style character spritesheets.
 *
 * Each character has a WALK sheet and an IDLE sheet.
 * Sheets are arranged as ROWS × COLS:
 *   Row 0 = Face Down
 *   Row 1 = Face Left
 *   Row 2 = Face Right
 *   Row 3 = Face Up
 *
 * Frame size is auto-detected: frameW = image.width / cols, frameH = image.height / 4
 *
 * Walk sheets: 6 columns × 4 rows
 * Idle sheets: variable columns × 4 rows (we use the first few frames)
 * Mage sheets: 7 columns × 4 rows (cols 0-3 = idle, cols 4-6 = casting)
 */

// Known character definitions: [walkFile, idleFile, walkCols, idleCols]
export const CHARACTER_DEFS: Record<string, { walk: string; idle: string; walkCols: number; idleCols: number; walkRows?: number; idleRows?: number }> = {
  citizen1: { walk: 'Citizen1_Walk.png', idle: 'Citizen1_Idle.png', walkCols: 6, idleCols: 8, walkRows: 4, idleRows: 4 },
  citizen2: { walk: 'Citizen2_Walk.png', idle: 'Citizen2_Idle.png', walkCols: 6, idleCols: 8, walkRows: 4, idleRows: 4 },
  fighter2: { walk: 'Fighter2_Walk.png', idle: 'Fighter2_Idle.png', walkCols: 6, idleCols: 8, walkRows: 4, idleRows: 4 },
  mage1: { walk: 'Mage1.png', idle: 'Mage1.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
  mage2: { walk: 'Mage2.png', idle: 'Mage2.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
  mage3: { walk: 'Mage3.png', idle: 'Mage3.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
  mage4: { walk: 'Mage4.png', idle: 'Mage4.png', walkCols: 7, idleCols: 7, walkRows: 4, idleRows: 4 },
  swordsman: { walk: 'Swordsman_Walk.png', idle: 'Swordsman_Idle.png', walkCols: 6, idleCols: 9, walkRows: 4, idleRows: 4 },
  guildmaster: { walk: 'Guildmaster.png', idle: 'Guildmaster.png', walkCols: 7, idleCols: 7, walkRows: 1, idleRows: 1 },
  reader1: { walk: 'Reader1.png', idle: 'Reader1.png', walkCols: 9, idleCols: 9, walkRows: 1, idleRows: 1 },
  reader2: { walk: 'Reader2.png', idle: 'Reader2.png', walkCols: 9, idleCols: 9, walkRows: 1, idleRows: 1 },
};

// Map agent roles → character sprite key
export const ROLE_TO_CHARACTER: Record<string, string> = {
  'master_agent': 'citizen1',
  'main-agent': 'citizen1',
  'product_manager': 'citizen2',
  'pm': 'citizen2',
  'engineer': 'mage1',
  'tech-lead': 'mage1',
  'developer': 'mage2',
  'coder': 'mage2',
  'analyst': 'mage3',
  'architect': 'mage3',
  'designer': 'mage4',
  'ui': 'mage4',
  'qa': 'swordsman',
  'quality': 'swordsman',
  'tester': 'swordsman',
  'security': 'fighter2',
  'guard': 'fighter2',
  'devops': 'fighter2',
  'ops': 'fighter2',
  'release': 'guildmaster',
  'manager': 'guildmaster',
  'researcher': 'reader1',
  'reader': 'reader1',
  'writer': 'reader2',
  'docs': 'reader2',
};

const DIR_MAP = { down: 0, left: 1, right: 2, up: 3 };

export type AgentState = 'IDLE' | 'WALK' | 'TYPE';
export type Direction = 'down' | 'left' | 'right' | 'up';

export class CharacterSprite {
  walkImg: HTMLImageElement | null = null;
  idleImg: HTMLImageElement | null = null;
  loaded = false;

  private walkFrameW = 0;
  private walkFrameH = 0;
  private idleFrameW = 0;
  private idleFrameH = 0;
  private walkCols: number;
  private idleCols: number;

  constructor(
    private charKey: string,
    private basePath: string = '/assets/characters/',
  ) {
    const def = CHARACTER_DEFS[charKey] || CHARACTER_DEFS.citizen1;
    this.walkCols = def.walkCols;
    this.idleCols = def.idleCols;
    this.loadImages(def);
  }

  private loadImages(def: { walk: string; idle: string }) {
    let loadCount = 0;
    const checkLoaded = () => {
      loadCount++;
      if (loadCount >= 2) this.loaded = true;
    };

    this.walkImg = new Image();
    this.walkImg.onload = () => {
      this.walkFrameW = Math.floor(this.walkImg!.width / this.walkCols);
      this.walkFrameH = Math.floor(this.walkImg!.height / 4);
      checkLoaded();
    };
    this.walkImg.onerror = () => checkLoaded();
    this.walkImg.src = this.basePath + def.walk;

    // Idle might be same file as walk (for mages)
    if (def.idle === def.walk) {
      this.idleImg = this.walkImg;
      this.idleFrameW = 0; // will be set after walk loads
      this.idleFrameH = 0;
      this.walkImg.addEventListener('load', () => {
        this.idleFrameW = Math.floor(this.walkImg!.width / this.idleCols);
        this.idleFrameH = Math.floor(this.walkImg!.height / 4);
      });
      checkLoaded(); // idle shares walk image
    } else {
      this.idleImg = new Image();
      this.idleImg.onload = () => {
        this.idleFrameW = Math.floor(this.idleImg!.width / this.idleCols);
        this.idleFrameH = Math.floor(this.idleImg!.height / 4);
        checkLoaded();
      };
      this.idleImg.onerror = () => checkLoaded();
      this.idleImg.src = this.basePath + def.idle;
    }
  }

  /**
   * Draw the character sprite at (x, y) on the canvas.
   * renderW/H controls the display size on the map (tile-relative).
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: AgentState,
    direction: Direction,
    frame: number,
    renderW: number = 24,
    renderH: number = 32,
  ) {
    const dirRow = DIR_MAP[direction] ?? 0;

    if (state === 'WALK') {
      const img = this.walkImg;
      if (!img || !img.complete || this.walkFrameW === 0) return;
      const col = frame % this.walkCols;
      const sx = col * this.walkFrameW;
      const sy = dirRow * this.walkFrameH;
      // Center the character on the tile and align feet to bottom
      const dx = x + (16 - renderW) / 2;
      const dy = y + 16 - renderH;
      ctx.drawImage(img, sx, sy, this.walkFrameW, this.walkFrameH, dx, dy, renderW, renderH);
    } else {
      // IDLE or TYPE — use idle sheet
      const img = this.idleImg || this.walkImg;
      if (!img || !img.complete) return;
      const fw = this.idleFrameW || this.walkFrameW;
      const fh = this.idleFrameH || this.walkFrameH;
      if (fw === 0) return;
      const cols = (img === this.walkImg && this.idleImg === this.walkImg) ? this.idleCols : this.idleCols;
      const col = frame % Math.min(cols, 4); // Use first 4 idle frames
      const sx = col * fw;
      const sy = dirRow * fh;
      const dx = x + (16 - renderW) / 2;
      const dy = y + 16 - renderH;
      ctx.drawImage(img, sx, sy, fw, fh, dx, dy, renderW, renderH);
    }
  }
}

/**
 * Fallback renderer when sprite images aren't loaded.
 * Draws a simple colored character shape.
 */
export function drawFallbackCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  const renderW = 24;
  const renderH = 32;
  const dx = x + (16 - renderW) / 2;
  const dy = y + 16 - renderH;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(dx + renderW / 2, y + 14, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color || '#4488cc';
  ctx.fillRect(dx + 4, dy + 12, renderW - 8, renderH - 14);

  // Head
  ctx.fillStyle = color || '#4488cc';
  ctx.beginPath();
  ctx.arc(dx + renderW / 2, dy + 10, 6, 0, Math.PI * 2);
  ctx.fill();
}
