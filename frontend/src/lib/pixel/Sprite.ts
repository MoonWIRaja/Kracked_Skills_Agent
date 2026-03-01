/**
 * Sprite class for pixel-agents character spritesheets
 *
 * Each char_N.png is an 8-column × 6-row grid of 16×16 cells.
 * A single character occupies 1 column × 2 rows (16×32 px).
 *
 * Verified layout from actual spritesheet images:
 *   Row 0-1: Walk Down  (4 frames, cols 0-3)  — each frame is 16w × 32h
 *   Row 2-3: Walk Left  (4 frames, cols 0-3)
 *            Walk Right (4 frames, cols 4-7)
 *   Row 4-5: Walk Up    (4 frames, cols 0-3)
 *            Idle Down  (1 frame, col 4)
 *            Sit/Type   (2 frames, cols 5-6)
 *
 * Cell size: 16 × 16, but each frame uses 2 cells vertically = 16 × 32
 */

export const CELL_SIZE = 16;     // single cell in the spritesheet
export const FRAME_W = 16;       // character frame width
export const FRAME_H = 32;       // character frame height (2 cells)

export enum Direction {
  DOWN = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
}

export enum CharacterState {
  IDLE = 'idle',
  WALK = 'walk',
  TYPE = 'type',
}

/**
 * Returns the source rectangle {sx, sy} in the spritesheet for a given
 * animation state, direction, and frame index.
 */
function getFrameCoords(
  state: CharacterState,
  direction: Direction,
  frame: number
): { sx: number; sy: number } {
  let col: number;
  let rowPair: number; // each "row pair" = 2 cell-rows

  switch (state) {
    case CharacterState.WALK:
      switch (direction) {
        case Direction.DOWN:
          rowPair = 0;
          col = frame % 4;
          break;
        case Direction.LEFT:
          rowPair = 1;
          col = frame % 4;
          break;
        case Direction.RIGHT:
          rowPair = 1;
          col = 4 + (frame % 4);
          break;
        case Direction.UP:
        default:
          rowPair = 2;
          col = frame % 4;
          break;
      }
      break;

    case CharacterState.TYPE:
      rowPair = 2;
      col = 5 + (frame % 2);  // cols 5-6 in row pair 2
      break;

    case CharacterState.IDLE:
    default:
      // Idle facing down = row pair 2, col 4
      rowPair = 2;
      col = 4;
      break;
  }

  return {
    sx: col * CELL_SIZE,
    sy: rowPair * FRAME_H,   // rowPair * 32
  };
}

export class CharacterSprite {
  image: HTMLImageElement;
  loaded: boolean = false;
  charId: number;

  constructor(charId: number) {
    this.charId = charId;
    this.image = new window.Image();
    this.image.onload = () => { this.loaded = true; };
    this.image.onerror = () => { this.loaded = false; };
    this.image.src = `/assets/characters/char_${charId}.png`;
  }

  /**
   * Draw the character on the canvas.
   *
   * Because the game canvas is already scaled (ctx.scale(SCALE)),
   * we draw at 1:1 here — the character renders as 16×32 native pixels
   * and the outer SCALE (2×) makes it 32×64 on screen.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: CharacterState,
    direction: Direction,
    frame: number,
  ) {
    if (!this.loaded) return;
    ctx.imageSmoothingEnabled = false;

    const { sx, sy } = getFrameCoords(state, direction, frame);

    ctx.drawImage(
      this.image,
      sx, sy,            // source position
      FRAME_W, FRAME_H,  // source size (16×32)
      x, y,              // destination position
      FRAME_W, FRAME_H,  // destination size (drawn at 1:1, outer scale handles zoom)
    );
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
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + FRAME_W / 2, y + FRAME_H - 2, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x + 3, y + 14, 10, 14);

  // Head
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.arc(x + FRAME_W / 2, y + 10, 5, 0, Math.PI * 2);
  ctx.fill();

}
