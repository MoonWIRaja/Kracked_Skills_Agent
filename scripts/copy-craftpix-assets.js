/**
 * copy-craftpix-assets.js
 * Copies the craftpix guild hall character sprites to frontend/public/assets/
 * Run: node scripts/copy-craftpix-assets.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTRACTED = path.join(ROOT, 'ide', 'vscode-kd-pixel-panel', 'dist', 'webview', 'kd-asset-pack', 'extracted');
const GUILD = path.join(EXTRACTED, 'craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack', 'PNG');
const SWORD = path.join(EXTRACTED, 'craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character', 'PNG', 'Swordsman_lvl1', 'With_shadow');
const CHAR_DST = path.join(ROOT, 'frontend', 'public', 'assets', 'characters');
const ASSET_DST = path.join(ROOT, 'frontend', 'public', 'assets');

const copies = [
  // Characters
  [path.join(GUILD, 'Citizen1_Walk.png'), path.join(CHAR_DST, 'Citizen1_Walk.png')],
  [path.join(GUILD, 'Citizen1_Idle.png'), path.join(CHAR_DST, 'Citizen1_Idle.png')],
  [path.join(GUILD, 'Citizen2_Walk.png'), path.join(CHAR_DST, 'Citizen2_Walk.png')],
  [path.join(GUILD, 'Citizen2_Idle.png'), path.join(CHAR_DST, 'Citizen2_Idle.png')],
  [path.join(GUILD, 'Fighter2_Walk.png'), path.join(CHAR_DST, 'Fighter2_Walk.png')],
  [path.join(GUILD, 'Fighter2_Idle.png'), path.join(CHAR_DST, 'Fighter2_Idle.png')],
  [path.join(GUILD, 'Mage1.png'), path.join(CHAR_DST, 'Mage1.png')],
  [path.join(GUILD, 'Mage2.png'), path.join(CHAR_DST, 'Mage2.png')],
  [path.join(GUILD, 'Mage3.png'), path.join(CHAR_DST, 'Mage3.png')],
  [path.join(GUILD, 'Mage4.png'), path.join(CHAR_DST, 'Mage4.png')],
  [path.join(GUILD, 'Guildmaster.png'), path.join(CHAR_DST, 'Guildmaster.png')],
  [path.join(GUILD, 'Reader1.png'), path.join(CHAR_DST, 'Reader1.png')],
  [path.join(GUILD, 'Reader2.png'), path.join(CHAR_DST, 'Reader2.png')],
  [path.join(SWORD, 'Swordsman_lvl1_Walk_with_shadow.png'), path.join(CHAR_DST, 'Swordsman_Walk.png')],
  [path.join(SWORD, 'Swordsman_lvl1_Idle_with_shadow.png'), path.join(CHAR_DST, 'Swordsman_Idle.png')],
  // Tile atlases
  [path.join(GUILD, 'Walls_interior.png'), path.join(ASSET_DST, 'Walls_interior.png')],
  [path.join(GUILD, 'Interior_objects.png'), path.join(ASSET_DST, 'Interior_objects.png')],
  [path.join(GUILD, 'Walls_street.png'), path.join(ASSET_DST, 'Walls_street.png')],
];

let ok = 0, fail = 0;
for (const [src, dst] of copies) {
  try {
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      const b = fs.readFileSync(dst);
      const w = b.readUInt32BE(16);
      const h = b.readUInt32BE(20);
      console.log(`  ✅ ${path.basename(dst)} (${w}×${h})`);
      ok++;
    } else {
      console.log(`  ⚠️ MISSING: ${path.basename(src)}`);
      fail++;
    }
  } catch (e) {
    console.log(`  ❌ ERROR: ${path.basename(src)} - ${e.message}`);
    fail++;
  }
}
console.log(`\nDone: ${ok} copied, ${fail} failed`);
