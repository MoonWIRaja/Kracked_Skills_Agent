import { OfficeMap } from './OfficeMap';
import { CharacterSprite, ROLE_TO_CHARACTER, AgentState, Direction, drawFallbackCharacter } from './Sprite';

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
  state: AgentState;
  direction: Direction;
  frame: number;
  frameTimer: number;
  isMoving: boolean;
}

// Agent role colors for fallback rendering
const ROLE_COLORS: Record<string, string> = {
  'master_agent': '#44aa66',
  'main-agent': '#44aa66',
  'product_manager': '#aa6644',
  'pm': '#aa6644',
  'engineer': '#4466aa',
  'tech-lead': '#4466aa',
  'qa': '#aa4466',
  'security': '#aa4466',
  'analyst': '#6644aa',
  'architect': '#6644aa',
  'devops': '#aaaa44',
  'release': '#aaaa44',
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeRole(value: string): string {
  return normalizeKey(value).replace(/-agent$/, '');
}

/**
 * Resolve which character sprite key to use for an agent.
 * Returns a key from CHARACTER_DEFS (e.g. 'citizen1', 'mage1', 'swordsman')
 */
function resolveCharacterKey(id: string, role: string): string {
  const roleKey = normalizeRole(role);
  const idKey = normalizeKey(id);

  // Direct role match
  if (ROLE_TO_CHARACTER[roleKey]) return ROLE_TO_CHARACTER[roleKey];

  // Partial match
  for (const [pattern, charKey] of Object.entries(ROLE_TO_CHARACTER)) {
    if (roleKey.includes(pattern) || idKey.includes(pattern)) return charKey;
  }

  // Hash-based fallback — cycle through available characters
  const chars = ['citizen1', 'citizen2', 'mage1', 'mage3', 'fighter', 'swordsman'];
  let hash = 0;
  for (let i = 0; i < idKey.length; i++) {
    hash = (hash * 31 + idKey.charCodeAt(i)) >>> 0;
  }
  return chars[hash % chars.length];
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
    const charKey = resolveCharacterKey(id, role);
    const sprite = new CharacterSprite(charKey);
    const roleKey = normalizeRole(role);
    const agentKey = normalizeKey(id);
    const spawn = this.map.pickSpawn(roleKey, agentKey);

    // Pick a color from role if not provided
    const agentColor = color || ROLE_COLORS[roleKey] || '#4488cc';

    this.agents.set(id, {
      id,
      name,
      role,
      x: spawn.x,
      y: spawn.y,
      targetX: spawn.x,
      targetY: spawn.y,
      color: agentColor,
      speechBubble: null,
      bubbleTimer: 0,
      sprite,
      state: 'IDLE',
      direction: 'down',
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
        agent.state = 'WALK';

        if (Math.abs(dx) > Math.abs(dy)) {
          agent.direction = dx > 0 ? 'right' : 'left';
        } else {
          agent.direction = dy > 0 ? 'down' : 'up';
        }

        const speed = WALK_SPEED * deltaTime;
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;

        agent.frameTimer += deltaTime;
        if (agent.frameTimer >= WALK_FRAME_DURATION) {
          agent.frame = (agent.frame + 1) % 6; // 6 walk frames
          agent.frameTimer = 0;
        }
      } else {
        agent.x = agent.targetX;
        agent.y = agent.targetY;
        agent.isMoving = false;

        if (agent.speechBubble) {
          agent.state = 'TYPE';
          agent.frameTimer += deltaTime;
          if (agent.frameTimer >= TYPE_FRAME_DURATION) {
            agent.frame = (agent.frame + 1) % 4; // 4 idle frames for typing
            agent.frameTimer = 0;
          }
        } else {
          agent.state = 'IDLE';
          agent.frameTimer += deltaTime;
          if (agent.frameTimer >= TYPE_FRAME_DURATION) {
            agent.frame = (agent.frame + 1) % 4;
            agent.frameTimer = 0;
          }
        }

        if (Math.random() < WANDER_CHANCE) {
          const next = this.map.randomWalkable();
          agent.targetX = next.x;
          agent.targetY = next.y;
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
    this.ctx.imageSmoothingEnabled = false;

    this.map.draw(this.ctx);

    const sorted = Array.from(this.agents.values()).sort((a, b) => a.y - b.y);

    sorted.forEach((agent) => {
      const px = agent.x * TILE_SIZE;
      const py = agent.y * TILE_SIZE;
      const centerX = px + TILE_SIZE / 2;

      if (agent.sprite.loaded) {
        agent.sprite.draw(this.ctx, px, py, agent.state, agent.direction, agent.frame);
      } else {
        drawFallbackCharacter(this.ctx, px, py, agent.color);
      }

      // Name label above head
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.font = '5px "Silkscreen", monospace';
      this.ctx.textAlign = 'center';
      const nameY = py - 20;
      const nameMetrics = this.ctx.measureText(agent.name);
      this.ctx.fillRect(centerX - nameMetrics.width / 2 - 2, nameY - 5, nameMetrics.width + 4, 7);
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(agent.name, centerX, nameY);

      // Speech bubble
      if (agent.speechBubble) {
        const text = agent.speechBubble;
        this.ctx.font = '5px "Silkscreen", monospace';
        const metrics = this.ctx.measureText(text);
        const padding = 3;
        const boxW = Math.min(metrics.width + padding * 2, 130);
        const boxH = 10;
        const bx = centerX - boxW / 2;
        const by = nameY - 14;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.ctx.beginPath();
        this.ctx.roundRect(bx, by, boxW, boxH, 2);
        this.ctx.fill();

        // Speech tail
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, by + boxH + 2);
        this.ctx.lineTo(centerX - 3, by + boxH);
        this.ctx.lineTo(centerX + 3, by + boxH);
        this.ctx.fill();

        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, centerX, by + 7, boxW - padding * 2);
      }
    });

    this.ctx.restore();
  }
}
