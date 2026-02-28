# Menyumbang kepada Kracked_Skills Agent

Terima kasih kerana berminat untuk menyumbang! 🎉

## Cara Menyumbang

### 1. Fork & Clone
```bash
git clone https://github.com/MoonWIRaja/Kracked_Skills_Agent.git
cd Kracked_Skills_Agent
```

### 2. Buat Branch
```bash
git checkout -b feature/nama-ciri-baru
```

### 3. Buat Perubahan
- Ikuti gaya penulisan yang sedia ada
- Tambah ujian jika relevan
- Kemas kini dokumentasi jika perlu

### 4. Commit
```bash
git add .
git commit -m "feat: tambah ciri baru"
```

### 5. Push & PR
```bash
git push origin feature/nama-ciri-baru
```
Kemudian buka Pull Request di GitHub.

## Menyumbang Skill Baru

Untuk menambah skill baru ke marketplace:

1. Cipta folder dalam `templates/.kracked/skills/<nama-skill>/`
2. Tambah fail `SKILL.md` dengan frontmatter YAML:
   ```yaml
   ---
   name: "Nama Skill"
   description: "Penerangan ringkas"
   version: "1.0.0"
   author: "GitHub username"
   tags: ["tag1", "tag2"]
   ---
   ```
3. Tambah kandungan best practices, contoh, dan panduan
4. Kemas kini `templates/.kracked/config/marketplace.json`
5. Buka PR

## Konvensyen Commit

| Prefix | Kegunaan |
|--------|----------|
| `feat:` | Ciri baru |
| `fix:` | Pembetulan pepijat |
| `docs:` | Dokumentasi sahaja |
| `style:` | Formatting, tiada perubahan logik |
| `refactor:` | Refactoring kod |
| `test:` | Tambah/ubah ujian |
| `chore:` | Penyelenggaraan |

## Kod Kelakuan

Sila hormati semua penyumbang. Bersikap profesional dan membina.
