import { OfficeMap } from './OfficeMap';
import { CharacterSprite, CharacterState, Direction, SPRITE_SIZE, drawFallbackCharacter } from './Sprite';

// ── Constants (aligned with pixel-agents) ──────────────────
const TILE_SIZE = 16;
const SCALE = 2; // Render at 2x for visibility
const WALK_SPEED = 0.003; // tiles per ms
const WALK_FRAME_DURATION = 150; // ms per walk frame
const TYPE_FRAME_DURATION = 300; // ms per type frame
const WANDER_CHANCE = 0.003; // chance per frame to pick a new target

// ── Agent Entity ───────────────────────────────────────────
export interface AgentEntity {
  id: string;
  name: string;
  role: string;
  x: number; // tile x (float for smooth movement)
  y: number; // tile y (float)
  targetX: number;
  targetY: number;
  color: string;
  speechBubble: string | null;
  bubbleTimer: number;
  sprite: CharacterSprite;
  state: CharacterState;
  direction: Direction;
  frame: number;
  frameTimer: number;
  isMoving: boolean;
}

// ── Character Palette Mapping ──────────────────────────────
// Maps agent names to pixel-agents character IDs (char_0 to char_5)
const AGENT_CHAR_MAP: Record<string, number> = {
  'amad': 0,
  'ara': 1,
  'sari': 2,
  'paan': 3,
  'ezra': 4,
  'adi': 5,
  'teja': 0,
  'qila': 1,
  'dian': 2,
  'rina': 3,
};

// ── Pixel Engine ───────────────────────────────────────────
export class PixelEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  map: OfficeMap;
  agents: Map<string, AgentEntity>;
  lastTime: number;
  animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Could not get 2D context");
    this.ctx = context;
    
    this.map = new OfficeMap(20, 15, TILE_SIZE);
    this.agents = new Map();
    this.lastTime = performance.now();
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  addAgent(id: string, name: string, role: string, color: string) {
    const charId = AGENT_CHAR_MAP[id] ?? Math.floor(Math.random() * 6);
    const sprite = new CharacterSprite(charId);
    
    const startX = Math.floor(Math.random() * (this.map.cols - 4)) + 2;
    const startY = Math.floor(Math.random() * (this.map.rows - 4)) + 2;

    this.agents.set(id, {
      id,
      name,
      role,
      x: startX,
      y: startY,
      targetX: startX,
      targetY: startY,
      color,
      speechBubble: null,
      bubbleTimer: 0,
      sprite,
      state: CharacterState.IDLE,
      direction: Direction.DOWN,
      frame: 0,
      frameTimer: 0,
      isMoving: false,
    });
  }

  setSpeech(id: string, text: string) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.speechBubble = text;
      agent.bubbleTimer = 5000;
    }
  }

  loop(timestamp: number) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.update(deltaTime);
    this.draw();
    this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
  }

  update(deltaTime: number) {
    this.agents.forEach(agent => {
      const dx = agent.targetX - agent.x;
      const dy = agent.targetY - agent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        // Moving
        agent.isMoving = true;
        agent.state = CharacterState.WALK;
        
        // Set direction
        if (Math.abs(dx) > Math.abs(dy)) {
          agent.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
          agent.direction = dy > 0 ? Direction.DOWN : Direction.UP;
        }

        // Move
        const speed = WALK_SPEED * deltaTime;
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;

        // Animate walk frames
        agent.frameTimer += deltaTime;
        if (agent.frameTimer >= WALK_FRAME_DURATION) {
          agent.frame = (agent.frame + 1) % 3;
          agent.frameTimer = 0;
        }
      } else {
        // Arrived
        agent.x = agent.targetX;
        agent.y = agent.targetY;
        agent.isMoving = false;

        // If speaking, show TYPE animation
        if (agent.speechBubble) {
          agent.state = CharacterState.TYPE;
          agent.frameTimer += deltaTime;
          if (agent.frameTimer >= TYPE_FRAME_DURATION) {
            agent.frame = (agent.frame + 1) % 2;
            agent.frameTimer = 0;
          }
        } else {
          agent.state = CharacterState.IDLE;
          agent.frame = 0;
        }

        // Random wandering
        if (Math.random() < WANDER_CHANCE) {
          let nx = Math.floor(Math.random() * this.map.cols);
          let ny = Math.floor(Math.random() * this.map.rows);
          if (this.map.isWalkable(nx, ny)) {
            agent.targetX = nx;
            agent.targetY = ny;
          }
        }
      }

      // Speech bubble timer
      if (agent.bubbleTimer > 0) {
        agent.bubbleTimer -= deltaTime;
        if (agent.bubbleTimer <= 0) {
          agent.speechBubble = null;
        }
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save and scale
    this.ctx.save();
    this.ctx.scale(SCALE, SCALE);

    // Draw map at native scale
    this.map.draw(this.ctx);

    // Sort agents by Y for depth
    const sorted = Array.from(this.agents.values()).sort((a, b) => a.y - b.y);

    sorted.forEach(agent => {
      const px = agent.x * TILE_SIZE;
      const py = agent.y * TILE_SIZE;

      // Draw sprite (at native scale, already 16px)
      if (agent.sprite.loaded) {
        agent.sprite.draw(
          this.ctx, px, py - 8,
          agent.state, agent.direction, agent.frame,
          1 // Draw at 1x since we already scaled the canvas
        );
      } else {
        drawFallbackCharacter(this.ctx, px, py - 8, agent.color, agent.name, 1);
      }

      // Name label
      this.ctx.fillStyle = 'white';
      this.ctx.font = '5px "Inter", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${agent.name}`, px + TILE_SIZE / 2, py - 12);

      // Speech Bubble
      if (agent.speechBubble) {
        const text = agent.speechBubble;
        this.ctx.font = '5px "Inter", sans-serif';
        const metrics = this.ctx.measureText(text);
        const padding = 3;
        const boxW = Math.min(metrics.width + padding * 2, 120);
        const boxH = 10;
        const bx = px + TILE_SIZE / 2 - boxW / 2;
        const by = py - 24;

        // Bubble background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.ctx.beginPath();
        this.ctx.roundRect(bx, by, boxW, boxH, 2);
        this.ctx.fill();

        // Pointer
        this.ctx.beginPath();
        this.ctx.moveTo(px + TILE_SIZE / 2, by + boxH + 2);
        this.ctx.lineTo(px + TILE_SIZE / 2 - 3, by + boxH);
        this.ctx.lineTo(px + TILE_SIZE / 2 + 3, by + boxH);
        this.ctx.fill();

        // Text
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, px + TILE_SIZE / 2, by + 7, boxW - padding * 2);
      }
    });

    this.ctx.restore();
  }
}
