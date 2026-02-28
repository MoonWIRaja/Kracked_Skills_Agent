export class OfficeMap {
  cols: number;
  rows: number;
  tileSize: number;
  grid: number[][];

  constructor(cols: number, rows: number, tileSize: number = 32) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.grid = this.generateMap();
  }

  generateMap() {
    // 0 = floor, 1 = desk, 2 = wall, 3 = plant, 4 = server
    const map = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
    
    // Add walls
    for (let x = 0; x < this.cols; x++) {
      map[0][x] = 2; // Top wall
      map[this.rows - 1][x] = 2; // Bottom wall
    }
    for (let y = 0; y < this.rows; y++) {
      map[y][0] = 2; // Left wall
      map[y][this.cols - 1] = 2; // Right wall
    }

    // Add desks (workstations)
    const workstations = [
      { x: 3, y: 3 }, { x: 7, y: 3 }, { x: 11, y: 3 },
      { x: 3, y: 7 }, { x: 7, y: 7 }, { x: 11, y: 7 }
    ];

    workstations.forEach(desk => {
      if (desk.y < this.rows && desk.x < this.cols) {
        map[desk.y][desk.x] = 1; // Desk
      }
    });

    // Add servers
    map[2][14] = 4;
    map[3][14] = 4;

    return map;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.grid[y][x];
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        // Base floor
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1f2937' : '#111827';
        ctx.fillRect(px, py, this.tileSize, this.tileSize);

        // Draw objects
        switch (tile) {
          case 1: // Desk
            ctx.fillStyle = '#4b5563'; // Gray desk
            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.fillStyle = '#60a5fa'; // Blue screen
            ctx.fillRect(px + 8, py + 8, this.tileSize - 16, 4);
            break;
          case 2: // Wall
            ctx.fillStyle = '#374151';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            break;
          case 4: // Server
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.fillStyle = '#10b981'; // Blinking green light
            if (Date.now() % 1000 < 500) {
              ctx.fillRect(px + 8, py + 8, 4, 4);
            }
            break;
        }
      }
    }
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    return this.grid[y][x] === 0; // Only floor is walkable
  }
}
