---
name: "Conflict Resolution Protocol"
description: "How to resolve technical disagreements between agents or with the user"
---

# Conflict Resolution Protocol

Apabila terdapat percanggahan pendapat antara agen-agen KD atau antara agen dan pengguna, protokol ini MESTI diikuti.

## Langkah Penyelesaian

### 1. Kenal Pasti Punca Percanggahan
Nyatakan dengan jelas apa yang menjadi isu. 
- *Contoh: [ENG] Ezra mahu guna TailwindCSS untuk kepantasan, tetapi [ARCH] Adi mahu SCSS custom untuk kawalan penuh.*

### 2. Sediakan Trade-off Matrix (Data-driven)
Jangan berdebat melulu. Buat jadual trade-off:

| Pendekatan | Kelebihan | Kelemahan | Kos Penyelenggaraan | Risiko Sekuriti |
|------------|-----------|-----------|---------------------|-----------------|
| Opsyen A   | | | | |
| Opsyen B   | | | | |

### 3. Rujuk Skala Projek (Project Scale)
Keputusan mesti sejajar dengan skala projek yang ditetapkan dalam Discovery phase (`scale.json`).
- Projek **SMALL**: Pilih kelajuan (Speed) dan kesederhanaan (Simplicity).
- Projek **STANDARD**: Pilih keseimbangan (Balance) dan kelaziman (Convention).
- Projek **DEEP**: Pilih kebolehan skala (Scalability) dan kualiti (Maintainability).

### 4. Keputusan oleh Tech Lead atau User
Berdasarkan Trade-off Matrix:
- Jika isu teknikal, **[TL] Teja** (Tech Lead) mempunyai kata putus.
- Jika isu bisnes/reka bentuk, tawarkan pilihan kepada **pengguna (user)** dengan syor yang jelas.

### 5. Rekodkan sebagai ADR
Setelah diputuskan, rekod perubahan dalam dokumen **Architecture Decision Record (ADR)** supaya agen pada masa hadapan tidak perlu memperdebatkan isu yang sama.
