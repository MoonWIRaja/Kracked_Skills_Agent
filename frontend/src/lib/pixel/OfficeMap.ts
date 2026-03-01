/**
 * OfficeMap — Clean 3-zone RPG world for the KD Pixel Observer
 *
 * Layout (20 cols × 15 rows):
 * ┌─────────────┬────────────┐
 * │  GUILD HALL │  DARK OPS  │
 * │  (work area)│  (servers) │
 * │             │            │
 * ├─────────────┤            │
 * │   CORRIDOR  │────────────┤
 * │             │ WILD ZONE  │
 * │  GUILD HALL │ (outdoors) │
 * │  (library)  │            │
 * └─────────────┴────────────┘
 *
 * Tile types:
 *   0 = Floor       5 = Crystal
 *   1 = Desk        6 = Water
 *   2 = Wall        7 = Grass
 *   3 = Tree        8 = Path
 *   4 = Server      9 = Shelf
 */

export enum TileType {
  Floor = 0,
  Desk = 1,
  Wall = 2,
  Tree = 3,
  Server = 4,
  Crystal = 5,
  Water = 6,
  Grass = 7,
  Path = 8,
  Shelf = 9,
}

interface Point { x: number; y: number }

// Color palettes per zone
const GUILD_FLOOR_A = '#4a3928';
const GUILD_FLOOR_B = '#42331f';
const DARK_FLOOR_A = '#1a2235';
const DARK_FLOOR_B = '#151c2d';
const WILD_GRASS_A = '#2d5a32';
const WILD_GRASS_B = '#264e2b';
const PATH_COLOR_A = '#6b5b45';
const PATH_COLOR_B = '#5e5038';
const WALL_COLOR = '#1c1c28';
const WALL_ACCENT = '#2a2a3c';

export class OfficeMap {
  cols: number;
  rows: number;
  tileSize: number;
  grid: TileType[][];

  constructor(cols: number, rows: number, tileSize: number = 16) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.grid = [];
    this.buildMap();
  }

  private buildMap() {
    // Start with all floors
    this.grid = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => TileType.Floor)
    );

    // ── Outer walls ────────────────────────────────────
    for (let x = 0; x < this.cols; x++) {
      this.set(x, 0, TileType.Wall);
      this.set(x, this.rows - 1, TileType.Wall);
    }
    for (let y = 0; y < this.rows; y++) {
      this.set(0, y, TileType.Wall);
      this.set(this.cols - 1, y, TileType.Wall);
    }

    // ── Zone divider: vertical wall at x=11 ───────────
    for (let y = 0; y < this.rows; y++) {
      this.set(11, y, TileType.Wall);
    }
    // Doorway holes in the divider wall
    this.set(11, 4, TileType.Path);
    this.set(11, 10, TileType.Path);

    // ── Zone divider: horizontal wall at y=7 in guild ──
    for (let x = 0; x <= 11; x++) {
      this.set(x, 7, TileType.Wall);
    }
    // Doorway in guild divider
    this.set(5, 7, TileType.Path);
    this.set(6, 7, TileType.Path);

    // ── Horizontal divider in right half at y=7 ────────
    for (let x = 11; x < this.cols; x++) {
      this.set(x, 7, TileType.Wall);
    }
    this.set(15, 7, TileType.Path);

    // ── GUILD HALL TOP (y 1-6, x 1-10) ────────────────
    // Desks - organized workspace
    this.set(3, 2, TileType.Desk);
    this.set(3, 4, TileType.Desk);
    this.set(7, 2, TileType.Desk);
    this.set(7, 4, TileType.Desk);

    // Bookshelves along north wall
    this.set(2, 1, TileType.Shelf);
    this.set(4, 1, TileType.Shelf);
    this.set(6, 1, TileType.Shelf);
    this.set(8, 1, TileType.Shelf);

    // ── GUILD HALL BOTTOM (y 8-13, x 1-10) ────────────
    // Library area - shelves on sides
    this.set(1, 8, TileType.Shelf);
    this.set(1, 10, TileType.Shelf);
    this.set(1, 12, TileType.Shelf);
    this.set(10, 8, TileType.Shelf);
    this.set(10, 10, TileType.Shelf);
    this.set(10, 12, TileType.Shelf);

    // Central reading desks
    this.set(4, 10, TileType.Desk);
    this.set(7, 10, TileType.Desk);

    // ── DARK OPS ZONE (y 1-6, x 12-18) ───────────────
    // Server racks - organized rows
    this.set(14, 2, TileType.Server);
    this.set(15, 2, TileType.Server);
    this.set(16, 2, TileType.Server);
    this.set(14, 4, TileType.Server);
    this.set(15, 4, TileType.Server);
    this.set(16, 4, TileType.Server);

    // Crystals at corners of server room
    this.set(13, 1, TileType.Crystal);
    this.set(17, 1, TileType.Crystal);
    this.set(13, 5, TileType.Crystal);
    this.set(17, 5, TileType.Crystal);

    // ── WILD ZONE (y 8-13, x 12-18) ──────────────────
    // Fill with grass
    for (let y = 8; y <= 13; y++) {
      for (let x = 12; x <= 18; x++) {
        if (this.grid[y][x] === TileType.Floor) {
          this.set(x, y, TileType.Grass);
        }
      }
    }

    // Water stream across the middle
    for (let x = 12; x <= 18; x++) {
      this.set(x, 10, TileType.Water);
    }
    // Stone path bridge over water
    this.set(14, 10, TileType.Path);
    this.set(15, 10, TileType.Path);

    // Trees around edges
    this.set(13, 8, TileType.Tree);
    this.set(17, 8, TileType.Tree);
    this.set(12, 12, TileType.Tree);
    this.set(18, 12, TileType.Tree);
    this.set(15, 13, TileType.Tree);

    // Stone path through wild zone
    this.set(15, 8, TileType.Path);
    this.set(15, 9, TileType.Path);
    this.set(15, 11, TileType.Path);
    this.set(15, 12, TileType.Path);
  }

  private set(x: number, y: number, tile: TileType) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[y][x] = tile;
    }
  }

  // ── Zone detection ─────────────────────────────────
  private getZone(x: number, y: number): 'guild' | 'darkops' | 'wild' {
    if (x >= 12 && y >= 8) return 'wild';
    if (x >= 12) return 'darkops';
    return 'guild';
  }

  // Seeded random for deterministic tile variation
  private tileRand(x: number, y: number, seed: number): number {
    let h = 2166136261;
    h ^= x * 374761393; h = Math.imul(h, 16777619);
    h ^= y * 668265263; h = Math.imul(h, 16777619);
    h ^= seed * 123456789; h = Math.imul(h, 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }

  // ── Drawing ────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D) {
    const T = this.tileSize;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.grid[y][x];
        const px = x * T;
        const py = y * T;
        const checker = (x + y) % 2 === 0;
        const zone = this.getZone(x, y);
        const r1 = this.tileRand(x, y, 0);
        const r2 = this.tileRand(x, y, 1);
        const r3 = this.tileRand(x, y, 2);

        // Draw base floor per zone with texture
        if (tile === TileType.Floor || tile === TileType.Desk || tile === TileType.Shelf) {
          switch (zone) {
            case 'darkops': {
              // Dark stone floor
              ctx.fillStyle = checker ? '#1e2840' : '#1a2238';
              ctx.fillRect(px, py, T, T);
              ctx.fillStyle = 'rgba(255,255,255,0.03)';
              ctx.fillRect(px + 2, py + 2, 3, 3);
              ctx.fillStyle = 'rgba(0,0,0,0.15)';
              ctx.fillRect(px + T - 1, py, 1, T);
              ctx.fillRect(px, py + T - 1, T, 1);
              break;
            }
            case 'wild': {
              // Grass base
              const gVar = Math.floor(r1 * 12) - 6;
              ctx.fillStyle = `rgb(${38 + gVar}, ${checker ? 72 : 66 + gVar}, ${34 + gVar})`;
              ctx.fillRect(px, py, T, T);
              if (r2 > 0.5) {
                ctx.fillStyle = 'rgba(80,140,70,0.3)';
                ctx.fillRect(px + Math.floor(r1 * 10) + 2, py + Math.floor(r3 * 8) + 3, 1, 3);
              }
              break;
            }
            default: {
              // Warm wood plank floor
              ctx.fillStyle = checker ? '#7a5430' : '#6e4a2a';
              ctx.fillRect(px, py, T, T);
              ctx.fillStyle = 'rgba(0,0,0,0.07)';
              ctx.fillRect(px, py + 4, T, 1);
              ctx.fillRect(px, py + 10, T, 1);
              if (checker) {
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.fillRect(px + Math.floor(r1 * 8) + 3, py, 1, T);
              }
              ctx.fillStyle = 'rgba(255,220,160,0.05)';
              ctx.fillRect(px + 1, py + 1, T - 2, 2);
              break;
            }
          }
        }

        // Draw tile object on top
        switch (tile) {
          case TileType.Wall:
            this.drawWall(ctx, px, py, T, checker);
            break;
          case TileType.Desk:
            this.drawDesk(ctx, px, py, T, zone);
            break;
          case TileType.Shelf:
            this.drawShelf(ctx, px, py, T);
            break;
          case TileType.Server:
            this.drawServer(ctx, px, py, T);
            break;
          case TileType.Crystal:
            this.drawCrystal(ctx, px, py, T);
            break;
          case TileType.Tree:
            this.drawTree(ctx, px, py, T);
            break;
          case TileType.Water:
            this.drawWater(ctx, px, py, T, x, y);
            break;
          case TileType.Grass:
            this.drawGrassDetail(ctx, px, py, T, r1, r2, r3);
            break;
          case TileType.Path:
            this.drawPath(ctx, px, py, T, checker, r1);
            break;
          default:
            break;
        }
      }
    }

    // Draw zone labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '4px "Silkscreen", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GUILD HALL', 5 * T + T / 2, 1 * T - 1);
    ctx.fillText('DARK OPS', 15 * T + T / 2, 1 * T - 1);
    ctx.fillText('WILD ZONE', 15 * T + T / 2, 8 * T - 1);
  }

  private drawWall(ctx: CanvasRenderingContext2D, px: number, py: number, T: number, checker: boolean) {
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
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(px + 1, py + 1, T - 2, 1);
  }

  private drawDesk(ctx: CanvasRenderingContext2D, px: number, py: number, T: number, zone: string) {
    const isOps = zone === 'darkops';
    // Desk surface
    ctx.fillStyle = isOps ? '#2a3040' : '#6c431f';
    ctx.fillRect(px + 1, py + 3, T - 2, T - 5);
    // Screen
    ctx.fillStyle = isOps ? '#44ddaa' : '#88bbee';
    ctx.fillRect(px + 3, py + 4, T - 6, 4);
    // Screen edge
    ctx.fillStyle = isOps ? '#1a1a2a' : '#444';
    ctx.fillRect(px + 3, py + 8, T - 6, 1);
    // Keyboard
    ctx.fillStyle = '#333';
    ctx.fillRect(px + 4, py + 10, T - 8, 2);
  }

  private drawShelf(ctx: CanvasRenderingContext2D, px: number, py: number, T: number) {
    ctx.fillStyle = '#5c3d25';
    ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
    // Shelf planks
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(px + 1, py + 5, T - 2, 1);
    ctx.fillRect(px + 1, py + 10, T - 2, 1);
    // Books row 1
    ctx.fillStyle = '#88bb77';
    ctx.fillRect(px + 2, py + 2, 3, 3);
    ctx.fillStyle = '#7799cc';
    ctx.fillRect(px + 6, py + 2, 3, 3);
    ctx.fillStyle = '#cc8877';
    ctx.fillRect(px + 10, py + 2, 3, 3);
    // Books row 2
    ctx.fillStyle = '#ccaa55';
    ctx.fillRect(px + 3, py + 6, 4, 4);
    ctx.fillStyle = '#aa77cc';
    ctx.fillRect(px + 8, py + 6, 4, 4);
  }

  private drawServer(ctx: CanvasRenderingContext2D, px: number, py: number, T: number) {
    // Rack
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(px + 2, py + 1, T - 4, T - 2);
    ctx.fillStyle = '#1a2235';
    ctx.fillRect(px + 3, py + 2, T - 6, T - 4);
    // Status lights
    const blink = Date.now() % 1000 < 500;
    ctx.fillStyle = blink ? '#00ff88' : '#0a4d33';
    ctx.fillRect(px + 4, py + 3, 2, 2);
    ctx.fillRect(px + 9, py + 3, 2, 2);
    // Activity bar
    ctx.fillStyle = '#003355';
    ctx.fillRect(px + 4, py + 7, T - 8, 2);
    ctx.fillStyle = '#0077aa';
    ctx.fillRect(px + 4, py + 7, Math.floor((T - 8) * (blink ? 0.7 : 0.4)), 2);
    // Bottom vent
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(px + 4, py + 11, 2, 1);
    ctx.fillRect(px + 8, py + 11, 2, 1);
  }

  private drawCrystal(ctx: CanvasRenderingContext2D, px: number, py: number, T: number) {
    // Glow
    ctx.fillStyle = 'rgba(100,130,255,0.15)';
    ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    // Crystal body
    const cx = px + T / 2;
    ctx.fillStyle = '#6688ff';
    ctx.beginPath();
    ctx.moveTo(cx, py + 2);
    ctx.lineTo(cx + 4, py + T / 2);
    ctx.lineTo(cx, py + T - 2);
    ctx.lineTo(cx - 4, py + T / 2);
    ctx.closePath();
    ctx.fill();
    // Specular
    ctx.fillStyle = '#aaccff';
    ctx.fillRect(cx - 1, py + 4, 2, 3);
  }

  private drawTree(ctx: CanvasRenderingContext2D, px: number, py: number, T: number) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(px + T / 2, py + T - 1, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trunk
    ctx.fillStyle = '#5a3d1f';
    ctx.fillRect(px + 6, py + 9, 4, 5);
    // Shadow canopy
    ctx.fillStyle = '#1f5a28';
    ctx.fillRect(px + 1, py + 5, 14, 5);
    // Main canopy
    ctx.fillStyle = '#2d7a3a';
    ctx.fillRect(px + 2, py + 3, 12, 6);
    // Top canopy
    ctx.fillStyle = '#3da84c';
    ctx.fillRect(px + 4, py + 1, 8, 4);
    // Highlights
    ctx.fillStyle = '#4cc960';
    ctx.fillRect(px + 5, py + 2, 3, 2);
  }

  private drawWater(ctx: CanvasRenderingContext2D, px: number, py: number, T: number, x: number, y: number) {
    // Animated water
    const wave = Math.sin((x * 0.8 + y * 0.5) + performance.now() / 1200) * 0.12;
    const b = 80 + Math.floor(wave * 25);
    ctx.fillStyle = `rgb(${28 + Math.floor(wave * 15)}, ${48 + Math.floor(wave * 10)}, ${b})`;
    ctx.fillRect(px, py, T, T);
    // Wave highlights
    const wx = Math.floor(Math.sin(x * 1.3 + performance.now() / 800) * 4 + 6);
    ctx.fillStyle = 'rgba(120,180,220,0.22)';
    ctx.fillRect(px + wx, py + 4, 4, 1);
    ctx.fillRect(px + (T - wx - 2), py + 10, 3, 1);
    // Depth
    ctx.fillStyle = 'rgba(0,10,30,0.12)';
    ctx.fillRect(px, py + T - 3, T, 3);
  }

  private drawGrassDetail(ctx: CanvasRenderingContext2D, px: number, py: number, T: number, r1: number, r2: number, r3: number) {
    // Base grass with variation
    const gVar = Math.floor(r1 * 14) - 7;
    const checker = r2 > 0.5;
    ctx.fillStyle = `rgb(${38 + gVar}, ${checker ? 72 : 64 + gVar}, ${32 + gVar})`;
    ctx.fillRect(px, py, T, T);
    // Grass tufts
    if (r2 > 0.4) {
      ctx.fillStyle = 'rgba(80,140,70,0.35)';
      ctx.fillRect(px + Math.floor(r1 * 10) + 2, py + Math.floor(r3 * 8) + 3, 1, 3);
      ctx.fillRect(px + Math.floor(r3 * 8) + 5, py + Math.floor(r2 * 6) + 6, 1, 2);
    }
    // Dirt speck
    if (r3 > 0.82) {
      ctx.fillStyle = 'rgba(90,70,40,0.2)';
      ctx.fillRect(px + Math.floor(r2 * 12) + 1, py + Math.floor(r1 * 12) + 1, 2, 2);
    }
    // Flower
    if (r1 > 0.9 && r2 > 0.5) {
      ctx.fillStyle = r3 > 0.5 ? '#e8c84a' : '#d66b8f';
      ctx.fillRect(px + Math.floor(r3 * 10) + 3, py + Math.floor(r2 * 8) + 4, 2, 2);
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D, px: number, py: number, T: number, checker: boolean, r1: number) {
    // Cobblestone path
    ctx.fillStyle = checker ? '#6b5b45' : '#5e5038';
    ctx.fillRect(px, py, T, T);
    // Stone edges
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(px + Math.floor(r1 * 6) + 3, py, 1, T);
    ctx.fillRect(px, py + Math.floor(r1 * 6) + 5, T, 1);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(px + 1, py + 1, 5, 3);
  }

  // ── Spawn & walkability ────────────────────────────
  private spawnListForRole(roleKey: string, agentKey: string): Point[] {
    if (agentKey.includes('main')) return [{ x: 5, y: 4 }, { x: 6, y: 4 }];
    if (roleKey.includes('engineer') || roleKey.includes('tech-lead')) {
      return [{ x: 4, y: 3 }, { x: 8, y: 3 }, { x: 4, y: 5 }, { x: 8, y: 5 }];
    }
    if (roleKey.includes('security') || roleKey.includes('qa') || roleKey.includes('devops')) {
      return [{ x: 14, y: 3 }, { x: 16, y: 3 }, { x: 15, y: 5 }];
    }
    if (roleKey.includes('analyst') || roleKey.includes('pm') || roleKey.includes('architect')) {
      return [{ x: 5, y: 9 }, { x: 8, y: 9 }, { x: 5, y: 11 }];
    }
    if (roleKey.includes('release')) {
      return [{ x: 14, y: 9 }, { x: 16, y: 9 }];
    }
    return [{ x: 5, y: 5 }, { x: 6, y: 5 }];
  }

  pickSpawn(roleKey: string, agentKey: string): Point {
    const list = this.spawnListForRole(roleKey, agentKey);
    for (const point of list) {
      if (this.isWalkable(point.x, point.y)) return point;
    }
    return this.randomWalkable();
  }

  randomWalkable(maxTries: number = 200): Point {
    for (let i = 0; i < maxTries; i++) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      if (this.isWalkable(x, y)) return { x, y };
    }
    return { x: 2, y: 2 };
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    const tile = this.grid[y][x];
    return (
      tile === TileType.Floor ||
      tile === TileType.Grass ||
      tile === TileType.Path
    );
  }
}
