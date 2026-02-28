---
name: "Validation Block Standard"
description: "Standard structural checkpoint to prevent AI hallucinations and errors"
---

# Validation Block Protocol

**Validation Block** adalah "speed bump" (bonggol kelajuan) paksa yang mesti digunakan sebelum memulakan sebarang perubahan besar. Ini untuk mengelakkan halusinasi AI, memastikan alignment dengan pengguna, dan menjamin kualiti.

## Bila Validation Block Diperlukan?
- Sebelum menulis kod yang kompleks/banyak fail.
- Selepas menjana PRD atau Architecture, sebelum fasa seterusnya.
- Sebelum sebarang perintah `rm -rf`, DROP DATABASE, atau operasi merbahaya.
- Apabila menukar tech stack yang telah dipersetujui.

## Format Standard

Apabila Validation Block dicetuskan, AI **MESTI BERHENTI** (do not execute further tools/code) dan tunjukkan notis ini kepada pengguna:

```markdown
> [!IMPORTANT]
> ## 🛑 VALIDATION BLOCK
> **Konteks:** [Apa yang akan dilakukan seterusnya]
> **Kepastian AI:** [CRITICAL / HIGH / MEDIUM / LOW]
> **Risiko yang Dikenal Pasti:**
> - Risiko 1
> - Risiko 2
> 
> **Pilihan Anda:**
> 1. [Y] Teruskan (looks good)
> 2. [M] Ubah suai (perlu penerangan tambahan)
> 3. [N] Batal / Cari pendekatan lain
```

## Tindakan AI
Selepas memaparkan Validation Block, AI mesti **menunggu input pengguna**. Jangan sekali-kali auto-execute tanpa mendapat jawapan `[Y]` atau arahan jelas daripada pengguna jika kepastian adalah MEDIUM atau LOW, atau jika tindakan tersebut berisiko.
