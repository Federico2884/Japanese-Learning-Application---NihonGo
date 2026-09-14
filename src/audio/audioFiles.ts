/**
 * Pemetaan bunyi kana ke berkas audio di public/audio/.
 *
 * Satu berkas per bunyi, bukan per huruf: あ dan ア sama-sama "a", begitu juga
 * じ dan ぢ. Berkasnya dibuat oleh `npm run build:audio`.
 */

/** Romaji yang bukan bunyi tersendiri, jadi tidak punya berkas audio. */
const NO_AUDIO = new Set(['(konsonan ganda)', 'bunyi panjang'])

export function hasAudio(romaji: string): boolean {
  return !NO_AUDIO.has(romaji) && /^[a-z]+$/.test(romaji)
}

/** Nama berkas untuk sebuah bunyi, tanpa ekstensi. */
export function audioFileName(romaji: string): string {
  return romaji
}

/** Folder berkas audio, relatif terhadap base path aplikasi. */
export const AUDIO_DIR = 'audio/'
