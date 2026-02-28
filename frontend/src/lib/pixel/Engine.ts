import { OfficeMap } from './OfficeMap';
import { CharacterSprite, CharacterState, Direction, drawFallbackCharacter } from './Sprite';

const TILE_SIZE = 16;
const SCALE = 2;
const WALK_SPEED = 0.003;
const WALK_FRAME_DURATION = 150;
const TYPE_FRAME_DURATION = 300;
const WANDER_CHANCE = 0.003;

export interface AgentEntity {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
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

const AGENT_CHAR_MAP: Record<string, number> = {
  'main-agent': 0,
  'master-agent': 0,
  analyst: 1,
  'analyst-agent': 1,
  pm: 2,
  'pm-agent': 2,
  'product-manager': 2,
  architect: 3,
  'architect-agent': 3,
  'tech-lead': 4,
  'tech-lead-agent': 4,
  engineer: 5,
  'engineer-agent': 5,
  qa: 0,
  'qa-agent': 0,
  security: 1,
  'security-agent': 1,
  devops: 2,
  'devops-agent': 2,
  'release-manager': 3,
  'release-manager-agent': 3,
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hashToSpriteIndex(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 6;
}

function resolveSpriteIndex(id: string, role: string, name: string): number {
  const idKey = normalizeKey(id);
  const roleKey = normalizeKey(role);
  const roleShort = roleKey.replace(/-agent$/, '');

  if (idKey in AGENT_CHAR_MAP) return AGENT_CHAR_MAP[idKey];
  if (roleKey in AGENT_CHAR_MAP) return AGENT_CHAR_MAP[roleKey];
  if (roleShort in AGENT_CHAR_MAP) return AGENT_CHAR_MAP[roleShort];
  return hashToSpriteIndex(normalizeKey(name || id || role || 'agent'));
}

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
    if (!context) throw new Error('Could not get 2D context');
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
    const charId = resolveSpriteIndex(id, role, name);
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
    this.agents.forEach((agent) => {
      const dx = agent.targetX - agent.x;
      const dy = agent.targetY - agent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        agent.isMoving = true;
        agent.state = CharacterState.WALK;

        if (Math.abs(dx) > Math.abs(dy)) {
          agent.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
          agent.direction = dy > 0 ? Direction.DOWN : Direction.UP;
        }

        const speed = WALK_SPEED * deltaTime;
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;

        agent.frameTimer += deltaTime;
        if (agent.frameTimer >= WALK_FRAME_DURATION) {
          agent.frame = (agent.frame + 1) % 3;
          agent.frameTimer = 0;
        }
      } else {
        agent.x = agent.targetX;
        agent.y = agent.targetY;
        agent.isMoving = false;

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

        if (Math.random() < WANDER_CHANCE) {
          const nx = Math.floor(Math.random() * this.map.cols);
          const ny = Math.floor(Math.random() * this.map.rows);
          if (this.map.isWalkable(nx, ny)) {
            agent.targetX = nx;
            agent.targetY = ny;
          }
        }
      }

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

    this.ctx.save();
    this.ctx.scale(SCALE, SCALE);

    this.map.draw(this.ctx);

    const sorted = Array.from(this.agents.values()).sort((a, b) => a.y - b.y);

    sorted.forEach((agent) => {
      const px = agent.x * TILE_SIZE;
      const py = agent.y * TILE_SIZE;

      if (agent.sprite.loaded) {
        agent.sprite.draw(this.ctx, px, py - 8, agent.state, agent.direction, agent.frame, 1);
      } else {
        drawFallbackCharacter(this.ctx, px, py - 8, agent.color, agent.name, 1);
      }

      this.ctx.fillStyle = 'white';
      this.ctx.font = '5px "Silkscreen", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(agent.name, px + TILE_SIZE / 2, py - 12);

      if (agent.speechBubble) {
        const text = agent.speechBubble;
        this.ctx.font = '5px "Silkscreen", monospace';
        const metrics = this.ctx.measureText(text);
        const padding = 3;
        const boxW = Math.min(metrics.width + padding * 2, 130);
        const boxH = 10;
        const bx = px + TILE_SIZE / 2 - boxW / 2;
        const by = py - 24;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.ctx.beginPath();
        this.ctx.roundRect(bx, by, boxW, boxH, 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(px + TILE_SIZE / 2, by + boxH + 2);
        this.ctx.lineTo(px + TILE_SIZE / 2 - 3, by + boxH);
        this.ctx.lineTo(px + TILE_SIZE / 2 + 3, by + boxH);
        this.ctx.fill();

        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, px + TILE_SIZE / 2, by + 7, boxW - padding * 2);
      }
    });

    this.ctx.restore();
  }
}
