/**
 * Menyiapkan daftar bunyi kana lalu memanggil Piper TTS untuk membuat berkas audionya.
 *
 * Jalankan: npm run build:audio
 *
 * Prasyarat sekali saja di mesin pengembang:
 *   pip install --user piper-tts pyopenjtalk-plus
 *
 * Hasilnya disimpan di public/audio/ dan ikut di-commit, sehingga aplikasi
 * memutar berkas audio biasa dan tidak bergantung pada mesin suara perangkat.
 */
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_KANA } from '../src/data/kana'
import { audioFileName, hasAudio } from '../src/audio/audioFiles'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'public/audio')
const MANIFEST = resolve(ROOT, 'node_modules/.tmp/audio-manifest.json')
const CACHE = resolve(ROOT, 'node_modules/.tmp/piper-voice')

interface Entry {
  /** Nama berkas tanpa ekstensi. */
  file: string
  /** Teks Jepang yang diucapkan. */
  text: string
}

/**
 * Satu berkas per bunyi, bukan per huruf: あ dan ア sama-sama dibaca "a",
 * begitu juga じ dan ぢ. Hiragana dipakai sebagai teks sumbernya.
 */
function collectEntries(): Entry[] {
  const byFile = new Map<string, Entry>()
  for (const kana of ALL_KANA) {
    if (kana.script !== 'hiragana' || !hasAudio(kana.romaji)) continue
    const file = audioFileName(kana.romaji)
    if (!byFile.has(file)) byFile.set(file, { file, text: kana.char })
  }
  return [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file))
}

async function main(): Promise<void> {
  const entries = collectEntries()
  await mkdir(dirname(MANIFEST), { recursive: true })
  await writeFile(MANIFEST, JSON.stringify(entries, null, 2), 'utf8')
  console.log(entries.length, 'bunyi kana disiapkan')

  const python = process.platform === 'win32' ? 'python' : 'python3'
  const result = spawnSync(python, [resolve(ROOT, 'scripts/synthesize_audio.py'), MANIFEST, OUT_DIR, CACHE], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    console.error('Pembuatan audio gagal. Pastikan Python beserta piper-tts dan pyopenjtalk-plus terpasang.')
    process.exit(result.status ?? 1)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
