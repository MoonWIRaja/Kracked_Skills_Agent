---
name: "Game Dev Skill"
description: "Best practices for integrating game development frameworks and engines into projects"
---

# Game Dev Module — SKILL.md

## Tujuan
Modul Game Dev menyediakan panduan dan pattern untuk pembangunan permainan atau elemen gamifikasi dalam sebarang projek. Ini termasuk integrasi enjin 2D/3D, pengurusan aset, state management untuk gameplay, dan pengoptimuman prestasi.

## Kerangka Kerja Yang Disokong
- **Canvas 2D API** — Untuk permainan ringan / visualisasi piksel
- **Phaser 3** — Enjin permainan 2D yang matang
- **Three.js** — 3D rendering dalam pelayar
- **PixiJS** — Rendering 2D berprestasi tinggi
- **Godot (GDScript)** — Untuk pembangunan indie asli
- **Unity (C#)** — Untuk projek AAA / cross-platform

## Amalan Terbaik

### 1. Gelung Permainan (Game Loop)
```
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  
  update(deltaTime);  // Logik
  render();           // Lukisan
  
  requestAnimationFrame(gameLoop);
}
```
- Sentiasa gunakan `deltaTime` supaya permainan berjalan pada kelajuan yang sama di semua peranti.
- Pisahkan logik `update()` daripada `render()`.

### 2. Pengurusan Aset
- Muatkan semua aset secara asinkron sebelum permainan bermula (preloading).
- Gunakan sprite atlas/spritesheet untuk mengurangkan HTTP requests.
- Cache imej yang telah dimuat turun dalam `Map<string, HTMLImageElement>`.

### 3. State Management
- Gunakan pattern **Finite State Machine (FSM)** untuk watak dan UI.
- Contoh: `IDLE → WALK → ATTACK → HURT → DEAD`
- Pisahkan game state daripada UI state.

### 4. Fizik & Perlanggaran (Collision)
- Gunakan AABB (Axis-Aligned Bounding Box) untuk perlanggaran mudah.
- Gunakan grid-based collision untuk permainan tile-based.
- Elakkan pemeriksaan perlanggaran O(n²) — gunakan spatial hashing.

### 5. Input Handling
- Normalisasikan input (keyboard, gamepad, mobile touch).
- Gunakan input buffering untuk keresponsifan.
- Sokong rebinding kekunci.

### 6. Pengoptimuman Prestasi
- Gunakan `imageSmoothingEnabled = false` untuk seni piksel.
- Hadkan `requestAnimationFrame` kepada 60fps.
- Gunakan off-screen canvas untuk rendering yang kompleks.
- Gunakan object pooling untuk peluru/zarah.

## Contoh Integrasi dengan KD
```
/kd-dev-story

Story: "Bina sistem pertempuran turn-based"
Agent: [ENG] Ezra
Approach: TDD — tulis ujian untuk damage calculation dahulu,
           kemudian implementasi FSM untuk BattleState.
```
