---
name: 'kd-sync-memory'
description: 'Sync local project memory to global user memory'
---

# /kd-sync-memory — Salin Ilmu Tempatan ke Global

## Ejen: [RM] Rina + Amad
Baca definisi agen: `{project-root}/.kracked/agents/release-manager.md`

## Tujuan
Memory KD terbahagi kepada:
1. **Lokal Memory** (`.kracked/skills/memories/`): Spesifik untuk projek semasa.
2. **Global Memory** (`~/.kracked/global/`): Pengetahuan terkumpul merentasi semua projek.

Arahan ini membolehkan ejen menganalisis pembelajaran dari projek ini (seperti pattern yang berkesan, isu yang diselesaikan) dan menyimpannya di peringkat global supaya agen dalam projek lain boleh menggunakan pengetahuan tersebut.

## Arahan (Instructions)

### Langkah 1: Kumpul Konteks
1. Baca `{project-root}/KD_output/status/status.md`
2. Baca `{project-root}/.kracked/skills/memories/SKILL.md`
3. Baca `{project-root}/KD_output/release/release-notes.md` (jika ada)

### Langkah 2: Analisis Pembelajaran (Rina)
1. Kenal pasti 2-3 ilmu baru yang dipelajari dalam projek ini. (Contoh: cara setup DB spesifik, ralat yang selalu berlaku, snippet kod berguna).
2. Keluarkan maklumat privasi pengguna (PII, credentials, token).

### Langkah 3: Jana Entri Global (Amad)
Hasilkan fail format Markdown yang merangkumi:
- Topik (Contoh: "Setup NextJS dengan Supabase")
- Konteks & Penyelesaian
- Kod snippet (jika relevan)

Simpan (atau cadangkan pengguna untuk simpan) di ruang simpanan global, seperti dalam folder `C:\Users\Moon\.kracked\global\knowledge\`.

### Langkah 4: Kemas kini & XP
1. Tambah entri ke `status.md` menyatakan proses Sync Global telah dijalankan.
2. Beri +50 XP kepada ejen.
3. Tanya: "Proses sinkronisasi Global Memory selesai. Ada arahan seterusnya?"
