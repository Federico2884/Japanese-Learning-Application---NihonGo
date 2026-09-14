# NihonGo

Aplikasi web (PWA) untuk belajar **hiragana** dan **katakana** dengan latihan menulis langsung di layar
menggunakan **stylus** (tablet Android, laptop Windows + pen) atau jari.

Setiap goresan dinilai urutan, arah, dan bentuknya terhadap data goresan resmi, jadi kamu tidak sekadar
menghafal bentuk huruf, tapi juga terbiasa menulisnya dengan benar.

## Fitur (rencana v1)

- Tabel kana lengkap (gojūon, dakuten/handakuten, huruf kecil, yōon) dengan penanda progres.
- Animasi urutan goresan tiap huruf + pelafalan (Web Speech API).
- Latihan menulis 3 tingkat: **jiplak**, **dengan petunjuk**, dan **dari ingatan**.
- Umpan balik per goresan: benar / arah terbalik / urutan salah / bentuk kurang tepat.
- Kuis (kana ke romaji, suara ke kana, romaji ke tulisan tangan) dengan pengulangan berjarak (Leitner).
- Jalan offline dan bisa di-install ke layar utama.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Untuk mencoba dari tablet/HP di jaringan WiFi yang sama:

```bash
npm run dev:host
```

Buka alamat `Network:` yang dicetak Vite (mis. `http://192.168.x.x:5173`) di tablet.
Di Windows, pastikan profil jaringan WiFi bertipe **Private** dan izinkan Node.js saat
Windows Firewall bertanya; profil **Public** memblokir koneksi dari perangkat lain.

> Hindari `npm run dev -- --host` di Windows PowerShell 5.1: argumen setelah `--`
> bisa hilang sehingga server hanya bisa diakses dari laptop sendiri.

## Skrip

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Jalankan server pengembangan |
| `npm run dev:host` | Server pengembangan yang bisa diakses dari perangkat lain di WiFi yang sama |
| `npm run build` | Cek tipe + build produksi ke `dist/` |
| `npm run preview` | Pratinjau hasil build |
| `npm test` | Jalankan unit test (Vitest) |

## Teknologi

Vite + React + TypeScript, React Router, Vitest.

## Lisensi & atribusi

Kode: MIT. Data urutan goresan berasal dari proyek [KanjiVG](https://kanjivg.tagaini.net/)
(Ulrich Apel, lisensi CC BY-SA 3.0) dan akan dicantumkan pada halaman "Tentang" di dalam aplikasi.
