/**
 * Sprite class adapted for pixel-agents character format
 * 
 * pixel-agents uses individual character spritesheets (char_0.png - char_5.png)
 * Each sheet contains: walk(down, left, right, up), idle, type/sit frames
 * Tile size: 16x16 pixels
 * 
 * Spritesheet Layout (approximate):
 * Row 0: Walk Down (3 frames)
 * Row 1: Walk Left (3 frames)  
 * Row 2: Walk Right (3 frames)
 * Row 3: Walk Up (3 frames)
 * Row 4: Sit/Type frames (2 frames)
 * Row 5: Idle (1 frame)
 */

export const SPRITE_SIZE = 16;

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
   * Draw the character sprite
   * @param ctx Canvas rendering context
   * @param x World X position
   * @param y World Y position  
   * @param state Current animation state
   * @param direction Facing direction
   * @param frame Current animation frame (0-2 for walk, 0-1 for type)
   * @param scale Render scale (2 = 32px characters on 16px tiles)
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: CharacterState,
    direction: Direction,
    frame: number,
    scale: number = 2
  ) {
    if (!this.loaded) return;

    ctx.imageSmoothingEnabled = false; // Crisp pixel art

    let srcRow: number;
    let srcCol: number;

    switch (state) {
      case CharacterState.WALK:
        srcRow = direction; // 0=down, 1=left, 2=right, 3=up
        srcCol = frame % 3; // 3 walk frames
        break;
      case CharacterState.TYPE:
        srcRow = 4; // Sit/type row
        srcCol = frame % 2; // 2 type frames
        break;
      case CharacterState.IDLE:
      default:
        srcRow = direction; // Use walk row but frame 0
        srcCol = 0;
        break;
    }

    ctx.drawImage(
      this.image,
      srcCol * SPRITE_SIZE, srcRow * SPRITE_SIZE,   // Source X, Y
      SPRITE_SIZE, SPRITE_SIZE,                       // Source W, H
      x, y,                                           // Dest X, Y
      SPRITE_SIZE * scale, SPRITE_SIZE * scale        // Dest W, H
    );
  }
}

/**
 * Fallback renderer for when sprites aren't loaded
 * Draws a colored square with a label
 */
export function drawFallbackCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  name: string,
  scale: number = 2
) {
  const size = SPRITE_SIZE * scale;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size - 2, size / 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y + 6, size - 8, size - 8);

  // Head
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(x + 6, y, size - 12, 10);

  // Label
  ctx.fillStyle = 'white';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`[${name}]`, x + size / 2, y - 4);
}
