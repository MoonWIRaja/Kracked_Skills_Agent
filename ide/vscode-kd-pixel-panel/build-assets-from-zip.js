#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('node:child_process');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);
const SOURCE_ZIP_NAMES = [
  'Office Tileset (Donarg).zip',
  'Office Tileset Donarg.zip',
  'OfficeTileset(Donarg).zip',
  'Assets.zip',
];
const SOURCE_DIR_NAMES = [
  'Office Tileset',
  'Office-Tileset',
  'Office_Tileset',
  'donarg-office-assets',
  'assets',
  'Assets',
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i] || '');
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !String(argv[i + 1]).startsWith('--') ? argv[++i] : 'true';
    out[key] = value;
  }
  return out;
}

function log(message) {
  process.stdout.write(`[KD][assets] ${message}\n`);
}

function warn(message) {
  process.stdout.write(`[KD][assets][warn] ${message}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function runTarExtract(zipPath, destDir) {
  const res = spawnSync('tar', ['-xf', zipPath, '-C', destDir], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (res.status !== 0) {
    const msg = (res.stderr || res.stdout || '').trim() || `exit code ${res.status}`;
    throw new Error(`tar extract failed: ${msg}`);
  }
}

function walkFiles(rootDir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === '__macosx') continue;
      walkFiles(fullPath, out);
      continue;
    }
    if (entry.isFile()) out.push(fullPath);
  }

  return out;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listZipParts(dirPath, baseZipName) {
  if (!fs.existsSync(dirPath)) return [];
  const regex = new RegExp(`^${escapeRegExp(baseZipName)}\\.part\\d+$`, 'i');
  return fs.readdirSync(dirPath)
    .filter((name) => regex.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function assembleZipFromParts(partsDir, zipOutPath, baseZipName) {
  const parts = listZipParts(partsDir, baseZipName);
  if (parts.length === 0) return false;

  const buffers = [];
  for (const part of parts) {
    buffers.push(fs.readFileSync(path.join(partsDir, part)));
  }
  fs.writeFileSync(zipOutPath, Buffer.concat(buffers));
  return true;
}

function hasImageAssets(dirPath) {
  if (!fs.existsSync(dirPath)) return false;
  const files = walkFiles(dirPath);
  const images = files.filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
  if (images.length < 4) return false;

  const relNames = images.map((filePath) => path.relative(dirPath, filePath).replace(/\\/g, '/').toLowerCase());
  if (relNames.some((name) => name.includes('office tileset all 16x16'))) return true;
  if (
    relNames.some((name) => name.includes('a2 office floors'))
    && relNames.some((name) => name.includes('a4 office walls'))
  ) {
    return true;
  }
  return false;
}

function findSourceInput(panelDir, workspaceDir) {
  const roots = [];
  roots.push(path.join(panelDir, 'asset-pack'));
  roots.push(panelDir);
  if (workspaceDir) roots.push(workspaceDir);
  roots.push(path.join(panelDir, '..', '..', '..'));

  for (const root of roots) {
    for (const dirName of SOURCE_DIR_NAMES) {
      const candidate = path.join(root, dirName);
      if (hasImageAssets(candidate)) {
        return { type: 'dir', sourcePath: candidate, assembled: false, sourceName: dirName };
      }
    }

    if (!fs.existsSync(root)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name.toLowerCase();
      if (!/(office|donarg|asset)/i.test(name)) continue;
      const candidate = path.join(root, entry.name);
      if (hasImageAssets(candidate)) {
        return { type: 'dir', sourcePath: candidate, assembled: false, sourceName: entry.name };
      }
    }
  }

  for (const root of roots) {
    for (const zipName of SOURCE_ZIP_NAMES) {
      const candidate = path.join(root, zipName);
      if (fs.existsSync(candidate)) {
        return { type: 'zip', sourcePath: candidate, assembled: false, sourceName: zipName };
      }
    }
  }

  const partsDir = path.join(panelDir, 'asset-pack');
  for (const zipName of SOURCE_ZIP_NAMES) {
    const assembledPath = path.join(partsDir, zipName);
    if (assembleZipFromParts(partsDir, assembledPath, zipName) && fs.existsSync(assembledPath)) {
      return { type: 'zip', sourcePath: assembledPath, assembled: true, sourceName: zipName };
    }
  }

  return null;
}

function copyTree(srcDir, destDir) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(srcPath, destPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanExtractedTree(rootDir) {
  const files = walkFiles(rootDir);
  for (const filePath of files) {
    const base = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    if (base.startsWith('._') || base === '.ds_store' || base === 'thumbs.db') {
      fs.rmSync(filePath, { force: true });
      continue;
    }

    if (!IMAGE_EXTENSIONS.has(ext)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function isRuntimeImage(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  const base = path.basename(lower);

  if (!IMAGE_EXTENSIONS.has(path.extname(lower))) return false;
  if (lower.includes('/__macosx/')) return false;
  if (base.startsWith('._')) return false;
  if (base.includes('screenshot')) return false;
  if (base.includes('coupon')) return false;
  return true;
}

function uniqueSorted(items) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function prioritize(list, prioritizedNames) {
  const priorities = prioritizedNames.map((name) => name.toLowerCase());
  return [...list].sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const ai = priorities.findIndex((name) => al.endsWith(name));
    const bi = priorities.findIndex((name) => bl.endsWith(name));

    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      if (ai !== bi) return ai - bi;
    }

    return al.localeCompare(bl);
  });
}

function categorizeDonargImages(images) {
  const sorted = uniqueSorted(images);

  const tileAtlases = prioritize(sorted.filter((rel) => /office tileset all 16x16|a2 office floors|a4 office walls|a5 office floors/i.test(rel)), [
    'office tileset/office tileset all 16x16 no shadow.png',
    'office tileset/office tileset all 16x16.png',
    'office tileset/office vx ace/a2 office floors.png',
    'office tileset/office vx ace/a4 office walls.png',
    'office tileset/office vx ace/a5 office floors & walls.png',
    'office tileset/office tileset all 32x32 no shadow.png',
    'office tileset/office tileset all 32x32.png',
  ]).slice(0, 32);

  const objectAtlases = prioritize(sorted.filter((rel) => /b-c-d-e office|office tileset all 16x16/i.test(rel)), [
    'office tileset/office vx ace/b-c-d-e office 1 no shadows.png',
    'office tileset/office vx ace/b-c-d-e office 2 no shadows.png',
    'office tileset/office vx ace/b-c-d-e office 1.png',
    'office tileset/office vx ace/b-c-d-e office 2.png',
    'office tileset/office tileset all 16x16 no shadow.png',
  ]).slice(0, 32);

  const layoutDesigns = prioritize(sorted.filter((rel) => /office designs\/office level/i.test(rel)), [
    'office tileset/office designs/office level 2.png',
    'office tileset/office designs/office level 3.png',
  ]).slice(0, 16);

  return {
    sourceProfile: 'donarg-office-v1',
    tileAtlases,
    objectAtlases,
    propSprites: [...objectAtlases],
    characterSheets: [],
    layoutDesigns,
    featured: {
      floorSheet: tileAtlases.find((p) => /16x16 no shadow\.png$/i.test(p)) || tileAtlases[0] || null,
      wallSheet: tileAtlases.find((p) => /a4 office walls\.png$/i.test(p)) || tileAtlases[0] || null,
      objectSheet: objectAtlases.find((p) => /office 1 no shadows\.png$/i.test(p)) || objectAtlases[0] || null,
      mainCharacterSheet: null,
    },
  };
}

function categorizeLegacyImages(images) {
  const tileAtlases = [];
  const objectAtlases = [];
  const propSprites = [];
  const characterSheets = [];

  const tileRegex = /(walls?_interior|walls?_street|walls?_floor|ground|floor|interior|exterior|details|water|coast|bridges?|windows?_doors?|decorative_cracks|house_details|objects?\.png)/i;
  const objectAtlasRegex = /(interior_objects|objects?\.png|house_details|windows?_doors?|decorative_cracks|exterior|interior|trees_animation|ground_grass_details)/i;
  const charRegex = /with_shadow/i;
  const charActionRegex = /(idle|walk|run)_with_shadow/i;
  const propRegex = /(reader|guildmaster|mage|citizen|attacked|manequin|tree|rock|plant|mushroom|bridge|statue|shell|starfish|cave|crystal|fire|flag|books?|bookcase|desk|chair|table|computer|monitor|vending|fountain|sofa|couch|lamp|ruins|bush|fern|animal|boar|deer|hare|fox|slime|orc|vampire)/i;

  for (const rel of images) {
    const lower = rel.toLowerCase();
    const base = path.basename(lower);

    const looksLikeCharacter = charRegex.test(lower) && charActionRegex.test(base) && !lower.includes('/tiled_files/');
    if (looksLikeCharacter) {
      characterSheets.push(rel);
      continue;
    }

    if (tileRegex.test(base)) tileAtlases.push(rel);
    if (objectAtlasRegex.test(base)) objectAtlases.push(rel);
    if (propRegex.test(base) && !objectAtlasRegex.test(base)) propSprites.push(rel);
  }

  const prioritizedTileAtlases = prioritize(uniqueSorted(tileAtlases), [
    'walls_floor.png',
    'walls_interior.png',
    'walls_street.png',
    'interior_objects.png',
    'windows_doors.png',
    'interior.png',
    'exterior.png',
    'ground_grass_details.png',
    'house_details.png',
    'objects.png',
    'ground.png',
    'ground_rocks.png',
    'details.png',
    'water_coasts.png',
    'water_detilazation.png',
    'water_detilazation_v2.png',
    'bridges.png',
  ]).slice(0, 180);

  const prioritizedObjectAtlases = prioritize(uniqueSorted(objectAtlases), [
    'interior_objects.png',
    'windows_doors.png',
    'house_details.png',
    'interior.png',
    'exterior.png',
    'objects.png',
  ]).slice(0, 220);

  const prioritizedCharacterSheets = prioritize(uniqueSorted(characterSheets), [
    'unarmed_idle_with_shadow.png',
    'sword_idle_with_shadow.png',
    'vampires1_idle_with_shadow.png',
    'vampires2_idle_with_shadow.png',
    'vampires3_idle_with_shadow.png',
    'orc1_idle_with_shadow.png',
    'orc2_idle_with_shadow.png',
    'orc3_idle_with_shadow.png',
    'slime1_idle_with_shadow.png',
    'slime2_idle_with_shadow.png',
    'slime3_idle_with_shadow.png',
  ]).slice(0, 180);

  const prioritizedProps = prioritize(uniqueSorted(propSprites), [
    'reader1.png',
    'reader2.png',
    'guildmaster.png',
    'fire.png',
    'flags_animation.png',
  ]).slice(0, 700);

  return {
    sourceProfile: 'legacy-mixed-v1',
    tileAtlases: prioritizedTileAtlases,
    objectAtlases: prioritizedObjectAtlases,
    propSprites: prioritizedProps,
    characterSheets: prioritizedCharacterSheets,
    layoutDesigns: [],
    featured: {
      floorSheet: prioritizedTileAtlases.find((p) => /walls_floor\.png$/i.test(p)) || prioritizedTileAtlases[0] || null,
      wallSheet: prioritizedTileAtlases.find((p) => /walls_interior\.png$/i.test(p)) || prioritizedTileAtlases[0] || null,
      objectSheet: prioritizedObjectAtlases.find((p) => /interior_objects\.png$/i.test(p)) || prioritizedObjectAtlases[0] || null,
      mainCharacterSheet: prioritizedCharacterSheets.find((p) => /unarmed_idle_with_shadow\.png$/i.test(p)) || prioritizedCharacterSheets[0] || null,
    },
  };
}

function buildManifestAndCatalog(webviewDir, extractedDir, packs, sourceLabel) {
  const allFiles = walkFiles(extractedDir);
  const images = [];

  for (const filePath of allFiles) {
    if (!fs.existsSync(filePath)) continue;
    const rel = path.relative(webviewDir, filePath).replace(/\\/g, '/');
    if (!isRuntimeImage(rel)) continue;
    images.push(rel);
  }

  const imageList = uniqueSorted(images);
  const isDonarg = imageList.some((rel) => /office tileset/i.test(rel));
  const categories = isDonarg ? categorizeDonargImages(imageList) : categorizeLegacyImages(imageList);

  const signature = crypto
    .createHash('sha1')
    .update(JSON.stringify({
      imageCount: imageList.length,
      packs: packs.length,
      profile: categories.sourceProfile,
      tiles: categories.tileAtlases,
      objects: categories.objectAtlases,
    }))
    .digest('hex')
    .slice(0, 16);

  const manifest = {
    generated_at: new Date().toISOString(),
    source: sourceLabel || SOURCE_ZIP_NAMES[0],
    source_profile: categories.sourceProfile,
    packs,
    total_images: imageList.length,
    images: imageList,
  };

  const catalog = {
    generated_at: manifest.generated_at,
    source: manifest.source,
    source_profile: manifest.source_profile,
    bundle_signature: signature,
    packs,
    total_images: imageList.length,
    tile_size: 16,
    tileAtlases: categories.tileAtlases,
    objectAtlases: categories.objectAtlases,
    propSprites: categories.propSprites,
    characterSheets: categories.characterSheets,
    layoutDesigns: categories.layoutDesigns,
    featured: categories.featured,
  };

  const outDir = path.join(webviewDir, 'kd-asset-pack');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');

  return { manifest, catalog };
}

function collectNestedZipFiles(rootDir) {
  return walkFiles(rootDir)
    .filter((filePath) => path.extname(filePath).toLowerCase() === '.zip')
    .sort((a, b) => a.localeCompare(b));
}

function topLevelPackNames(extractedDir) {
  if (!fs.existsSync(extractedDir)) return [];
  return fs.readdirSync(extractedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const panelDir = __dirname;
  const workspaceDir = args.workspace ? path.resolve(String(args.workspace)) : null;
  const source = findSourceInput(panelDir, workspaceDir);

  if (!source || !source.sourcePath) {
    warn(`Source assets not found. Expected folder (${SOURCE_DIR_NAMES.join(', ')}) or zip (${SOURCE_ZIP_NAMES.join(', ')})`);
    process.exit(0);
  }

  const sourceLabel = source.type === 'dir'
    ? `${path.basename(source.sourcePath)} (folder)`
    : path.basename(source.sourcePath);
  log(`Using source ${source.type}: ${source.sourcePath}`);

  const webviewDir = path.join(panelDir, 'dist', 'webview');
  const packDir = path.join(webviewDir, 'kd-asset-pack');
  const extractedDir = path.join(packDir, 'extracted');

  // Full reset for deterministic rebuild.
  removeDir(path.join(webviewDir, 'assets'));
  removeDir(packDir);
  ensureDir(extractedDir);
  let packs = [];

  if (source.type === 'dir') {
    const folderName = path.basename(source.sourcePath);
    const outDir = path.join(extractedDir, folderName);
    copyTree(source.sourcePath, outDir);
    packs = [folderName];
  } else {
    const tmpDir = path.join(packDir, '__tmp');
    const tmpSource = path.join(tmpDir, 'source');
    ensureDir(tmpSource);
    runTarExtract(source.sourcePath, tmpSource);

    const nestedZips = collectNestedZipFiles(tmpSource);
    if (nestedZips.length > 0) {
      let extractedOk = 0;
      for (const zipPath of nestedZips) {
        const packName = path.basename(zipPath, path.extname(zipPath));
        const packOut = path.join(extractedDir, packName);
        ensureDir(packOut);
        try {
          runTarExtract(zipPath, packOut);
          extractedOk += 1;
        } catch (err) {
          warn(`Failed to extract nested zip ${path.basename(zipPath)}: ${err && err.message ? err.message : String(err)}`);
        }
      }
      packs = nestedZips.map((zipPath) => path.basename(zipPath));
      log(`Nested packs extracted: ${extractedOk}/${nestedZips.length}`);
    } else {
      copyTree(tmpSource, extractedDir);
      packs = topLevelPackNames(extractedDir);
      if (packs.length === 0) packs = [path.basename(source.sourcePath)];
    }
    removeDir(tmpDir);
  }

  cleanExtractedTree(extractedDir);

  const { manifest, catalog } = buildManifestAndCatalog(webviewDir, extractedDir, packs, sourceLabel);

  if (source.assembled) {
    fs.rmSync(source.sourcePath, { force: true });
  }

  log(
    `Asset rebuild complete: packs=${packs.length}, images=${manifest.total_images}, tiles=${catalog.tileAtlases.length}, props=${catalog.propSprites.length}, characters=${catalog.characterSheets.length}, profile=${catalog.source_profile}`
  );
}

try {
  main();
} catch (err) {
  process.stderr.write(`[KD][assets][error] ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}
