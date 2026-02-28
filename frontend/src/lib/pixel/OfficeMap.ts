export enum TileType {
  Floor = 0,
  Desk = 1,
  Wall = 2,
  Tree = 3,
  Server = 4,
  Crystal = 5,
  Water = 6,
  Rock = 7,
  Rune = 8,
  Camp = 9,
  Bridge = 10,
  Shelf = 11,
  Portal = 12,
  Path = 13,
}

type ZoneType = 'guild' | 'darkops' | 'wild';

interface Point {
  x: number;
  y: number;
}

export class OfficeMap {
  cols: number;
  rows: number;
  tileSize: number;
  grid: number[][];
  zones: ZoneType[][];

  constructor(cols: number, rows: number, tileSize: number = 32) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.grid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(TileType.Floor));
    this.zones = Array(this.rows).fill(0).map(() => Array(this.cols).fill('guild' as ZoneType));
    this.generateMap();
  }

  generateMap() {
    this.grid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(TileType.Floor));
    this.zones = Array(this.rows).fill(0).map(() => Array(this.cols).fill('guild' as ZoneType));

    this.fillZone(1, 1, 11, 13, 'guild');
    this.fillZone(12, 1, 18, 7, 'darkops');
    this.fillZone(12, 8, 18, 13, 'wild');

    this.applyBorderWalls();
    this.paintPaths();
    this.placeGuildObjects();
    this.placeDarkOpsObjects();
    this.placeWildObjects();
  }

  private fillZone(x1: number, y1: number, x2: number, y2: number, zone: ZoneType) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (this.inBounds(x, y)) {
          this.zones[y][x] = zone;
        }
      }
    }
  }

  private applyBorderWalls() {
    for (let x = 0; x < this.cols; x++) {
      this.grid[0][x] = TileType.Wall;
      this.grid[this.rows - 1][x] = TileType.Wall;
    }
    for (let y = 0; y < this.rows; y++) {
      this.grid[y][0] = TileType.Wall;
      this.grid[y][this.cols - 1] = TileType.Wall;
    }
  }

  private paintPaths() {
    for (let x = 2; x <= 17; x++) this.grid[7][x] = TileType.Path;
    for (let y = 2; y <= 12; y++) this.grid[y][10] = TileType.Path;
    for (let y = 5; y <= 9; y++) this.grid[y][12] = TileType.Path;
    this.grid[7][10] = TileType.Path;
    this.grid[7][12] = TileType.Path;
  }

  private placeGuildObjects() {
    const desks: Point[] = [
      { x: 3, y: 3 }, { x: 7, y: 3 },
      { x: 3, y: 8 }, { x: 7, y: 8 },
    ];
    desks.forEach((p) => this.setTile(p.x, p.y, TileType.Desk));

    const shelves: Point[] = [
      { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 2 },
      { x: 2, y: 11 }, { x: 8, y: 11 },
    ];
    shelves.forEach((p) => this.setTile(p.x, p.y, TileType.Shelf));

    this.setTile(5, 1, TileType.Portal);
  }

  private placeDarkOpsObjects() {
    const servers: Point[] = [
      { x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 },
      { x: 14, y: 4 }, { x: 15, y: 4 }, { x: 16, y: 4 },
    ];
    servers.forEach((p) => this.setTile(p.x, p.y, TileType.Server));

    const crystals: Point[] = [
      { x: 13, y: 2 }, { x: 17, y: 2 }, { x: 13, y: 4 }, { x: 17, y: 4 },
    ];
    crystals.forEach((p) => this.setTile(p.x, p.y, TileType.Crystal));

    const runes: Point[] = [
      { x: 14, y: 6 }, { x: 15, y: 6 }, { x: 16, y: 6 },
    ];
    runes.forEach((p) => this.setTile(p.x, p.y, TileType.Rune));
  }

  private placeWildObjects() {
    for (let x = 12; x <= 18; x++) {
      this.setTile(x, 10, TileType.Water);
    }
    this.setTile(14, 10, TileType.Bridge);
    this.setTile(15, 10, TileType.Bridge);

    const trees: Point[] = [
      { x: 13, y: 9 }, { x: 17, y: 9 },
      { x: 12, y: 12 }, { x: 18, y: 12 }, { x: 16, y: 12 },
    ];
    trees.forEach((p) => this.setTile(p.x, p.y, TileType.Tree));

    const rocks: Point[] = [
      { x: 13, y: 11 }, { x: 17, y: 11 }, { x: 18, y: 9 },
    ];
    rocks.forEach((p) => this.setTile(p.x, p.y, TileType.Rock));

    this.setTile(15, 8, TileType.Camp);
  }

  private setTile(x: number, y: number, tile: TileType) {
    if (!this.inBounds(x, y)) return;
    this.grid[y][x] = tile;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  private drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, tile: TileType) {
    if (tile === TileType.Path) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#8f6a3f' : '#7d5a34';
      ctx.fillRect(px, py, this.tileSize, this.tileSize);
      return;
    }

    const zone = this.zones[y][x];
    if (zone === 'guild') {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#9b6c3d' : '#8d6135';
    } else if (zone === 'darkops') {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#2a3448' : '#222c3f';
    } else {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#4e7898' : '#446c8b';
    }
    ctx.fillRect(px, py, this.tileSize, this.tileSize);
  }

  private drawDesk(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#6c431f';
    ctx.fillRect(px + 2, py + 4, this.tileSize - 4, this.tileSize - 6);
    ctx.fillStyle = '#b7ccf6';
    ctx.fillRect(px + 6, py + 6, this.tileSize - 12, 4);
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(px + 7, py + 11, 3, 2);
    ctx.fillRect(px + this.tileSize - 10, py + 11, 3, 2);
  }

  private drawWall(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#1b2230';
    ctx.fillRect(px, py, this.tileSize, this.tileSize);
    ctx.fillStyle = '#2a3347';
    ctx.fillRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
  }

  private drawTree(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#67412a';
    ctx.fillRect(px + 7, py + 9, 2, 5);
    ctx.fillStyle = '#3d8b4a';
    ctx.fillRect(px + 4, py + 4, 8, 6);
    ctx.fillStyle = '#58ad63';
    ctx.fillRect(px + 6, py + 3, 4, 3);
  }

  private drawServer(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
    ctx.fillStyle = '#1d2942';
    ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
    const blink = Date.now() % 1000 < 500;
    ctx.fillStyle = blink ? '#00f0a6' : '#0b5a43';
    ctx.fillRect(px + 6, py + 6, 2, 2);
    ctx.fillRect(px + 9, py + 6, 2, 2);
  }

  private drawCrystal(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#5f89ff';
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 3);
    ctx.lineTo(px + 11, py + 7);
    ctx.lineTo(px + 8, py + 12);
    ctx.lineTo(px + 5, py + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a3bbff';
    ctx.fillRect(px + 7, py + 5, 2, 2);
  }

  private drawWater(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#2c5f8d';
    ctx.fillRect(px, py, this.tileSize, this.tileSize);
    ctx.fillStyle = '#4f84b1';
    ctx.fillRect(px + 2, py + 5, 5, 1);
    ctx.fillRect(px + 9, py + 9, 4, 1);
  }

  private drawRock(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#7a7f8f';
    ctx.fillRect(px + 4, py + 7, 8, 5);
    ctx.fillStyle = '#9ba2b4';
    ctx.fillRect(px + 6, py + 7, 3, 1);
  }

  private drawRune(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#5e71c3';
    ctx.fillRect(px + 4, py + 4, 8, 8);
    ctx.fillStyle = '#9bb0ff';
    ctx.fillRect(px + 7, py + 5, 2, 6);
    ctx.fillRect(px + 5, py + 7, 6, 2);
  }

  private drawCamp(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#6f4d2b';
    ctx.fillRect(px + 5, py + 11, 6, 2);
    ctx.fillStyle = '#ff7f2a';
    ctx.fillRect(px + 7, py + 7, 2, 4);
    ctx.fillStyle = '#ffd365';
    ctx.fillRect(px + 7, py + 8, 1, 2);
  }

  private drawBridge(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#7f5a36';
    ctx.fillRect(px, py + 4, this.tileSize, 8);
    ctx.fillStyle = '#9a7248';
    for (let i = 1; i < this.tileSize; i += 4) {
      ctx.fillRect(px + i, py + 4, 1, 8);
    }
  }

  private drawShelf(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#5c3d25';
    ctx.fillRect(px + 2, py + 3, this.tileSize - 4, this.tileSize - 6);
    ctx.fillStyle = '#b3d08f';
    ctx.fillRect(px + 4, py + 5, 3, 2);
    ctx.fillStyle = '#86a9db';
    ctx.fillRect(px + 8, py + 5, 3, 2);
    ctx.fillStyle = '#cc8e8e';
    ctx.fillRect(px + 5, py + 9, 4, 2);
  }

  private drawPortal(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.fillStyle = '#2e1d4d';
    ctx.fillRect(px + 3, py + 3, 10, 10);
    ctx.fillStyle = '#8c5bff';
    ctx.fillRect(px + 4, py + 4, 8, 8);
    ctx.fillStyle = Date.now() % 1000 < 500 ? '#d2b5ff' : '#b58eff';
    ctx.fillRect(px + 6, py + 6, 4, 4);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.grid[y][x] as TileType;
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        this.drawFloor(ctx, x, y, px, py, tile);

        switch (tile) {
          case TileType.Desk:
            this.drawDesk(ctx, px, py);
            break;
          case TileType.Wall:
            this.drawWall(ctx, px, py);
            break;
          case TileType.Tree:
            this.drawTree(ctx, px, py);
            break;
          case TileType.Server:
            this.drawServer(ctx, px, py);
            break;
          case TileType.Crystal:
            this.drawCrystal(ctx, px, py);
            break;
          case TileType.Water:
            this.drawWater(ctx, px, py);
            break;
          case TileType.Rock:
            this.drawRock(ctx, px, py);
            break;
          case TileType.Rune:
            this.drawRune(ctx, px, py);
            break;
          case TileType.Camp:
            this.drawCamp(ctx, px, py);
            break;
          case TileType.Bridge:
            this.drawWater(ctx, px, py);
            this.drawBridge(ctx, px, py);
            break;
          case TileType.Shelf:
            this.drawShelf(ctx, px, py);
            break;
          case TileType.Portal:
            this.drawPortal(ctx, px, py);
            break;
          default:
            break;
        }
      }
    }
  }

  private spawnListForRole(roleKey: string, agentKey: string): Point[] {
    if (agentKey.includes('main')) return [{ x: 10, y: 7 }, { x: 11, y: 7 }];
    if (roleKey.includes('engineer') || roleKey.includes('tech-lead')) {
      return [{ x: 4, y: 4 }, { x: 8, y: 4 }, { x: 4, y: 9 }, { x: 8, y: 9 }];
    }
    if (roleKey.includes('security') || roleKey.includes('qa') || roleKey.includes('devops')) {
      return [{ x: 14, y: 5 }, { x: 15, y: 5 }, { x: 16, y: 5 }, { x: 13, y: 6 }];
    }
    if (roleKey.includes('analyst') || roleKey.includes('pm') || roleKey.includes('architect')) {
      return [{ x: 14, y: 8 }, { x: 16, y: 8 }, { x: 15, y: 11 }];
    }
    return [{ x: 10, y: 8 }, { x: 9, y: 7 }, { x: 11, y: 8 }];
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
    return { x: 1, y: 1 };
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const tile = this.grid[y][x];
    return tile === TileType.Floor || tile === TileType.Path || tile === TileType.Bridge || tile === TileType.Rune;
  }
}
