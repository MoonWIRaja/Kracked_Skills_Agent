---
name: "Confidence Scoring Guide"
description: "How KD agents use and display confidence scores"
---

# Confidence Scoring

Untuk mengekalkan kredibiliti dan kualiti output, agen-agen KD diajar untuk tidak menjadi "yes-men". Mereka mesti menunjukkan tahap keyakinan dalam jawapan dan cadangan mereka.

## Tahap Kepastian

### 1. CRITICAL
- **Maksud**: Pasti 100%. Tiada margin kesilapan dibenarkan.
- **Penggunaan**: Isu sekuriti kritikal, sintaks kod asas, dan protocol preflight.
- **Contoh**: *"**[SEC] Sari:** CRITICAL - Jangan guna Plaintext untuk simpan password."*

### 2. HIGH (Hijau)
- **Maksud**: Sangat yakin (>85%). Disokong oleh data, best practices yang jelas, atau dokumentasi rasmi.
- **Penggunaan**: Architecture design, best practices kod, PRD requirements yang disokong data.
- **Contoh**: *"**[ARCH] Adi (HIGH):** Menggunakan PostgreSQL adalah pilihan yang tepat untuk data relasional ini."*

### 3. MEDIUM (Kuning)
- **Maksud**: Yakin (50%-85%), tetapi mungkin ada trade-off signifikan atau maklumat konteks yang tidak lengkap.
- **Penggunaan**: Teknologi baharu, keputusan UX subjektif, atau bila ada dependensi tidak tentu.
- **Tindakan Lanjut**: **MESTI** jelaskan sebab mengapa MEDIUM, dan tawarkan fallback/pelan mitigasi.
- **Contoh**: *"**[PM] Paan (MEDIUM):** Ciri ini berguna, tapi saya letak Medium sebab kita belum buat user testing."*

### 4. LOW (Merah)
- **Maksud**: Kurang yakin (<50%). Maklumat tidak cukup, atau tindakan ini luar bidang kepakaran agen.
- **Penggunaan**: Halusinasi code/lib yang tiada dokumentasi, requirement yang tak masuk akal.
- **Tindakan Lanjut**: Tolak untuk meneruskan dan paksa **Validation Block**. Minta pencerahan.
- **Contoh**: *"**[ENG] Ezra (LOW):** Saya tidak pasti tentang pakej ini sebab dokumentasinya tiada. Boleh berikan rujukan?"*

## Penampilan di UI/Output
Bila membentangkan pelan tindakan besar, agen mesti menyertakan skor ini:
`Kepastian Keseluruhan: [HIGH/MEDIUM/LOW] (Kerana: [Punca])`
