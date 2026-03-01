#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('node:child_process');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

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
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
  if (res.status !== 0) {
    const msg = (res.stderr || res.stdout || '').trim() || `exit code ${res.status}`;
    throw new Error(`tar extract failed: ${msg}`);
  }
}

function listZipParts(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((name) => /^Assets\.zip\.part\d+$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function assembleZipFromParts(partsDir, zipOutPath) {
  const parts = listZipParts(partsDir);
  if (parts.length === 0) return false;

  const buffers = [];
  for (const part of parts) {
    buffers.push(fs.readFileSync(path.join(partsDir, part)));
  }

  fs.writeFileSync(zipOutPath, Buffer.concat(buffers));
  return true;
}

function findSourceZip(panelDir, workspaceDir) {
  const candidates = [];

  if (workspaceDir) {
    candidates.push(path.join(workspaceDir, 'Assets.zip'));
  }

  candidates.push(path.join(panelDir, 'Assets.zip'));
  candidates.push(path.join(panelDir, 'asset-pack', 'Assets.zip'));
  candidates.push(path.join(panelDir, '..', '..', '..', 'Assets.zip'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { sourceZip: candidate, assembled: false };
    }
  }

  const assembledZipPath = path.join(panelDir, 'asset-pack', 'Assets.zip');
  if (assembleZipFromParts(path.join(panelDir, 'asset-pack'), assembledZipPath) && fs.existsSync(assembledZipPath)) {
    return { sourceZip: assembledZipPath, assembled: true };
  }

  return null;
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
    const nameLower = entry.name.toLowerCase();

    if (entry.isDirectory()) {
      if (nameLower === '__macosx') continue;
      walkFiles(fullPath, out);
      continue;
    }

    if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
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
  if (base.includes('coupon')) return false;
  if (base.includes('screenshot')) return false;
  if (base.includes('free assets craftpix')) return false;

  return true;
}

function uniqueSorted(items) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function prioritize(list, prioritizedNames) {
  const priorities = prioritizedNames.map((name) => name.toLowerCase());
  return [...list].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    const ai = priorities.findIndex((name) => aLower.endsWith(name));
    const bi = priorities.findIndex((name) => bLower.endsWith(name));

    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      if (ai !== bi) return ai - bi;
    }

    return aLower.localeCompare(bLower);
  });
}

function categorizeImages(images) {
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

    if (tileRegex.test(base)) {
      tileAtlases.push(rel);
    }

    if (objectAtlasRegex.test(base)) {
      objectAtlases.push(rel);
    }

    if (propRegex.test(base) && !objectAtlasRegex.test(base)) {
      propSprites.push(rel);
    }
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
    tileAtlases: prioritizedTileAtlases,
    objectAtlases: prioritizedObjectAtlases,
    propSprites: prioritizedProps,
    characterSheets: prioritizedCharacterSheets,
  };
}

function buildManifestAndCatalog(webviewDir, extractedDir, packs, sourceZipPath) {
  const allFiles = walkFiles(extractedDir);
  const images = [];

  for (const filePath of allFiles) {
    if (!fs.existsSync(filePath)) continue;
    const rel = path.relative(webviewDir, filePath).replace(/\\/g, '/');
    if (!isRuntimeImage(rel)) continue;
    images.push(rel);
  }

  const imageList = uniqueSorted(images);
  const categories = categorizeImages(imageList);

  const signature = crypto
    .createHash('sha1')
    .update(JSON.stringify({ imageCount: imageList.length, packs: packs.length, categories }, null, 0))
    .digest('hex')
    .slice(0, 16);

  const manifest = {
    generated_at: new Date().toISOString(),
    source: path.basename(sourceZipPath || 'Assets.zip'),
    packs,
    total_images: imageList.length,
    images: imageList,
  };

  const catalog = {
    generated_at: manifest.generated_at,
    source: manifest.source,
    bundle_signature: signature,
    packs,
    total_images: imageList.length,
    tileAtlases: categories.tileAtlases,
    objectAtlases: categories.objectAtlases,
    propSprites: categories.propSprites,
    characterSheets: categories.characterSheets,
    featured: {
      floorSheet: categories.tileAtlases.find((p) => /walls_floor\.png$/i.test(p)) || categories.tileAtlases[0] || null,
      wallSheet: categories.tileAtlases.find((p) => /walls_interior\.png$/i.test(p)) || categories.tileAtlases[0] || null,
      objectSheet: categories.objectAtlases.find((p) => /interior_objects\.png$/i.test(p)) || categories.objectAtlases[0] || null,
      mainCharacterSheet: categories.characterSheets.find((p) => /unarmed_idle_with_shadow\.png$/i.test(p)) || categories.characterSheets[0] || null,
    },
  };

  const outDir = path.join(webviewDir, 'kd-asset-pack');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');

  return { manifest, catalog };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const panelDir = __dirname;
  const workspaceDir = args.workspace ? path.resolve(String(args.workspace)) : null;
  const source = findSourceZip(panelDir, workspaceDir);

  if (!source || !source.sourceZip) {
    warn('Assets.zip not found. Skipping custom asset rebuild.');
    process.exit(0);
  }

  const sourceZip = source.sourceZip;
  log(`Using source zip: ${sourceZip}`);

  const webviewDir = path.join(panelDir, 'dist', 'webview');
  const packDir = path.join(webviewDir, 'kd-asset-pack');
  const nestedDir = path.join(packDir, 'nested-zips');
  const extractedDir = path.join(packDir, 'extracted');

  // Full reset of old bundled assets for deterministic rebuild.
  removeDir(path.join(webviewDir, 'assets'));
  removeDir(packDir);
  ensureDir(nestedDir);
  ensureDir(extractedDir);

  runTarExtract(sourceZip, nestedDir);

  const topAssetsDir = path.join(nestedDir, 'Assets');
  const scanDir = fs.existsSync(topAssetsDir) ? topAssetsDir : nestedDir;
  const nestedZips = fs.readdirSync(scanDir)
    .filter((name) => name.toLowerCase().endsWith('.zip'))
    .sort((a, b) => a.localeCompare(b));

  if (nestedZips.length === 0) {
    warn('No nested zip packs found after extraction.');
    process.exit(1);
  }

  let extractedOk = 0;
  for (const zipName of nestedZips) {
    const zipPath = path.join(scanDir, zipName);
    const packName = zipName.replace(/\.zip$/i, '');
    const packOut = path.join(extractedDir, packName);
    ensureDir(packOut);

    try {
      runTarExtract(zipPath, packOut);
      extractedOk += 1;
    } catch (err) {
      warn(`Failed to extract ${zipName}: ${err && err.message ? err.message : String(err)}`);
    }
  }

  cleanExtractedTree(extractedDir);
  removeDir(nestedDir);

  const { manifest, catalog } = buildManifestAndCatalog(webviewDir, extractedDir, nestedZips, sourceZip);

  if (source.assembled) {
    fs.rmSync(sourceZip, { force: true });
  }

  log(
    `Asset rebuild complete: packs=${extractedOk}/${nestedZips.length}, images=${manifest.total_images}, tiles=${catalog.tileAtlases.length}, props=${catalog.propSprites.length}, characters=${catalog.characterSheets.length}`
  );
}

try {
  main();
} catch (err) {
  process.stderr.write(`[KD][assets][error] ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}
