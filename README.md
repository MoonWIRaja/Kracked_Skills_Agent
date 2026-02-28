# Kracked_Skills Agent (KD)

> 🤖 Sistem AI Multi-Agent untuk Pembangunan Perisian  
> *Oleh MoonWIRaja — Dibina dengan ❤️ di Malaysia*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Go](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://golang.org)

---

## 🚀 Pengenalan

**Kracked_Skills Agent (KD)** ialah sistem AI multi-agen yang mentransformasikan cara anda membangunkan perisian. Bayangkan sebuah pasukan 9 ejen AI pakar bekerja bersama — menganalisis, mereka bentuk, mengekod, menguji, dan melepaskan aplikasi anda.

### ✨ Ciri-ciri Utama
- 🤖 **9 Ejen AI Pakar** — Setiap satu mempunyai peranan, kemahiran, dan personaliti tersendiri
- 🎉 **Party Mode** — 2-5 ejen berkolaborasi serentak untuk isu kompleks
- 🛡️ **Preflight Safety** — Senarai semak keselamatan wajib sebelum deployment
- 🧠 **Memory System** — Ilmu terkumpul merentasi projek (lokal + global)
- 🎮 **Pixel Observer** — Tonton ejen bekerja di pejabat maya 2D!
- 📊 **XP & Leveling** — Sistem gamifikasi untuk pencapaian
- 🌐 **6 IDE Adapter** — Codex, Antigravity, Cursor, OpenCode, Kilo Code, Cline

---

## 📦 Pemasangan

### Kaedah 1: npm (Disyorkan)
```bash
npx kracked-skills-agent install
```

### Kaedah 2: Terus dari GitHub
```bash
npx github:MoonWIRaja/Kracked_Skills_Agent install
```

### Opsyen CLI
```bash
npx kracked-skills-agent install --directory ./my-project --language MS --tools codex,cursor --yes
```

| Flag | Penerangan |
|------|------------|
| `--directory, -d` | Direktori sasaran |
| `--language, -l` | Bahasa (EN, MS, atau custom) |
| `--tools, -t` | IDE tools (codex, antigravity, cursor, opencode, kilocode, cline) |
| `--yes, -y` | Mod bukan interaktif |
| `--name, -n` | Nama projek |

---

## 🤖 Pasukan Ejen

| Agen | Nama | Peranan | Kepakaran |
|------|------|---------|-----------|
| 🧠 Master | **Amad** | Orchestrator | Delegasi tugas, koordinasi |
| 🔍 Analyst | **Ara** | Penyelidik | Discovery, penyelidikan, penilaian risiko |
| 📋 PM | **Paan** | Pengurus Produk | PRD, user stories, kriteria penerimaan |
| 🏗️ Architect | **Adi** | Arkitek | System design, tech stack, ADR |
| 🎯 Tech Lead | **Teja** | Ketua Teknikal | Epic decomposition, sprint planning |
| 💻 Engineer | **Ezra** | Jurutera | TDD, implementation, clean code |
| ✅ QA | **Qila** | Jaminan Kualiti | Code review, test coverage |
| 🛡️ Security | **Sari** | Pakar Keselamatan | OWASP, security audit |
| 🚀 DevOps | **Dian** | Jurutera DevOps | CI/CD, deployment, preflight |
| 📦 Release | **Rina** | Pengurus Pelepasan | Release notes, changelog |

---

## 📋 Arahan KD (Commands)

| Arahan | Keterangan |
|--------|------------|
| `/kd` | Menu utama |
| `/kd-analyze` | Fasa discovery + penilaian skala |
| `/kd-brainstorm` | Sumbang saran dengan Party Mode |
| `/kd-prd` | Hasilkan PRD |
| `/kd-arch` | Reka bentuk arkitektur |
| `/kd-story` | Pecahkan epik kepada stories |
| `/kd-dev-story` | Implement story (TDD) |
| `/kd-code-review` | Semakan kod (QA + Security) |
| `/kd-deploy` | Deploy dengan preflight check |
| `/kd-release` | Release notes & changelog |
| `/kd-status` | Tunjukkan status projek |
| `/kd-help` | Bantuan pintar |
| `/kd-sync-memory` | Simpan ilmu ke Global Memory |

---

## 🏗️ Struktur Projek

```
Kracked_Skills_Agent/
├── bin/                    # CLI entry points
│   ├── cli.js              # Main CLI
│   └── args.js             # Argument parser
├── src/                    # Core modules
│   ├── installer.js        # Install logic
│   ├── adapters.js         # 6 IDE adapter generator
│   ├── display.js          # TUI utilities
│   ├── help.js             # Help display
│   ├── stats.js            # XP stats
│   ├── updater.js          # Update handler
│   └── uninstaller.js      # Uninstall handler
├── backend/                # Go backend engine
│   ├── go.mod
│   └── main.go             # Gin + SQLite server
├── frontend/               # Next.js web UI
│   ├── src/app/            # Pages & layout
│   ├── src/components/     # React components
│   └── src/lib/pixel/      # 2D engine
├── templates/.kracked/     # Agent system (installed to projects)
│   ├── prompts/            # System prompt + multi-agent protocols
│   ├── agents/             # 9 agent definitions
│   ├── workflows/          # 25 command workflows
│   ├── skills/             # 11 SKILL.md files
│   ├── templates/          # Document templates
│   ├── gates/              # Validation blocks
│   ├── checklists/         # Preflight protocols
│   └── config/             # Language + marketplace
├── scripts/                # Utility scripts
└── status/                 # Project tracking
```

---

## 🖥️ Platform Web (Backend + Frontend)

### Jalankan Backend
```bash
cd backend
go mod tidy
go run main.go    # → http://localhost:8080
```

### Jalankan Frontend
```bash
cd frontend
npm install
npm run dev       # → http://localhost:3000
```

---

## 🤝 Menyumbang (Contributing)

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan penyumbangan.

## 📄 Lesen

MIT License — Lihat [LICENSE](LICENSE) untuk butiran.
