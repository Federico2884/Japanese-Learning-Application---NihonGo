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

Untuk mencoba dari tablet di jaringan WiFi yang sama:

```bash
npm run dev -- --host
```

## Skrip

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Jalankan server pengembangan |
| `npm run build` | Cek tipe + build produksi ke `dist/` |
| `npm run preview` | Pratinjau hasil build |
| `npm test` | Jalankan unit test (Vitest) |

## Teknologi

Vite + React + TypeScript, React Router, Vitest.

## Lisensi & atribusi

Kode: MIT. Data urutan goresan berasal dari proyek [KanjiVG](https://kanjivg.tagaini.net/)
(Ulrich Apel, lisensi CC BY-SA 3.0) dan akan dicantumkan pada halaman "Tentang" di dalam aplikasi.
