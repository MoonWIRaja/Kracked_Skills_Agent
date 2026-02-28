---
name: "Creative Intelligence Skill"
description: "AI-assisted creative workflows for design, content, and innovation"
---

# Creative Intelligence Module — SKILL.md

## Tujuan
Modul Creative Intelligence (CI) membolehkan agen-agen KD membantu dalam tugasan kreatif yang melampaui pengekodan biasa. Ini termasuk penjanaan kandungan, reka bentuk UI/UX, penulisan kreatif, dan sumbang saran inovatif.

## Keupayaan

### 1. Penjanaan Kandungan
- **Copywriting**: Tajuk, deskripsi produk, CTA (Call to Action)
- **Dokumentasi**: Panduan pengguna, tutorial, README
- **Microcopy**: Mesej ralat, tooltip, placeholder
- **Terjemahan**: Konteks-sensitif (bukan word-by-word) — EN ↔ MS dan Custom

### 2. Bantuan Reka Bentuk
- **Color Palette Generator**: Berdasarkan mood atau brand
- **Typography Pairing**: Cadangan font yang sesuai
- **Layout Wireframing**: Cadangan susun atur berasaskan konvensyen UX
- **Accessibility Review**: Semakan kontras warna, saiz font, ARIA labels

### 3. Sumbang Saran (Brainstorming)
- **Idea Expansion**: Dari 1 idea asas → 5 variasi
- **Reverse Brainstorming**: "Apa yang boleh gagalkan ini?" → Cari penyelesaian
- **SCAMPER Method**: Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse
- **6 Thinking Hats**: Fakta, Emosi, Risiko, Manfaat, Kreativiti, Proses

### 4. Penulisan Kreatif
- **Persona Creation**: Nama, latar belakang, motivasi, pain points
- **Scenario Writing**: Situasi pengguna untuk ujian UX
- **Narrative Design**: Aliran cerita untuk aplikasi gamified

## Penggunaan dengan KD
```markdown
/kd-brainstorm --mode creative

Topik: "Bagaimana menjadikan onboarding lebih menarik?"

[Party Mode Aktif]

**[PM] Paan (HIGH):**
Gunakan progress bar gamified — tunjuk berapa % selesai

**[ENG] Ezra (MEDIUM):**
Tambah confetti animation setiap langkah selesai

**[ANA] Ara (HIGH):**
Data menunjukkan interactive tutorials 40% lebih berkesan daripada teks statik

⚡ Amad: Gabungkan ketiga-tiga — interactive tutorial + progress bar + micro-animations
```

## Amalan Terbaik
1. **Jangan guna AI sebagai pengganti kreativiti manusia** — gunakan sebagai pemangkin (catalyst).
2. **Sentiasa validate output AI dengan pengguna sebenar** — AI boleh hallucinate tentang trend reka bentuk.
3. **Simpan inspirasi dalam memories** — supaya agen belajar gaya/preference pengguna dari masa ke masa.
