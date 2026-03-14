# KD Commands

Dokumen ini menyenaraikan semua `/kd-*` command mengikut flow rasmi sistem KD semasa.

## Prinsip Asas

- Semua project bermula secara rasmi dengan `/kd-analyze`
- User biasanya bercakap dengan `main agent`
- User boleh bercakap terus dengan sub-agent melalui `@Name`
- Semua `/kd-*` command wajib hasilkan:
  - transcript dialog agent
  - artifact bertulis dalam `KD_output/`
  - footer `Next command`, `XP updated`, `Learning bonus`, `Memory updated`, `Artifacts written`, `Agents consulted`
- Bahasa perbualan, planning, penerangan, dan dokumen ikut bahasa yang dipilih semasa install
- Code, code comments, identifiers, test names, dan API field names kekal English selagi user tidak minta bahasa lain

## Roster dan Interaksi

### `/kd`
Fungsi:
- Buka menu utama KD
- Tunjuk semua command yang tersedia
- Terangkan flow rasmi dari discovery hingga retrospective

### `/kd-help`
Fungsi:
- Cadangkan langkah seterusnya ikut state project semasa
- Sesuai bila user tidak pasti command apa patut guna selepas itu

### `/kd-status`
Fungsi:
- Paparkan status semasa project
- Tunjuk stage, progress, XP, artifact terbaru, dan next action

### `/kd-roster`
Fungsi:
- Tunjuk `main agent` dan semua sub-agent yang aktif untuk project semasa
- Paparkan role setiap agent
- Paparkan handle `@Name` yang sah untuk direct chat

### `/kd-kickoff`
Fungsi:
- Sambung semula project lama
- Load context daripada `status.md`, roster, memory, XP, dan transcript semasa

## Flow Utama

### 1. Discovery

#### `/kd-analyze`
Fungsi:
- Entry command rasmi untuk semua project
- Scan project semasa secara penuh
- Abaikan fail sistem KD seperti `.kracked/` dan `KD_output/`

Jika project kosong:
- Terangkan bahawa belum ada aplikasi sedia ada
- Sediakan landasan ke `/kd-brainstorm`

Jika project sudah ada code:
- Buat reverse-engineering penuh
- Terangkan struktur repo, frontend, backend, API, DB, auth, tests, infra, risks, dan tech debt
- Sertakan visual seperti ASCII wireframe dan Mermaid flow

Next command biasa:
- `/kd-brainstorm`

### 2. Requirement Discovery

#### `/kd-brainstorm`
Fungsi:
- Jalankan sesi soal-jawab mendalam dengan user
- Libatkan `main agent` dan sub-agent dalam bentuk dialog manusia/komik
- Tanya perkara penting seperti:
  - tujuan project
  - target user
  - frontend theme, style, colors, dan layout
  - pages dan screens utama
  - backend service boundary
  - API endpoints
  - stack pilihan
  - database dan environment strategy
  - auth
  - integrations
  - deployment
  - testing strategy
  - constraints dan risks

Output utama:
- product summary
- roundtable transcript
- frontend direction
- backend/API direction
- DB dan infra direction
- Mermaid workflow
- Mermaid architecture
- ASCII wireframe
- screen list
- endpoint draft
- data model draft

Next command biasa:
- `/kd-prd`

### 3. Product Definition

#### `/kd-prd`
Fungsi:
- Tukar hasil brainstorm kepada PRD formal
- Simpan dialog agent di awal sebelum dokumen final
- Hasilkan scope, KPIs, acceptance criteria, dependencies, risks, dan traceability

Next command biasa:
- `/kd-arch`

### 4. Architecture

#### `/kd-arch`
Fungsi:
- Jalankan architecture roundtable antara architect, backend-api, ui-ux-frontend, security, dan devops
- Hasilkan architecture decisions, API contracts, DB model, auth model, security plan, deployment topology, Mermaid diagrams, dan ASCII service map

Next command biasa:
- `/kd-story`

### 5. Story Breakdown

#### `/kd-story`
Fungsi:
- Pecahkan architecture kepada epics dan user stories
- Pisahkan UI stories dan backend stories bila perlu
- Susun acceptance criteria dan execution order

Next command biasa:
- `/kd-sprint-planning`

### 6. Sprint Planning

#### `/kd-sprint-planning`
Fungsi:
- Pilih stories untuk sprint
- Tetapkan priority, dependencies, owner, dan execution order

Next command biasa:
- `/kd-dev-story`

### 7. Delivery

#### `/kd-dev-story`
Fungsi:
- Implement satu story terpilih
- Gunakan flow TDD-first
- Kekalkan transcript agent dan artifact delivery untuk setiap task

Next command biasa:
- `/kd-test`

#### `/kd-test`
Fungsi:
- Nilai unit, integration, dan e2e coverage
- Kenal pasti test gaps dan failure penting

Next command biasa:
- `/kd-code-review`

#### `/kd-refactor`
Fungsi:
- Refactor code dengan pengawasan tech lead
- Kemaskan struktur code sebelum pusingan test seterusnya

Next command biasa:
- `/kd-test`

### 8. Quality Gate

#### `/kd-code-review`
Fungsi:
- Buat semakan quality, security, architecture fit, dan test coverage
- Libatkan QA, security, dan architect ikut keperluan

Next command biasa:
- `/kd-validate`

#### `/kd-validate`
Fungsi:
- Semak implementation lawan requirement dan acceptance criteria
- Pastikan output benar-benar memenuhi PRD

Next command biasa:
- `/kd-deploy`

### 9. Deployment dan Release

#### `/kd-deploy`
Fungsi:
- Hasilkan deployment plan
- Sertakan CI/CD, preflight checks, rollback plan, dan operational risks

Next command biasa:
- `/kd-release`

#### `/kd-release`
Fungsi:
- Tulis release notes
- Kemas kini changelog
- Tutup release cycle

Next command biasa:
- `/kd-sprint-review`
- atau `/kd-retrospective`

### 10. Sprint Closure

#### `/kd-sprint-review`
Fungsi:
- Review hasil sprint semasa
- Ringkaskan stories siap, demo highlights, dan baki kerja

Next command biasa:
- `/kd-retrospective`

#### `/kd-retrospective`
Fungsi:
- Jalankan retrospective roundtable
- Senaraikan apa yang menjadi, apa yang lemah, dan action items untuk sprint seterusnya

## Command Specialist

#### `/kd-api-design`
Fungsi:
- Fokus khas pada reka bentuk REST atau GraphQL API
- Sesuai bila user mahu dalami endpoint contracts, auth, payload, dan service boundary

#### `/kd-db-schema`
Fungsi:
- Fokus khas pada reka bentuk schema database
- Sesuai untuk relationships, indexing, migration, dan environment strategy

#### `/kd-security-audit`
Fungsi:
- Jalankan audit keselamatan penuh
- Semak risiko OWASP, dependency risk, secrets handling, dan hardening gaps

## Command Compatibility

#### `/kd-new`
Fungsi:
- Alias legacy kepada `/kd-analyze`
- Beritahu user bahawa flow rasmi kini bermula dengan `/kd-analyze`

#### `/kd-role-analyst`
Fungsi:
- Compatibility shim untuk flow lama
- Arahkan user guna `@<nama-analyst>` atau `/kd-roster`

## Flow Disyorkan

### Project Baru atau Repo Sedia Ada

1. `/kd`
2. `/kd-roster`
3. `/kd-analyze`
4. `/kd-brainstorm`
5. `/kd-prd`
6. `/kd-arch`
7. `/kd-story`
8. `/kd-sprint-planning`
9. `/kd-dev-story`
10. `/kd-test`
11. `/kd-code-review`
12. `/kd-validate`
13. `/kd-deploy`
14. `/kd-release`
15. `/kd-sprint-review`
16. `/kd-retrospective`

### Sambung Project Lama

1. `/kd-kickoff`
2. `/kd-status`
3. `/kd-help`
4. Sambung ikut stage semasa

## CLI Command Luar Chat

Ini ialah command terminal, bukan slash command dalam chat IDE.

#### `install`
Fungsi:
- Buka menu utama installer
- Menu utama:
  - `Install`
  - `Reinstall / Update`
  - `Uninstall`
  - `Info`

Bila pilih `Install`, akan keluar submenu:
- `Kracked Skills`
- `Pixel Panel`
- `Both`

#### `update`
Fungsi:
- Kemas kini installation KD sedia ada

#### `uninstall`
Fungsi:
- Buang KD dari project

#### `stats`
Fungsi:
- Paparkan XP, level, dan statistik main agent

#### `observe`
Fungsi:
- Buka observer mode dalam terminal

#### `observe-web`
Fungsi:
- Buka observer mode dalam browser

#### `help`
Fungsi:
- Tunjuk bantuan CLI

#### `version`
Fungsi:
- Paparkan versi KD
