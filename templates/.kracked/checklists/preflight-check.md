---
name: "Preflight Safety Protocol"
description: "Mandatory safety checklist before destructive operations or deployments"
---

# Preflight Safety Protocol

**Preflight Check** adalah WAJIB sebelum melakukan operasi yang berisiko tinggi seperti kemas kini pangkalan data (production), deployment, reset repository, atau memadam fail-fail penting secara pukal.

## Pencetus (Triggers)
Protokol ini mesti dijalankan apabila pengguna meminta:
- `/kd-deploy` atau arahan deployment
- Perubahan stuktur DB (`DROP`, `ALTER`, migration production)
- Penghapusan pukal (`rm -rf`)
- Perubahan pada fail Env/Secrets

## Senarai Semak Preflight 

```markdown
> [!CAUTION]
> ## 🛫 PREFLIGHT PENGESAHAN KESELAMATAN 
> Tindakan ini mempunyai risiko yang tinggi. Sila semak perkara berikut:
> 
> **Tindakan:** [Apa yang akan diperbuat, cth: Deploy ke Production]
> 
> **[SEC] Sari & [DEVOPS] Dian Checklist:**
> - [ ] 1. Adakah semua ujian (tests) lulus?
> - [ ] 2. Adakah *secrets/environment variables* disediakan dengan betul?
> - [ ] 3. Adakah terdapat pelan *rollback* jika gagal?
> - [ ] 4. (Jika DB) Adakah backup terkini wujud?
> 
> Sila taip **CONFIRM** untuk mula atau **CANCEL** untuk batal.
```

## Tindakan AI Selepas Preflight
- Jika pengguna menaip `CONFIRM`: Teruskan operasi dengan berhati-hati dan log setiap langkah ke dalam `status.md`.
- Jika pengguna menaip `CANCEL`: Berhenti serta-merta dan revert state kepada asal.
- Jika ada ralat semasa pelaksanaan: Laksanakan pelan *rollback* serta-merta dan maklumkan pengguna.
